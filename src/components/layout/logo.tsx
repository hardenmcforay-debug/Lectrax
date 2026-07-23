"use client";

import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSiteLogo } from "@/components/layout/site-branding-provider";
import { pwaIconUrl } from "@/lib/pwa/config";

/** Official Lectrax mark used when no custom site logo is uploaded. */
const DEFAULT_LECTRAX_LOGO_SRC = pwaIconUrl("/brand/official-logo.png");

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
  const logoUrl = logoUrlProp ?? logoUrlFromContext ?? DEFAULT_LECTRAX_LOGO_SRC;
  const isLight = variant === "light";
  const isDefaultMark = logoUrl === DEFAULT_LECTRAX_LOGO_SRC;

  const iconSizeClass = cn(
    iconWithBackground
      ? "h-9 w-9"
      : iconClassName?.includes("h-6")
        ? "h-7 w-7"
        : "h-8 w-8",
    markClassName
  );

  const mark = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        isDefaultMark || iconWithBackground ? "rounded-lg" : "bg-transparent",
        iconSizeClass
      )}
    >
      <Image
        src={logoUrl}
        alt={`${APP_NAME} logo`}
        fill
        className={cn(
          "object-contain object-center",
          isLight && "brightness-0 invert"
        )}
        sizes={markClassName?.includes("h-10") ? "40px" : "36px"}
        // Bypass /_next/image so PWA + Supabase branding loads reliably after deploy.
        unoptimized
        priority={isDefaultMark}
      />
    </div>
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
      {mark}
      <span className={cn("text-xl", labelClassName)}>{APP_NAME}</span>
    </Link>
  );
}
