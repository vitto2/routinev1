"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { moveInOrder } from "@/lib/routines/order";
import { routineSchema, type RoutineInput } from "@/lib/validation/routine";

const idSchema = z.uuid();

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** A rotina precisa ser do usuário (a RLS esconde as dos outros). */
async function assertOwnRoutine(supabase: Supabase, routineId: string) {
  const { data, error } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Rotina não encontrada.");
}

export async function createRoutine(input: RoutineInput): Promise<{ id: string }> {
  const { supabase, user } = await requireUser();
  const data = routineSchema.parse(input);

  const { data: last } = await supabase
    .from("routines")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name: data.name,
      period: data.period,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return { id: created.id };
}

export async function updateRoutine(routineId: string, input: RoutineInput) {
  const { supabase } = await requireUser();
  const id = idSchema.parse(routineId);
  const data = routineSchema.parse(input);

  const { error } = await supabase
    .from("routines")
    .update({ name: data.name, period: data.period })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Os hábitos da rotina continuam existindo (routine_id volta a null). */
export async function deleteRoutine(routineId: string) {
  const { supabase } = await requireUser();
  const id = idSchema.parse(routineId);

  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

/** Coloca o hábito no fim de uma rotina, ou o tira dela (routineId = null). */
export async function assignHabitToRoutine(habitId: string, routineId: string | null) {
  const { supabase } = await requireUser();
  const habit = idSchema.parse(habitId);

  if (routineId === null) {
    const { error } = await supabase.from("habits").update({ routine_id: null }).eq("id", habit);
    if (error) throw new Error(error.message);
  } else {
    const routine = idSchema.parse(routineId);
    await assertOwnRoutine(supabase, routine);

    const { data: last } = await supabase
      .from("habits")
      .select("sort_order")
      .eq("routine_id", routine)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase
      .from("habits")
      .update({ routine_id: routine, sort_order: (last?.sort_order ?? -1) + 1 })
      .eq("id", habit);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}

/** Sobe ou desce o hábito uma posição dentro da sua rotina. */
export async function moveHabitInRoutine(habitId: string, direction: "up" | "down") {
  const { supabase } = await requireUser();
  const id = idSchema.parse(habitId);
  const dir = z.enum(["up", "down"]).parse(direction);

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("routine_id")
    .eq("id", id)
    .single();
  if (habitError) throw new Error(habitError.message);
  if (!habit.routine_id) return;

  const { data: siblings, error } = await supabase
    .from("habits")
    .select("id, sort_order, created_at")
    .eq("routine_id", habit.routine_id)
    .eq("active", true);
  if (error) throw new Error(error.message);

  const current = new Map((siblings ?? []).map((h) => [h.id, h.sort_order]));
  const changes = moveInOrder(siblings ?? [], id, dir).filter(
    (item) => current.get(item.id) !== item.sort_order,
  );

  const results = await Promise.all(
    changes.map((item) =>
      supabase.from("habits").update({ sort_order: item.sort_order }).eq("id", item.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath("/", "layout");
}
