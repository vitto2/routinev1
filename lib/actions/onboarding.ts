"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { isValidTimezone, todayISO } from "@/lib/dates";
import { HABIT_TEMPLATES_BY_KEY, LIFE_AREAS } from "@/lib/constants/onboarding";

const inputSchema = z.object({
  areas: z.array(z.string()).max(LIFE_AREAS.length),
  habits: z.array(z.string()).max(40),
  timezone: z.string().max(64).optional(),
});

export async function completeOnboarding(input: z.input<typeof inputSchema>) {
  const { supabase, user } = await requireUser();
  const data = inputSchema.parse(input);
  const profile = await getOrCreateProfile(supabase, user.id);

  if (profile.onboarded_at) return; // idempotente: nunca duplica pilares/hábitos

  const timezone =
    data.timezone && isValidTimezone(data.timezone) ? data.timezone : profile.timezone;
  const today = todayISO(timezone);

  // Só templates conhecidos: o cliente envia chaves, nunca o conteúdo do hábito.
  const chosen = data.habits
    .map((key) => HABIT_TEMPLATES_BY_KEY[key])
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const areaIds = new Set([
    ...data.areas.filter((id) => LIFE_AREAS.some((a) => a.id === id)),
    ...chosen.map((entry) => entry.area.id),
  ]);
  const areas = LIFE_AREAS.filter((a) => areaIds.has(a.id));

  const pillarIdByArea = new Map<string, string>();

  if (areas.length > 0) {
    const { data: existing } = await supabase
      .from("pillars")
      .select("id, name")
      .eq("archived", false);

    const existingByName = new Map((existing ?? []).map((p) => [p.name, p.id]));
    const toCreate = areas.filter((a) => !existingByName.has(a.name));

    for (const area of areas) {
      const id = existingByName.get(area.name);
      if (id) pillarIdByArea.set(area.id, id);
    }

    if (toCreate.length > 0) {
      const { data: created, error } = await supabase
        .from("pillars")
        .insert(
          toCreate.map((area, index) => ({
            user_id: user.id,
            name: area.name,
            icon: area.icon,
            color: area.color,
            description: area.tagline,
            sort_order: index,
          })),
        )
        .select("id, name");

      if (error) throw new Error(error.message);
      for (const pillar of created ?? []) {
        const area = toCreate.find((a) => a.name === pillar.name);
        if (area) pillarIdByArea.set(area.id, pillar.id);
      }
    }
  }

  if (chosen.length > 0) {
    const { data: habits, error } = await supabase
      .from("habits")
      .insert(
        chosen.map(({ area, template }, index) => ({
          user_id: user.id,
          pillar_id: pillarIdByArea.get(area.id) ?? null,
          name: template.name,
          habit_type: template.habit_type,
          tracking_type: template.tracking_type,
          target_value: template.target_value ?? null,
          target_unit:
            template.tracking_type === "quantity"
              ? "ml"
              : template.tracking_type === "time"
                ? "min"
                : null,
          sort_order: index,
        })),
      )
      .select("id, name");

    if (error) throw new Error(error.message);

    const schedules = chosen.flatMap(({ template }) => {
      const habit = (habits ?? []).find((h) => h.name === template.name);
      if (!habit) return [];
      const s = template.schedule;
      return [
        {
          habit_id: habit.id,
          start_date: today,
          schedule_type: s.schedule_type,
          weekdays: "weekdays" in s ? s.weekdays : null,
          frequency_target: "frequency_target" in s ? s.frequency_target : null,
          interval_days: "interval_days" in s ? s.interval_days : null,
          specific_date: "specific_date" in s ? s.specific_date : null,
        },
      ];
    });

    const { error: scheduleError } = await supabase
      .from("habit_schedules")
      .insert(schedules);
    if (scheduleError) throw new Error(scheduleError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString(), timezone })
    .eq("id", user.id);

  if (profileError) throw new Error(profileError.message);

  revalidatePath("/", "layout");
}

export async function skipOnboarding(timezone?: string) {
  const { supabase, user } = await requireUser();
  const profile = await getOrCreateProfile(supabase, user.id);

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarded_at: new Date().toISOString(),
      timezone:
        timezone && isValidTimezone(timezone) ? timezone : profile.timezone,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
