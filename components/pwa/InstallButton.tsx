"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

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
      <Panel
        icon={Check}
        tone="success"
        title="App instalado"
        description="O Routine já está instalado neste dispositivo."
      />
    );
  }

  if (mode === "prompt") {
    return (
      <Panel
        icon={Download}
        title="Use como aplicativo"
        description="Abra o Routine direto da tela inicial, em tela cheia."
      >
        <Button className="w-full" onClick={handleInstall}>
          <Download aria-hidden />
          Instalar app
        </Button>
      </Panel>
    );
  }

  if (mode === "ios") {
    return (
      <Panel
        icon={Share}
        tone="muted"
        title="Instalar no iPhone"
        description="Toque em Compartilhar e depois em “Adicionar à Tela de Início”."
      />
    );
  }

  return (
    <Panel
      icon={Smartphone}
      tone="muted"
      title="Instalar o app"
      description="Abra no Chrome e use o menu “Instalar app” (ícone na barra de endereço no computador, ou “Adicionar à tela inicial” no celular)."
    />
  );
}
