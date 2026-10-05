"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { updateTimezone } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";

export function TimezoneSync({ current }: { current: string }) {
  const [device, setDevice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(
      () => setDevice(Intl.DateTimeFormat().resolvedOptions().timeZone),
      0,
    );
    return () => clearTimeout(timer);
  }, []);

  function apply() {
    if (!device) return;
    startTransition(async () => {
      try {
        await updateTimezone(device);
        toast.success("Fuso horário atualizado");
      } catch {
        toast.error("Não foi possível atualizar o fuso horário");
      }
    });
  }

  const mismatch = device !== null && device !== current;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Fuso horário</p>
      <p className="font-medium">{current}</p>
      {mismatch ? (
        <div className="space-y-2 rounded-xl bg-amber-500/10 p-3 text-sm">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-amber-600" />
            Este dispositivo usa <b>{device}</b>. O dia dos seus registros e os lembretes
            seguem o fuso do perfil.
          </p>
          <Button size="sm" className="rounded-lg" onClick={apply} disabled={pending}>
            {pending ? "Atualizando..." : "Usar o fuso deste dispositivo"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
