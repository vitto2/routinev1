"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { signIn, type AuthFormState } from "@/lib/actions/auth";
import { focusFirstInvalid, useFormErrors } from "@/lib/forms";
import { loginSchema } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { surfaceVariants } from "@/components/ui/surface";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { GOOGLE_ENABLED, GoogleButton, OrDivider } from "@/components/auth/GoogleButton";

const initialState: AuthFormState = { error: null, message: null };

export function LoginForm({ googleError = false }: { googleError?: boolean }) {
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
      className={cn(surfaceVariants({ padding: "none" }), "space-y-5 p-6")}
    >
      {GOOGLE_ENABLED ? (
        <>
          <GoogleButton />
          <OrDivider />
        </>
      ) : null}

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

      {googleError && !state.error ? (
        <Notice icon={CircleAlert} tone="danger" badge="danger" role="alert">
          <p className="font-medium">
            Não foi possível entrar com o Google. Tente novamente ou use email e senha.
          </p>
        </Notice>
      ) : null}

      {state.error ? (
        <Notice icon={CircleAlert} tone="danger" badge="danger" role="alert" className="animate-rise">
          <p className="font-medium">{state.error}</p>
        </Notice>
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
