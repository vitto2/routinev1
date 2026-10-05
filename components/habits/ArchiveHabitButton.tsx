"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { archiveHabit, unarchiveHabit } from "@/lib/actions/habits";
import { Button } from "@/components/ui/button";

export function ArchiveHabitButton({
  habitId,
  active,
}: {
  habitId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (active && !confirm("Arquivar este hábito? O histórico é preservado.")) {
      return;
    }

    startTransition(async () => {
      try {
        if (active) {
          await archiveHabit(habitId);
          toast.success("Hábito arquivado");
        } else {
          await unarchiveHabit(habitId);
          toast.success("Hábito reativado");
        }
        router.push("/habits");
        router.refresh();
      } catch {
        toast.error("Não foi possível atualizar o hábito");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={handleClick}
      disabled={pending}
    >
      {active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
      {active ? "Arquivar hábito" : "Reativar hábito"}
    </Button>
  );
}
