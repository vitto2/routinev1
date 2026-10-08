"use client";

import { useSyncExternalStore } from "react";
import { parseStored, serialize, type PendingEntry, type PendingMap } from "@/lib/offline/queue";
import type { PendingStore } from "@/lib/offline/engine";

/**
 * Fila persistida no aparelho (localStorage) e observável pelos componentes.
 * localStorage basta: são poucos itens pequenos, e a leitura síncrona simplifica o React.
 */
const STORAGE_KEY = "routine:pending:v1";
const EMPTY: PendingMap = Object.freeze({}) as PendingMap;
/** Por quanto tempo um item já enviado ainda "segura" a tela até ela receber os dados novos. */
const SETTLED_MS = 3000;

let current: PendingMap | null = null;
let storageListenerInstalled = false;
const listeners = new Set<() => void>();
const settled = new Map<string, PendingEntry>();

function emit() {
  listeners.forEach((listener) => listener());
}

function load(): PendingMap {
  if (current) return current;
  if (typeof window === "undefined") return EMPTY;

  try {
    current = parseStored(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    current = {};
  }
  return current;
}

function onStorage(event: StorageEvent) {
  // Outra aba do app alterou a fila.
  if (event.key === STORAGE_KEY) {
    current = parseStored(event.newValue);
    emit();
  }
}

export const pendingStore: PendingStore = {
  get: load,
  set(next) {
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, serialize(next));
    } catch {
      // Armazenamento cheio ou bloqueado (modo privado): segue só em memória.
    }
    emit();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!storageListenerInstalled && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    storageListenerInstalled = true;
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Marca um item como entregue, mantendo-o visível por instantes (evita piscar o estado antigo). */
export function markSettled(entry: PendingEntry) {
  settled.set(entry.key, entry);
  emit();
  setTimeout(() => {
    if (settled.get(entry.key) === entry) {
      settled.delete(entry.key);
      emit();
    }
  }, SETTLED_MS);
}

/** Alteração pendente (ou recém-enviada) de uma chave, ou null. */
export function usePendingEntry(key: string): PendingEntry | null {
  return useSyncExternalStore(
    subscribe,
    () => load()[key] ?? settled.get(key) ?? null,
    () => null,
  );
}

export function usePendingCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => Object.keys(load()).length,
    () => 0,
  );
}

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** Esquece a fila e as páginas guardadas (ao sair da conta, por privacidade). */
export async function clearOfflineData() {
  pendingStore.set({});
  settled.clear();

  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.endsWith("-pages")).map((n) => caches.delete(n)));
    }
  } catch {
    // Sem acesso ao cache: nada a limpar.
  }
}
