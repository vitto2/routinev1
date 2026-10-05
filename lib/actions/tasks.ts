"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { taskSchema, type TaskInput } from "@/lib/validation/task";

export async function createTask(input: TaskInput) {
  const { supabase, user } = await requireUser();
  const data = taskSchema.parse(input);

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    pillar_id: data.pillar_id ?? null,
    title: data.title,
    description: data.description ?? null,
    due_date: data.due_date,
    due_time: data.due_time ?? null,
    priority: data.priority,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function updateTask(taskId: string, input: TaskInput) {
  const { supabase } = await requireUser();
  const data = taskSchema.parse(input);

  const { error } = await supabase
    .from("tasks")
    .update({
      pillar_id: data.pillar_id ?? null,
      title: data.title,
      description: data.description ?? null,
      due_date: data.due_date,
      due_time: data.due_time ?? null,
      priority: data.priority,
    })
    .eq("id", taskId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function toggleTaskCompletion(taskId: string) {
  const { supabase } = await requireUser();

  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("completed")
    .eq("id", taskId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const nextCompleted = !existing.completed;

  const { error } = await supabase
    .from("tasks")
    .update({
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
