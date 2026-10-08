"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { updateTimezone } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

/** Aviso (só aparece quando o fuso do aparelho difere do do perfil) com o botão para ajustar. */
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

  if (device === null || device === current) return null;

  return (
    <Notice icon={MapPin} tone="warning" badge="warning">
      <p>
        Este dispositivo usa <b>{device}</b>. O dia dos seus registros e os lembretes seguem o fuso
        do perfil.
      </p>
      <Button size="sm" onClick={apply} disabled={pending}>
        {pending ? "Atualizando..." : "Usar o fuso deste dispositivo"}
      </Button>
    </Notice>
  );
}
