"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { signIn, type AuthFormState } from "@/lib/actions/auth";
import { focusFirstInvalid, useFormErrors } from "@/lib/forms";
import { loginSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: AuthFormState = { error: null, message: null };

export function LoginForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<AuthFormState>(initialState);
  const [pending, startTransition] = useTransition();
  const { errors, validate, validateField, clear } = useFormErrors(loginSchema);

  const values = { email, password };

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
      formData.set("email", data.email);
      formData.set("password", data.password);
      const result = await signIn(initialState, formData);
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
      <Field id="login-email" label="Email" required error={fieldError("email")}>
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

      <Field id="login-password" label="Senha" required error={fieldError("password")}>
        {(props) => (
          <PasswordInput
            {...props}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clear("password");
            }}
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

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
