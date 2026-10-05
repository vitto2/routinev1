"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ListChecks, Repeat, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TaskDialog } from "@/components/tasks/TaskDialog";

export function QuickAddSheet({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              size="icon"
              className="size-14 -translate-y-5 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/40 transition-transform duration-150 active:scale-90"
              aria-label="Adicionar"
            />
          }
        >
          <Plus className="size-6" />
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Adicionar</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 px-4 pb-6">
            <QuickAddOption
              icon={ListChecks}
              label="Tarefa"
              onClick={() => {
                setOpen(false);
                setTaskDialogOpen(true);
              }}
            />
            <QuickAddOption
              icon={Repeat}
              label="Hábito"
              onClick={() => {
                setOpen(false);
                router.push("/habits/new");
              }}
            />
            <QuickAddOption
              icon={Layers}
              label="Pilar"
              onClick={() => {
                setOpen(false);
                router.push("/pillars/new");
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} today={today} />
    </>
  );
}

function QuickAddOption({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ListChecks;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-semibold transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95"
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}
