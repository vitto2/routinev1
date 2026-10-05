"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPillar, updatePillar } from "@/lib/actions/pillars";
import { focusFirstInvalid, useFormErrors } from "@/lib/forms";
import { pillarSchema } from "@/lib/validation/pillar";
import { ICONS_BY_NAME, DEFAULT_ACCENT, accentStyles } from "@/lib/constants/appearance";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconPicker, ColorPicker } from "@/components/pillars/IconColorPicker";
import type { Pillar } from "@/types/domain";

export function PillarForm({ pillar }: { pillar?: Pillar }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(pillar?.name ?? "");
  const [description, setDescription] = useState(pillar?.description ?? "");
  const [icon, setIcon] = useState<string | null>(pillar?.icon ?? "Heart");
  const [color, setColor] = useState<string | null>(pillar?.color ?? DEFAULT_ACCENT);
  const [pending, startTransition] = useTransition();
  const { errors, validate, validateField, clear } = useFormErrors(pillarSchema);

  const values = { name, description: description || null, icon, color };
  const accent = accentStyles(color);
  const PreviewIcon = (icon && ICONS_BY_NAME[icon]) || ICONS_BY_NAME.Heart;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const data = validate(values);
    if (!data) {
      focusFirstInvalid(formRef.current);
      return;
    }

    startTransition(async () => {
      try {
        if (pillar) {
          await updatePillar(pillar.id, data);
          toast.success("Pilar atualizado");
        } else {
          await createPillar(data);
          toast.success("Pilar criado");
        }
        router.push("/pillars");
        router.refresh();
      } catch {
        toast.error("Não foi possível salvar o pilar. Tente novamente.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      <div
        className="flex items-center gap-3 rounded-2xl border border-border p-4 transition-colors duration-300"
        style={accent.soft}
        aria-hidden
      >
        <span
          className="flex size-12 items-center justify-center rounded-2xl transition-colors duration-300"
          style={accent.bubble}
        >
          <PreviewIcon className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold" style={accent.text}>
            {name.trim() || "Nome do pilar"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {description.trim() || "Prévia de como o pilar aparece"}
          </p>
        </div>
      </div>

      <Field id="pillar-name" label="Nome" required error={errors.name}>
        {(props) => (
          <Input
            {...props}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clear("name");
            }}
            onBlur={() => validateField(values, "name")}
            placeholder="Ex: Saúde"
            autoComplete="off"
            maxLength={60}
          />
        )}
      </Field>

      <Field
        id="pillar-description"
        label="Descrição"
        optionalHint
        error={errors.description}
      >
        {(props) => (
          <Textarea
            {...props}
            value={description ?? ""}
            onChange={(e) => {
              setDescription(e.target.value);
              clear("description");
            }}
            rows={2}
            maxLength={280}
            placeholder="Para que serve esta área da sua vida?"
          />
        )}
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">Ícone</p>
        <IconPicker value={icon} onChange={setIcon} color={color} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Cor</p>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : pillar ? "Salvar alterações" : "Criar pilar"}
      </Button>
    </form>
  );
}
