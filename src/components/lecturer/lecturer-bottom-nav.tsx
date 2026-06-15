"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getActiveLecturerNavHref, LECTURER_NAV_ITEMS } from "@/lib/lecturer/navigation";

export function LecturerBottomNav() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const activeHref = getActiveLecturerNavHref(pathname);

  return (
    <nav
      className="lecturer-mobile-nav portal-mobile-bottom-nav portal-mobile-only z-[60]"
      aria-label="Lecturer navigation"
    >
      <div className="portal-bottom-nav-bar lecturer-bottom-nav-bar flex w-full items-stretch justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {LECTURER_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "lecturer-bottom-nav-item group relative flex min-h-11 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B3D91]",
                active ? "text-emerald-300" : "text-white/65 hover:text-white/90",
                !reducedMotion && "transition-all duration-200"
              )}
            >
              <span
                className={cn(
                  "absolute inset-x-4 top-0 h-0.5 rounded-full bg-emerald-400 transition-opacity duration-200",
                  active ? "opacity-100" : "opacity-0"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200",
                  active ? "bg-emerald-500/20 text-emerald-300" : "text-inherit"
                )}
              >
                <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
              </span>
              <span className="max-w-full truncate leading-none">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
