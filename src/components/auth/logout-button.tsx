"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useAsyncAction } from "@/hooks/use-async-action";
import { signOutAndClearClientStorage } from "@/lib/auth/client-sign-out";
import { cn } from "@/lib/utils";

export type LogoutButtonProps = {
  className?: string;
  children?: React.ReactNode;
  /** Called before sign-out (e.g. close a mobile menu). */
  onBeforeLogout?: () => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;

export function LogoutButton({
  className,
  children = "Log out",
  onBeforeLogout,
  disabled,
  ...props
}: LogoutButtonProps) {
  const { isPending, run } = useAsyncAction();
  const isDisabled = Boolean(disabled || isPending);

  return (
    <button
      type="button"
      {...props}
      className={cn(
        isPending && "cursor-wait [&>svg:not(.animate-spin)]:hidden",
        className
      )}
      disabled={isDisabled}
      aria-busy={isPending || undefined}
      aria-disabled={isDisabled || undefined}
      onClick={() =>
        void run(async () => {
          onBeforeLogout?.();
          await signOutAndClearClientStorage();
        })
      }
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
