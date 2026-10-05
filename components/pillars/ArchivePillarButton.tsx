"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive } from "lucide-react";
import { archivePillar } from "@/lib/actions/pillars";
import { Button } from "@/components/ui/button";

export function ArchivePillarButton({ pillarId }: { pillarId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleArchive() {
    if (!confirm("Arquivar este pilar? Os hábitos vinculados continuam existindo, mas sem pilar.")) {
      return;
    }

    startTransition(async () => {
      try {
        await archivePillar(pillarId);
        toast.success("Pilar arquivado");
        router.push("/pillars");
        router.refresh();
      } catch {
        toast.error("Não foi possível arquivar o pilar");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={handleArchive}
      disabled={pending}
    >
      <Archive className="size-4" />
      Arquivar pilar
    </Button>
  );
}
