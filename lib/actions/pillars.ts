"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { pillarSchema } from "@/lib/validation/pillar";

export async function createPillar(input: {
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}) {
  const { supabase, user } = await requireUser();
  const data = pillarSchema.parse(input);

  const { error } = await supabase.from("pillars").insert({
    user_id: user.id,
    name: data.name,
    icon: data.icon ?? null,
    color: data.color ?? null,
    description: data.description ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function updatePillar(
  id: string,
  input: {
    name: string;
    icon?: string | null;
    color?: string | null;
    description?: string | null;
  },
) {
  const { supabase } = await requireUser();
  const data = pillarSchema.parse(input);

  const { error } = await supabase
    .from("pillars")
    .update({
      name: data.name,
      icon: data.icon ?? null,
      color: data.color ?? null,
      description: data.description ?? null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function archivePillar(id: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("pillars")
    .update({ archived: true })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
