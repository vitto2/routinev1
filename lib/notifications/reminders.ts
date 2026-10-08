import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, type PushPayload, type StoredSubscription } from "@/lib/push";
import { activeScheduleOn, isQuotaOn, isScheduledOn } from "@/lib/scheduling";
import { addDaysISO, weekRangeOf, weekdayOf } from "@/lib/dates";
import {
  DIGEST_HOURS,
  EVENING_HOURS,
  inWindow,
  isHabitReminderDue,
  isTaskReminderDue,
  localMoment,
  plural,
} from "@/lib/notifications/schedule";
import type { HabitSchedule } from "@/types/domain";

export interface ReminderSummary {
  users: number;
  digests: number;
  evenings: number;
  taskReminders: number;
  habitReminders: number;
  reviews: number;
  removedSubscriptions: number;
}

interface ReminderHabit {
  id: string;
  user_id: string;
  name: string;
  reminder_time: string;
  last_reminded_date: string | null;
  habit_schedules: HabitSchedule[];
}

/**
 * Chamado periodicamente (a cada ~5 min) pelo pg_cron do Supabase.
 * Para cada usuário com dispositivo inscrito, no fuso dele:
 *  - resumo da manhã (1x/dia, a partir das 09h);
 *  - lembrete da noite se ainda houver tarefas pendentes (1x/dia, a partir das 18h);
 *  - aviso de tarefa com horário (15 min antes), 1x por tarefa;
 *  - lembrete por hábito no horário escolhido (1x/dia, só se ainda não foi feito);
 *  - convite para a revisão semanal no domingo à noite (1x por semana).
 * Recursos da migration 0004 são opcionais: se as colunas não existem, são ignorados.
 */
export async function runReminders(now = new Date()): Promise<ReminderSummary> {
  const db = createAdminClient();
  const summary: ReminderSummary = {
    users: 0,
    digests: 0,
    evenings: 0,
    taskReminders: 0,
    habitReminders: 0,
    reviews: 0,
    removedSubscriptions: 0,
  };

  const { data: subs, error: subsError } = await db
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (subsError) throw new Error(subsError.message);

  const subsByUser = new Map<string, StoredSubscription[]>();
  for (const sub of subs ?? []) {
    subsByUser.set(sub.user_id, [...(subsByUser.get(sub.user_id) ?? []), sub]);
  }
  const userIds = [...subsByUser.keys()];
  summary.users = userIds.length;
  if (userIds.length === 0) return summary;

  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, timezone, last_digest_date, last_evening_date")
    .in("id", userIds);
  if (profilesError) throw new Error(profilesError.message);

  // Janela ampla em UTC; o filtro fino por dia local é feito por usuário.
  const windowStart = addDaysISO(now.toISOString().slice(0, 10), -2);
  const windowEnd = addDaysISO(now.toISOString().slice(0, 10), 2);

  const { data: timedTasks } = await db
    .from("tasks")
    .select("id, user_id, title, due_date, due_time")
    .in("user_id", userIds)
    .eq("completed", false)
    .is("reminded_at", null)
    .not("due_time", "is", null)
    .gte("due_date", windowStart)
    .lte("due_date", windowEnd);

  // --- recursos da migration 0004 (tolerantes à ausência das colunas) ---
  const { data: reminderRows, error: reminderError } = await db
    .from("habits")
    .select("id, user_id, name, reminder_time, last_reminded_date, habit_schedules(*)")
    .in("user_id", userIds)
    .eq("active", true)
    .not("reminder_time", "is", null);
  const habitReminders = reminderError
    ? []
    : ((reminderRows ?? []) as unknown as ReminderHabit[]);

  const { data: reviewRows, error: reviewError } = await db
    .from("profiles")
    .select("id, last_review_date")
    .in("id", userIds);
  const reviewDates = new Map<string, string | null>(
    reviewError ? [] : (reviewRows ?? []).map((r) => [r.id, r.last_review_date]),
  );

  async function deliver(userId: string, payload: PushPayload) {
    let delivered = false;
    for (const sub of subsByUser.get(userId) ?? []) {
      const result = await sendPush(sub, payload);
      if (result === "ok") delivered = true;
      if (result === "gone") {
        await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        summary.removedSubscriptions += 1;
        // Aparelho expirado: não insiste nas próximas notificações desta execução.
        subsByUser.set(
          userId,
          (subsByUser.get(userId) ?? []).filter((s) => s.endpoint !== sub.endpoint),
        );
      }
    }
    return delivered;
  }

  for (const profile of profiles ?? []) {
    const moment = localMoment(now, profile.timezone);

    // Lembretes de tarefas com horário
    for (const task of (timedTasks ?? []).filter((t) => t.user_id === profile.id)) {
      if (!task.due_time || !isTaskReminderDue({ due_date: task.due_date, due_time: task.due_time }, moment)) {
        continue;
      }
      const delivered = await deliver(profile.id, {
        title: `Daqui a pouco: ${task.title}`,
        body: `Hoje às ${task.due_time.slice(0, 5)}`,
        url: "/today",
        tag: `task-${task.id}`,
      });
      // Marca mesmo sem entrega bem-sucedida para não repetir a cada execução.
      await db.from("tasks").update({ reminded_at: now.toISOString() }).eq("id", task.id);
      if (delivered) summary.taskReminders += 1;
    }

    // Lembretes por hábito
    const dueHabits = habitReminders.filter(
      (h) =>
        h.user_id === profile.id &&
        h.last_reminded_date !== moment.date &&
        isHabitReminderDue(h.reminder_time, moment) &&
        isScheduledOn(h.habit_schedules, moment.date),
    );

    if (dueHabits.length > 0) {
      const ids = dueHabits.map((h) => h.id);
      const week = weekRangeOf(moment.date);

      const { data: doneToday } = await db
        .from("habit_logs")
        .select("habit_id")
        .in("habit_id", ids)
        .eq("log_date", moment.date)
        .eq("completed", true);
      const doneSet = new Set((doneToday ?? []).map((l) => l.habit_id));

      const { data: doneWeek } = await db
        .from("habit_logs")
        .select("habit_id")
        .in("habit_id", ids)
        .gte("log_date", week.start)
        .lte("log_date", moment.date)
        .eq("completed", true);
      const weekCount = new Map<string, number>();
      for (const log of doneWeek ?? []) {
        weekCount.set(log.habit_id, (weekCount.get(log.habit_id) ?? 0) + 1);
      }

      for (const habit of dueHabits) {
        const quotaTarget = isQuotaOn(habit.habit_schedules, moment.date)
          ? (activeScheduleOn(habit.habit_schedules, moment.date)?.frequency_target ?? 0)
          : 0;
        const alreadyDone =
          doneSet.has(habit.id) || (quotaTarget > 0 && (weekCount.get(habit.id) ?? 0) >= quotaTarget);

        if (!alreadyDone) {
          const delivered = await deliver(profile.id, {
            title: `Hora de: ${habit.name}`,
            body: "Toque para abrir e marcar como feito.",
            url: "/today",
            tag: `habit-${habit.id}`,
          });
          if (delivered) summary.habitReminders += 1;
        }
        // Marca em qualquer caso: evita reavaliar a cada execução do cron dentro da janela.
        await db.from("habits").update({ last_reminded_date: moment.date }).eq("id", habit.id);
      }
    }

    // Revisão semanal: domingo à noite, uma vez por semana
    if (
      reviewDates.has(profile.id) &&
      weekdayOf(moment.date) === 0 &&
      inWindow(moment.hour, EVENING_HOURS) &&
      reviewDates.get(profile.id) !== moment.date
    ) {
      const { count } = await db
        .from("habits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("active", true);

      if ((count ?? 0) > 0) {
        const delivered = await deliver(profile.id, {
          title: "Sua semana está pronta",
          body: "Veja como foi e o que vale ajustar na próxima.",
          url: "/review",
          tag: "routine-review",
        });
        if (delivered) summary.reviews += 1;
      }
      await db.from("profiles").update({ last_review_date: moment.date }).eq("id", profile.id);
    }

    const wantsDigest =
      inWindow(moment.hour, DIGEST_HOURS) && profile.last_digest_date !== moment.date;
    const wantsEvening =
      inWindow(moment.hour, EVENING_HOURS) && profile.last_evening_date !== moment.date;
    if (!wantsDigest && !wantsEvening) continue;

    const [{ data: tasks }, { data: overdue }] = await Promise.all([
      db
        .from("tasks")
        .select("id, completed")
        .eq("user_id", profile.id)
        .eq("due_date", moment.date),
      db
        .from("tasks")
        .select("id")
        .eq("user_id", profile.id)
        .eq("completed", false)
        .lt("due_date", moment.date),
    ]);

    const pendingTasks = (tasks ?? []).filter((t) => !t.completed).length;
    const overdueCount = (overdue ?? []).length;

    if (wantsDigest) {
      const { data: habits } = await db
        .from("habits")
        .select("id, habit_schedules(*)")
        .eq("user_id", profile.id)
        .eq("active", true);

      const { data: doneLogs } = await db
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", profile.id)
        .eq("log_date", moment.date)
        .eq("completed", true);
      const done = new Set((doneLogs ?? []).map((l) => l.habit_id));

      const pendingHabits = ((habits ?? []) as unknown as { id: string; habit_schedules: HabitSchedule[] }[]).filter(
        (h) => isScheduledOn(h.habit_schedules, moment.date) && !done.has(h.id),
      ).length;

      const parts = [
        pendingHabits > 0 ? plural(pendingHabits, "hábito", "hábitos") : null,
        pendingTasks > 0 ? plural(pendingTasks, "tarefa", "tarefas") : null,
      ].filter(Boolean);

      if (parts.length > 0 || overdueCount > 0) {
        const body = [
          parts.length > 0 ? `Hoje: ${parts.join(" e ")}.` : null,
          overdueCount > 0 ? `${plural(overdueCount, "tarefa atrasada", "tarefas atrasadas")}.` : null,
        ]
          .filter(Boolean)
          .join(" ");

        if (await deliver(profile.id, { title: "Seu dia no Routine", body, url: "/today", tag: "routine-digest" })) {
          summary.digests += 1;
        }
      }
      await db.from("profiles").update({ last_digest_date: moment.date }).eq("id", profile.id);
    }

    if (wantsEvening) {
      const remaining = pendingTasks + overdueCount;
      if (remaining > 0) {
        const body = `Ainda ${remaining === 1 ? "falta" : "faltam"} ${plural(remaining, "tarefa pendente", "tarefas pendentes")}.`;
        if (await deliver(profile.id, { title: "Não esqueça de hoje", body, url: "/today", tag: "routine-evening" })) {
          summary.evenings += 1;
        }
      }
      await db.from("profiles").update({ last_evening_date: moment.date }).eq("id", profile.id);
    }
  }

  return summary;
}
