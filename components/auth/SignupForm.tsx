"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { signUp, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const initialState: AuthFormState = { error: null, message: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const timezoneRef = useRef<HTMLInputElement>(null);

  // O timezone só pode ser lido no navegador: no SSR o Intl devolve o fuso do
  // servidor (UTC na Vercel), e o React não corrige atributos divergentes na
  // hidratação. Por isso o campo nasce vazio e é preenchido aqui.
  useEffect(() => {
    if (timezoneRef.current) {
      timezoneRef.current.value =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }, []);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <input ref={timezoneRef} type="hidden" name="timezone" defaultValue="" />
          <div className="space-y-2">
            <Label htmlFor="display_name">Nome</Label>
            <Input id="display_name" name="display_name" autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          {state.message ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">{state.message}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
