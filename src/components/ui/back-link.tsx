"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Outline icon button that navigates back via a link. */
export function BackLink({
  href,
  label = "Back",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Button asChild variant="outline" size="icon" className={cn("h-9 w-9 shrink-0", className)}>
      <Link href={href} aria-label={label}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  );
}
