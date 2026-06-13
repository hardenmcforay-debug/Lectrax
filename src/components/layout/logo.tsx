"use client";

import Link from "next/link";
import Image from "next/image";
import { GraduationCap } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSiteLogo } from "@/components/layout/site-branding-provider";

export function Logo({
  className,
  href = "/",
  iconClassName,
  labelClassName,
  iconWithBackground = false,
  variant = "default",
  logoUrl: logoUrlProp,
  markClassName,
}: {
  className?: string;
  href?: string;
  iconClassName?: string;
  labelClassName?: string;
  iconWithBackground?: boolean;
  variant?: "default" | "light";
  logoUrl?: string | null;
  markClassName?: string;
}) {
  const logoUrlFromContext = useSiteLogo();
  const logoUrl = logoUrlProp ?? logoUrlFromContext;
  const isLight = variant === "light";

  const iconSizeClass = cn(
    iconWithBackground
      ? "h-9 w-9"
      : iconClassName?.includes("h-6")
        ? "h-7 w-7"
        : "h-8 w-8",
    markClassName
  );

  const mark = logoUrl ? (
    <div className={cn("relative shrink-0 overflow-hidden bg-transparent", iconSizeClass)}>
      <Image
        src={logoUrl}
        alt={`${APP_NAME} logo`}
        fill
        className="object-contain object-center"
        sizes={markClassName?.includes("h-10") ? "40px" : "36px"}
        unoptimized={/\.svg(\?|$)/i.test(logoUrl)}
      />
    </div>
  ) : (
    <GraduationCap
      className={cn(
        iconWithBackground
          ? isLight
            ? "h-5 w-5 text-emerald-300"
            : "h-5 w-5 text-slate-300"
          : "h-8 w-8 shrink-0 text-accent",
        iconClassName
      )}
    />
  );

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 font-bold",
        isLight ? "text-white" : "text-primary",
        className
      )}
    >
      {iconWithBackground && !logoUrl ? (
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isLight ? "bg-white/15 backdrop-blur-sm" : "bg-primary"
          )}
        >
          {mark}
        </div>
      ) : (
        mark
      )}
      <span className={cn("text-xl", labelClassName)}>{APP_NAME}</span>
    </Link>
  );
}
