"use client";

import { cn } from "@/lib/utils";

type NavNotificationBadgeProps = {
  count: number;
  className?: string;
};

export function NavNotificationBadge({ count, className }: NavNotificationBadgeProps) {
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);

  return (
    <span
      className={cn(
        "absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-[#0B3D91]",
        className
      )}
      aria-label={`${count} unread notification${count === 1 ? "" : "s"}`}
    >
      {label}
    </span>
  );
}

export function SidebarNotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);

  return (
    <span
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white"
      aria-label={`${count} unread notification${count === 1 ? "" : "s"}`}
    >
      {label}
    </span>
  );
}
