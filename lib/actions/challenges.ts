"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { todayISO } from "@/lib/dates";

const idSchema = z.uuid();

/** Recomeça o desafio hoje, com a mesma duração. O histórico de registros não é tocado. */
export async function renewChallenge(habitId: string) {
  const { supabase, user } = await requireUser();
  const id = idSchema.parse(habitId);
  const profile = await getOrCreateProfile(supabase, user.id);

  const { error } = await supabase
    .from("habits")
    .update({ challenge_start_date: todayISO(profile.timezone) })
    .eq("id", id)
    .not("challenge_days", "is", null);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Encerra o desafio (o hábito continua normalmente). */
export async function endChallenge(habitId: string) {
  const { supabase } = await requireUser();
  const id = idSchema.parse(habitId);

  const { error } = await supabase
    .from("habits")
    .update({ challenge_days: null, challenge_start_date: null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
