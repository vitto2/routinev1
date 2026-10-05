"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isValidTimezone } from "@/lib/dates";

export async function updateTimezone(timezone: string) {
  const { supabase, user } = await requireUser();

  if (!isValidTimezone(timezone)) {
    throw new Error("Fuso horário inválido.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ timezone })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
