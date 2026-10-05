"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPillar, updatePillar } from "@/lib/actions/pillars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconPicker, ColorPicker } from "@/components/pillars/IconColorPicker";
import type { Pillar } from "@/types/domain";

export function PillarForm({ pillar }: { pillar?: Pillar }) {
  const router = useRouter();
  const [name, setName] = useState(pillar?.name ?? "");
  const [description, setDescription] = useState(pillar?.description ?? "");
  const [icon, setIcon] = useState<string | null>(pillar?.icon ?? "Heart");
  const [color, setColor] = useState<string | null>(pillar?.color ?? "#6366f1");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      try {
        const payload = { name, description: description || null, icon, color };
        if (pillar) {
          await updatePillar(pillar.id, payload);
          toast.success("Pilar atualizado");
        } else {
          await createPillar(payload);
          toast.success("Pilar criado");
        }
        router.push("/pillars");
        router.refresh();
      } catch {
        toast.error("Não foi possível salvar o pilar");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="pillar-name">Nome</Label>
        <Input
          id="pillar-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Saúde"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pillar-description">Descrição (opcional)</Label>
        <Textarea
          id="pillar-description"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Ícone</Label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : pillar ? "Salvar alterações" : "Criar pilar"}
      </Button>
    </form>
  );
}
