import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared visual tokens for Lectrax auth cards (login / signup). */
export const authCardLabelClass = "text-sm font-medium text-slate-600";

export const authCardInputClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 shadow-none transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 md:h-12";

export const authCardButtonClass =
  "auth-primary-btn h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white shadow-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.99] md:h-12 md:text-base";

export const authCardLinkClass =
  "font-medium text-primary transition-colors hover:text-primary/80";

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-[1.75rem] bg-white p-6 shadow-[0_16px_40px_-18px_rgba(15,23,42,0.22)] sm:p-8 md:rounded-[2rem] md:p-9",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AuthFieldIcon({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-1/2 z-[1] flex -translate-y-1/2 items-center gap-1.5 text-slate-400",
        wide ? "left-3" : "left-3.5"
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
