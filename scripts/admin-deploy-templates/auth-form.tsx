"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient, getSupabaseConfigError } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { redirectAfterAuth } from "@/lib/auth/roles";
import { resolveClientRoleAfterAuth } from "@/lib/auth/resolve-client-role";
import { AuthErrorNotice } from "@/components/auth/auth-error-notice";
import type { AuthUserMessage } from "@/lib/errors/auth-messages";
import { mapAuthError, mapSupabaseAuthError } from "@/lib/errors/map-auth-error";
import { getAuthNetworkMessage } from "@/lib/errors/auth-messages";

const authInputClass =
  "h-10 rounded-xl border-slate-200 bg-slate-50/50 px-3 text-left text-sm transition-all placeholder:text-left placeholder:text-slate-400 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 md:h-11 md:px-4 md:text-base";

const authLabelClass = "text-xs font-medium text-slate-700 md:text-sm";

function toAuthMessage(title: string, description: string, retryable = false): AuthUserMessage {
  return { title, description, retryable };
}

export function LoginForm({ adminOnly = true }: { adminOnly?: boolean } = {}) {
  const searchParams = useSearchParams();
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<AuthUserMessage | null>(() => {
    const authError = searchParams.get("error");
    if (authError === "auth") {
      return toAuthMessage(
        "Sign In Failed",
        "Sign in failed. Please check your email and password."
      );
    }
    return null;
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    const savedEmail = localStorage.getItem("lectrax_admin_remember_email");
    if (savedEmail) {
      setValue("email", savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  async function onSubmit(data: LoginInput) {
    setError(null);

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(
        toAuthMessage(
          "Service Temporarily Unavailable",
          "Authentication is not configured. Please contact support."
        )
      );
      return;
    }

    if (rememberMe) {
      localStorage.setItem("lectrax_admin_remember_email", data.email);
    } else {
      localStorage.removeItem("lectrax_admin_remember_email");
    }

    try {
      let supabase;
      try {
        supabase = createClient();
      } catch (cause) {
        setError(mapAuthError(cause, "login", "auth.login.createClient"));
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        await supabase.auth.signOut();
        setError(
          mapSupabaseAuthError(authError, "login", "auth.login.signIn") ?? {
            title: "Sign In Failed",
            description: "Sign in failed. Please check your email and password.",
            retryable: false,
          }
        );
        return;
      }

      const user = authData.user;
      if (!user) {
        await supabase.auth.signOut();
        setError(
          toAuthMessage("Sign In Failed", "Sign in failed. Please try again.", true)
        );
        return;
      }

      const { role, networkFailure } = await resolveClientRoleAfterAuth(supabase);

      if (!role) {
        await supabase.auth.signOut();
        setError(
          networkFailure
            ? getAuthNetworkMessage("session")
            : toAuthMessage(
                "Sign In Failed",
                "Could not verify your account. Please try again or contact support.",
                true
              )
        );
        return;
      }

      if (adminOnly && role !== "platform_admin") {
        await supabase.auth.signOut();
        setError(
          toAuthMessage(
            "Access Denied",
            "This sign-in page is for platform administrators only.",
            false
          )
        );
        return;
      }

      redirectAfterAuth(role, searchParams.get("redirect"));
    } catch (cause) {
      setError(mapAuthError(cause, "login", "auth.login.unhandled"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="email" className={authLabelClass}>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          className={authInputClass}
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className={authLabelClass}>
          Password
        </Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className={authInputClass}
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary/30"
        />
        <span className="text-xs text-slate-600 md:text-sm">Remember me</span>
      </label>

      {error && <AuthErrorNotice error={error} onRetry={() => setError(null)} />}

      <Button type="submit" disabled={isSubmitting} className="h-10 w-full">
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
