"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { signOutAndClearClientStorage } from "@/lib/auth/client-sign-out";
import { ADMIN_NAV_ITEMS, getActiveAdminNavHref } from "@/lib/admin/navigation";

export function DashboardSidebar({ className }: { role?: string; className?: string }) {
  const pathname = usePathname();
  const activeHref = getActiveAdminNavHref(pathname);

  async function handleLogout() {
    await signOutAndClearClientStorage();
  }

  return (
    <aside className={cn("flex h-full w-[13.5rem] shrink-0 flex-col border-r bg-white", className)}>
      <div className="border-b px-3 py-3">
        <Logo href={ADMIN_NAV_ITEMS[0]?.href ?? "/admin"} className="gap-1.5" iconClassName="h-6 w-6" labelClassName="text-base" />
      </div>
      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active ? "true" : "false"}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium leading-none transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1.5 border-t p-2">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm leading-none text-muted-foreground hover:bg-muted"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
