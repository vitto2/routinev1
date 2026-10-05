import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, type PushPayload, type StoredSubscription } from "@/lib/push";
import { isScheduledOn } from "@/lib/scheduling";
import { addDaysISO } from "@/lib/dates";
import {
  DIGEST_HOURS,
  EVENING_HOURS,
  inWindow,
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
  removedSubscriptions: number;
}

/**
 * Chamado periodicamente (a cada ~5 min) pelo pg_cron do Supabase.
 * Para cada usuário com dispositivo inscrito, no fuso dele:
 *  - resumo da manhã (1x/dia, a partir das 09h);
 *  - lembrete da noite se ainda houver tarefas pendentes (1x/dia, a partir das 18h);
 *  - aviso de tarefa com horário (15 min antes), 1x por tarefa.
 */
export async function runReminders(now = new Date()): Promise<ReminderSummary> {
  const db = createAdminClient();
  const summary: ReminderSummary = {
    users: 0,
    digests: 0,
    evenings: 0,
    taskReminders: 0,
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

  async function deliver(userId: string, payload: PushPayload) {
    let delivered = false;
    for (const sub of subsByUser.get(userId) ?? []) {
      const result = await sendPush(sub, payload);
      if (result === "ok") delivered = true;
      if (result === "gone") {
        await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        summary.removedSubscriptions += 1;
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
