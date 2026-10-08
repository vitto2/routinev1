"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { endChallenge, renewChallenge } from "@/lib/actions/challenges";
import { Button } from "@/components/ui/button";

export function ChallengeActions({
  habitId,
  finished,
}: {
  habitId: string;
  finished: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: "renew" | "end") {
    if (action === "end" && !confirm("Encerrar o desafio? O hábito e seu histórico continuam.")) {
      return;
    }
    startTransition(async () => {
      try {
        if (action === "renew") {
          await renewChallenge(habitId);
          toast.success("Novo desafio começou hoje");
        } else {
          await endChallenge(habitId);
          toast.success("Desafio encerrado");
        }
        router.refresh();
      } catch {
        toast.error("Não foi possível atualizar o desafio");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {finished ? (
        <Button type="button" size="sm" onClick={() => run("renew")} disabled={pending}>
          Recomeçar desafio
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => run("end")}
        disabled={pending}
      >
        Encerrar desafio
      </Button>
    </div>
  );
}
