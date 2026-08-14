"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { passwordChangeSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthErrorNotice } from "@/components/auth/auth-error-notice";
import type { AuthUserMessage } from "@/lib/errors/auth-messages";
import { mapAuthError, mapSupabaseAuthError } from "@/lib/errors/map-auth-error";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { clearClientStorageAfterAuthReset } from "@/lib/auth/client-sign-out";

type ResetPasswordInput = {
  password: string;
  confirmPassword: string;
};

type SessionStatus = "checking" | "ready" | "expired";

const LINK_EXPIRED_ERROR: AuthUserMessage = {
  title: "Link Expired",
  description:
    "This reset link is invalid or has already been used. Request a new one and open it in the same browser where you asked for the reset.",
  retryable: false,
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [error, setError] = useState<AuthUserMessage | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(passwordChangeSchema) });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient("site");

    async function waitForRecoverySession() {
      // Allow hash/code bootstrap a moment to finish before declaring expiry.
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          if (!cancelled) {
            setSessionStatus("ready");
            setError(null);
          }
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (user) {
        setSessionStatus("ready");
        setError(null);
        return;
      }

      setSessionStatus("expired");
      setError(LINK_EXPIRED_ERROR);
    }

    void waitForRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setSessionStatus("ready");
        setError(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(data: ResetPasswordInput) {
    setError(null);

    try {
      const supabase = createClient("site");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSessionStatus("expired");
        setError(LINK_EXPIRED_ERROR);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        const mapped = mapSupabaseAuthError(
          updateError,
          "password-reset",
          "auth.passwordReset.update"
        );
        // Common when the recovery session was never established (failed PKCE exchange).
        if (
          /session|jwt|expired|invalid/i.test(updateError.message) ||
          updateError.status === 401
        ) {
          setSessionStatus("expired");
          setError(LINK_EXPIRED_ERROR);
          return;
        }

        setError(
          mapped ?? {
            title: "Request Failed",
            description: "Could not update your password. Please try again.",
            retryable: true,
          }
        );
        return;
      }

      await supabase.auth.signOut({ scope: "local" });
      clearClientStorageAfterAuthReset();
      setSaved(true);
      router.replace("/login?message=password-updated");
    } catch (cause) {
      const message = cause instanceof Error ? sanitizeErrorMessage(cause.message) : undefined;
      setError(
        mapAuthError(cause, "password-reset", "auth.passwordReset.unhandled") ?? {
          title: "Request Failed",
          description: message ?? "Could not update your password. Please try again.",
          retryable: true,
        }
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Logo className="mb-8" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            Choose a new password for your Lectrax account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {saved ? (
            <p className="text-sm text-accent">Password updated. Redirecting to sign in...</p>
          ) : sessionStatus === "checking" ? (
            <p className="text-sm text-muted-foreground">Validating your reset link...</p>
          ) : sessionStatus === "expired" ? (
            <div className="space-y-4">
              {error && <AuthErrorNotice error={error} />}
              <Button asChild className="w-full">
                <Link href="/forgot-password">Request a new reset link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              {error && <AuthErrorNotice error={error} onRetry={() => setError(null)} />}
              <Button type="submit" className="w-full" loading={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
          <Link href="/login" className="mt-4 block text-center text-sm text-primary hover:underline">
            Sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
