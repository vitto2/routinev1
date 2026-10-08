"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { resumeHabits } from "@/lib/actions/pause";
import { Button } from "@/components/ui/button";

/** Retoma hoje os hábitos informados (ou todos, com habitIds = null). */
export function ResumeButton({
  habitIds = null,
  label = "Retomar agora",
  variant = "default",
}: {
  habitIds?: string[] | null;
  label?: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function resume() {
    startTransition(async () => {
      try {
        await resumeHabits({ habitIds });
        toast.success("Pausa encerrada. Bom retorno!");
        router.refresh();
      } catch {
        toast.error("Não foi possível retomar. Tente novamente.");
      }
    });
  }

  return (
    <Button type="button" variant={variant} onClick={resume} disabled={pending}>
      <Play className="size-4" />
      {pending ? "Retomando..." : label}
    </Button>
  );
}
