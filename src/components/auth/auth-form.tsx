"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient, getSupabaseConfigError } from "@/lib/supabase/client";
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { redirectAfterAuth } from "@/lib/auth/roles";
import { resolveClientRoleAfterAuth } from "@/lib/auth/resolve-client-role";
import { getAttendanceDeviceIdentity } from "@/lib/attendance/device-identity";

const authInputClass =
  "h-10 rounded-xl border-slate-200 bg-slate-50/50 px-3 text-left text-sm transition-all placeholder:text-left placeholder:text-slate-400 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 md:h-11 md:px-4 md:text-base";

const authLabelClass = "text-xs font-medium text-slate-700 md:text-sm";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const authError = searchParams.get("error");
    if (authError === "auth") {
      return "Sign in failed. Please check your email and password.";
    }
    return null;
  });
  const [info, setInfo] = useState<string | null>(() => {
    if (searchParams.get("message") === "confirm-email") {
      return "Account created. Check your email to confirm, then sign in.";
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
    const savedEmail = localStorage.getItem("lectrax_remember_email");
    if (savedEmail) {
      setValue("email", savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  async function onSubmit(data: LoginInput) {
    setError(null);
    setInfo(null);

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      return;
    }

    if (rememberMe) {
      localStorage.setItem("lectrax_remember_email", data.email);
    } else {
      localStorage.removeItem("lectrax_remember_email");
    }

    let supabase;
    try {
      supabase = createClient();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication is unavailable.");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      await supabase.auth.signOut();
      setError(authError.message || "Sign in failed. Please check your email and password.");
      return;
    }

    const user = authData.user;
    if (!user) {
      await supabase.auth.signOut();
      setError("Sign in failed. Please try again.");
      return;
    }

    router.refresh();
    const role = await resolveClientRoleAfterAuth(supabase);

    if (!role) {
      await supabase.auth.signOut();
      setError("Could not verify your account. Please try again or contact support.");
      return;
    }

    redirectAfterAuth(role, searchParams.get("redirect"));
  }

  return (
    <div className="auth-fade-in auth-fade-in-delay-1 w-full">
      <div className="auth-form-header mb-3 text-center md:mb-5 md:text-left">
        <h2 className="text-balance text-lg font-bold tracking-tight text-slate-900 md:text-xl lg:text-2xl">
          Welcome Back
        </h2>
        <p className="auth-form-marketing-copy mt-1 text-sm text-slate-500">
          Sign in to manage your academic workspace with Lectrax.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5 text-left md:space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className={authLabelClass}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your Email"
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

        <div className="flex items-center justify-between gap-2">
          <label className="flex min-w-0 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            <span className="text-xs text-slate-600 md:text-sm">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="shrink-0 text-xs font-medium text-primary transition-colors hover:text-primary/80 md:text-sm"
          >
            Forgot password?
          </Link>
        </div>

        {info && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="auth-primary-btn h-10 w-full rounded-xl bg-primary text-sm font-semibold text-white shadow-[0_4px_14px_rgba(11,61,145,0.35)] transition-all hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(11,61,145,0.4)] active:scale-[0.99] md:h-11 md:text-base"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-slate-500 md:mt-5 md:text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-primary transition-colors hover:text-primary/80">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "lecturer" ? "lecturer" : "student";
  const [error, setError] = useState<string | null>(() => {
    const signupError = searchParams.get("error");
    if (signupError === "signup") {
      return "Could not create your account. Please try again.";
    }
    if (signupError === "auth") {
      return "Account verification failed. Please try creating your account again.";
    }
    return null;
  });
  const [role, setRole] = useState<"lecturer" | "student">(defaultRole);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: defaultRole },
  });

  useEffect(() => {
    setValue("role", role);
  }, [role, setValue]);

  async function onSubmit(data: SignupInput) {
    setError(null);

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      return;
    }

    let supabase;
    try {
      supabase = createClient();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication is unavailable.");
      return;
    }

    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role: data.role,
          college_id: data.collegeId,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message || "Could not create your account. Please try again.");
      return;
    }

    const user = signUpData.user;
    if (!user) {
      setError("Account could not be created. Please check your details and try again.");
      return;
    }

    if (signUpData.session) {
      router.refresh();
      const resolvedRole = await resolveClientRoleAfterAuth(supabase);

      if (!resolvedRole) {
        await supabase.auth.signOut();
        setError(
          "Account created but sign-in failed. Please sign in with your new credentials."
        );
        return;
      }

      if (resolvedRole === "student") {
        void fetch("/api/attendance/device/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(getAttendanceDeviceIdentity()),
        });
      }

      redirectAfterAuth(resolvedRole);
      return;
    }

    router.push("/login?message=confirm-email");
  }

  return (
    <div className="auth-fade-in auth-fade-in-delay-1 w-full">
      <div className="auth-form-header mb-2 text-center md:mb-4 md:text-left">
        <h2 className="text-balance text-lg font-bold tracking-tight text-slate-900 md:text-xl lg:text-2xl">
          Create Your Account
        </h2>
        <p className="auth-form-marketing-copy mt-1 text-sm text-slate-500">
          Welcome to Lectrax. Create your account and start managing academic activities efficiently.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5 text-left md:space-y-3">
        <div className="space-y-1.5">
          <Label className={authLabelClass}>Account type</Label>
          <Select
            value={role}
            onValueChange={(v) => {
              setRole(v as "lecturer" | "student");
              setValue("role", v as "lecturer" | "student");
            }}
          >
            <SelectTrigger className={authInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lecturer">Lecturer / Teacher</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" {...register("role")} />
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className={authLabelClass}>
              Full Name
            </Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              className={authInputClass}
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className={authLabelClass}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your Email"
              className={authInputClass}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        {role === "student" && (
          <div className="space-y-1.5">
            <Label htmlFor="collegeId" className={authLabelClass}>
              College ID <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="collegeId"
              placeholder="Your student ID"
              className={authInputClass}
              {...register("collegeId")}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password" className={authLabelClass}>
              Password
            </Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              className={authInputClass}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className={authLabelClass}>
              Confirm Password
            </Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm your password"
              className={authInputClass}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="auth-primary-btn h-10 w-full rounded-xl bg-primary text-sm font-semibold text-white shadow-[0_4px_14px_rgba(11,61,145,0.35)] transition-all hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(11,61,145,0.4)] active:scale-[0.99] md:h-11 md:text-base"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-slate-500 md:mt-5 md:text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary transition-colors hover:text-primary/80">
          Sign In
        </Link>
      </p>
    </div>
  );
}
