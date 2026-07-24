"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<AuthUserMessage | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(passwordChangeSchema) });

  async function onSubmit(data: ResetPasswordInput) {
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError({
          title: "Link Expired",
          description: "This reset link is invalid or has expired. Request a new one.",
          retryable: false,
        });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        setError(
          mapSupabaseAuthError(updateError, "password-reset", "auth.passwordReset.update") ?? {
            title: "Request Failed",
            description: "Could not update your password. Please try again.",
            retryable: true,
          }
        );
        return;
      }

      await supabase.auth.signOut();
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
