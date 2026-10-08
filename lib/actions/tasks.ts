"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

/** Estado desejado (não "alternar"): desfazer e repetir a chamada são seguros. */
export async function setTaskCompletion(taskId: string, completed: boolean) {
  const { supabase } = await requireUser();
  const id = z.uuid().parse(taskId);

  const { error } = await supabase
    .from("tasks")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
