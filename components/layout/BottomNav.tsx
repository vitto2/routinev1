"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarRange, TrendingUp, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddSheet } from "@/components/layout/QuickAddSheet";

const LEFT_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/today", label: "Hoje", icon: CalendarCheck },
  { href: "/week", label: "Semana", icon: CalendarRange },
];

const RIGHT_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/progress", label: "Progresso", icon: TrendingUp },
  { href: "/profile", label: "Perfil", icon: User },
];

export function BottomNav({ today }: { today: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {LEFT_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
        <div className="flex flex-1 items-center justify-center">
          <QuickAddSheet today={today} />
        </div>
        {RIGHT_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
      {label}
    </Link>
  );
}
