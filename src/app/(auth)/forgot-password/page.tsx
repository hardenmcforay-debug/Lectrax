"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthErrorNotice } from "@/components/auth/auth-error-notice";
import type { AuthUserMessage } from "@/lib/errors/auth-messages";
import { mapAuthError, mapSupabaseAuthError } from "@/lib/errors/map-auth-error";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<AuthUserMessage | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordInput) {
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (resetError) {
        setError(
          mapSupabaseAuthError(resetError, "password-reset", "auth.passwordReset") ?? {
            title: "Request Failed",
            description: "Could not send the reset link. Please try again.",
            retryable: true,
          }
        );
        return;
      }

      setSent(true);
    } catch (cause) {
      setError(mapAuthError(cause, "password-reset", "auth.passwordReset.unhandled"));
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Logo className="mb-8" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Reset your Lectrax account password. We&apos;ll send you a secure link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-accent">Check your email for the reset link.</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              {error && (
                <AuthErrorNotice error={error} onRetry={() => setError(null)} />
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
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
