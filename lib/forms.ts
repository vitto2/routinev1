"use client";

import { useCallback, useState } from "react";
import type { ZodType } from "zod";
import { fieldErrors } from "@/lib/validation/errors";

export type FieldErrors = Record<string, string>;

/** Leva o foco ao primeiro campo marcado como inválido (após o React pintar os erros). */
export function focusFirstInvalid(form: HTMLElement | null) {
  // Espera o React confirmar os erros no DOM; tenta de novo uma vez se ainda não pintou.
  const attempt = (retries: number) => {
    const el = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!el) {
      if (retries > 0) setTimeout(() => attempt(retries - 1), 50);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  };
  setTimeout(() => attempt(3), 30);
}

/**
 * Validação com o mesmo schema do servidor.
 * - validate(values): valida tudo (envio) e devolve os dados limpos, ou null.
 * - validateField(values, name): valida ao sair do campo e mostra só o erro dele.
 * - clear(name): some com o erro assim que o usuário corrige.
 */
export function useFormErrors<T>(schema: ZodType<T>) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = useCallback(
    (values: unknown): T | null => {
      const result = schema.safeParse(values);
      if (result.success) {
        setErrors({});
        return result.data;
      }
      setErrors(fieldErrors(result.error));
      return null;
    },
    [schema],
  );

  const validateField = useCallback(
    (values: unknown, name: string) => {
      const result = schema.safeParse(values);
      const message = result.success ? undefined : fieldErrors(result.error)[name];
      setErrors((prev) => {
        const next = { ...prev };
        if (message) next[name] = message;
        else delete next[name];
        return next;
      });
    },
    [schema],
  );

  const clear = useCallback((name: string) => {
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  return { errors, validate, validateField, clear };
}
