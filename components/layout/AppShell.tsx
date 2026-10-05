import { BottomNav } from "@/components/layout/BottomNav";

export function AppShell({
  children,
  today,
}: {
  children: React.ReactNode;
  today: string;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
        {children}
      </main>
      <BottomNav today={today} />
    </div>
  );
}
