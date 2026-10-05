"use client";

import { useEffect, useState } from "react";
import { Download, Share, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "checking" | "installed" | "prompt" | "ios" | "unsupported";

export function InstallButton() {
  const [mode, setMode] = useState<Mode>("checking");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode("installed");

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Estado inicial agendado fora do corpo síncrono do efeito.
    const timer = setTimeout(() => {
      setMode((current) =>
        current !== "checking" ? current : standalone ? "installed" : isIOS ? "ios" : "unsupported",
      );
    }, 800);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setMode(outcome === "accepted" ? "installed" : "unsupported");
  }

  if (mode === "checking") return null;

  if (mode === "installed") {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-muted-foreground">
        <Check className="size-4 text-primary" />
        App instalado neste dispositivo.
      </p>
    );
  }

  if (mode === "prompt") {
    return (
      <Button className="h-12 w-full rounded-2xl text-base" onClick={handleInstall}>
        <Download className="size-4" />
        Instalar app
      </Button>
    );
  }

  if (mode === "ios") {
    return (
      <p className="flex items-start gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-muted-foreground">
        <Share className="mt-0.5 size-4 shrink-0" />
        No iPhone: toque em Compartilhar e depois em &ldquo;Adicionar à Tela de Início&rdquo;.
      </p>
    );
  }

  return (
    <p className="rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-muted-foreground">
      Para instalar, abra no Chrome e use o menu &ldquo;Instalar app&rdquo; (ícone na barra de
      endereço no computador, ou &ldquo;Adicionar à tela inicial&rdquo; no celular).
    </p>
  );
}
