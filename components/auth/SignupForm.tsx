"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CircleAlert, MailCheck } from "lucide-react";
import { signUp, type AuthFormState } from "@/lib/actions/auth";
import { focusFirstInvalid, useFormErrors } from "@/lib/forms";
import { signupSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: AuthFormState = { error: null, message: null };

export function SignupForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<AuthFormState>(initialState);
  const [pending, startTransition] = useTransition();
  const { errors, validate, validateField, clear } = useFormErrors(signupSchema);

  const values = { display_name: displayName, email, password };

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState(initialState);

    const data = validate(values);
    if (!data) {
      focusFirstInvalid(formRef.current);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("display_name", data.display_name ?? "");
      formData.set("email", data.email);
      formData.set("password", data.password);
      // O fuso só é conhecido no navegador (no servidor seria UTC).
      formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);

      const result = await signUp(initialState, formData);
      if (result) {
        setState(result);
        if (result.fieldErrors) focusFirstInvalid(formRef.current);
      }
    });
  }

  const fieldError = (name: string) => errors[name] ?? state.fieldErrors?.[name];

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <Field id="signup-name" label="Nome" optionalHint error={fieldError("display_name")}>
        {(props) => (
          <Input
            {...props}
            name="display_name"
            autoComplete="name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              clear("display_name");
            }}
            placeholder="Como quer ser chamado"
            maxLength={60}
          />
        )}
      </Field>

      <Field id="signup-email" label="Email" required error={fieldError("email")}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clear("email");
            }}
            onBlur={() => email && validateField(values, "email")}
            placeholder="voce@exemplo.com"
          />
        )}
      </Field>

      <Field
        id="signup-password"
        label="Senha"
        required
        error={fieldError("password")}
        hint="Mínimo de 6 caracteres."
      >
        {(props) => (
          <PasswordInput
            {...props}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clear("password");
            }}
            onBlur={() => password && validateField(values, "password")}
          />
        )}
      </Field>

      {state.error ? (
        <p
          role="alert"
          className="animate-rise flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p
          role="status"
          className="animate-rise flex items-start gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-medium text-foreground"
        >
          <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
