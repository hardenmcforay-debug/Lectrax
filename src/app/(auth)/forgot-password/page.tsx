"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations";
import Link from "next/link";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/auth/password-reset-constants";
import { appFetch } from "@/lib/api/client-fetch";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthErrorNotice } from "@/components/auth/auth-error-notice";
import type { AuthUserMessage } from "@/lib/errors/auth-messages";
import { mapAuthError } from "@/lib/errors/map-auth-error";

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
      const response = await appFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: data.identifier }),
      });

      if (response.status === 429) {
        setError({
          title: "Too Many Requests",
          description: "Too many reset attempts. Please wait a few minutes and try again.",
          retryable: true,
        });
        return;
      }

      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError({
          title: "Request Failed",
          description: body?.error ?? "Please enter a valid email address.",
          retryable: false,
        });
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
          <CardTitle>Need to reset your password?</CardTitle>
          <CardDescription>
            Provide your email address, and we&apos;ll help you regain access to your Lectrax
            account. If an email is associated with your account, a secure password reset link will
            be sent to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-accent">{PASSWORD_RESET_SUCCESS_MESSAGE}</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="identifier">Email</Label>
                <Input
                  id="identifier"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  {...register("identifier")}
                  required
                />
                {errors.identifier && (
                  <p className="text-sm text-destructive">{errors.identifier.message}</p>
                )}
              </div>
              {error && (
                <AuthErrorNotice error={error} onRetry={() => setError(null)} />
              )}
              <Button type="submit" className="w-full" loading={isSubmitting}>
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
