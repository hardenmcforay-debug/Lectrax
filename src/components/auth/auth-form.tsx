"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { IdCard, Lock, Mail, Phone, User, UsersRound } from "lucide-react";
import { createClient, getSupabaseConfigError } from "@/lib/supabase/client";
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from "@/lib/validations";
import { buildPhoneAuthEmail, parseSignupIdentifier } from "@/lib/auth/phone-number";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeferredSelect } from "@/components/shared/deferred-select";
import {
  AuthCard,
  AuthFieldIcon,
  authCardButtonClass,
  authCardInputClass,
  authCardLabelClass,
  authCardLinkClass,
} from "@/components/auth/auth-card";
import {
  getPlatformAdminMainAppLoginDeniedMessage,
} from "@/lib/auth/admin-deployment";
import { redirectAfterAuth } from "@/lib/auth/roles";
import { resolveClientRoleAfterAuth } from "@/lib/auth/resolve-client-role";
import { syncStudentCollegeIdFromSignupMetadata } from "@/lib/auth/sync-signup-profile";
import { getAttendanceDeviceIdentity } from "@/lib/attendance/device-identity";
import { AuthErrorNotice } from "@/components/auth/auth-error-notice";
import type { AuthUserMessage } from "@/lib/errors/auth-messages";
import { mapAuthError, mapSupabaseAuthError } from "@/lib/errors/map-auth-error";
import { getAuthNetworkMessage } from "@/lib/errors/auth-messages";
import { sanitizeQueryParam } from "@/lib/security/sanitize";
import { REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY } from "@/lib/security/client-storage";
import { clearClientStorageAfterAuthReset } from "@/lib/auth/client-sign-out";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils";

function toAuthMessage(title: string, description: string, retryable = false): AuthUserMessage {
  return { title, description, retryable };
}

export function LoginForm({ adminOnly = false }: { adminOnly?: boolean } = {}) {
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberInitialized, setRememberInitialized] = useState(false);
  // Stay disabled after a successful login until the dashboard navigation completes.
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<AuthUserMessage | null>(() => {
    const authError = sanitizeQueryParam(searchParams.get("error"), 20);
    if (authError === "auth") {
      return toAuthMessage(
        "Sign In Failed",
        "Sign in failed. Please check your phone number or email and password."
      );
    }
    if (authError === "admin") {
      return toAuthMessage("Access Denied", getPlatformAdminMainAppLoginDeniedMessage(), false);
    }
    return null;
  });
  const [info, setInfo] = useState<string | null>(() => {
    if (sanitizeQueryParam(searchParams.get("message"), 30) === "confirm-email") {
      return "Account created. Check your email to confirm, then sign in.";
    }
    if (sanitizeQueryParam(searchParams.get("message"), 30) === "account-created") {
      return "Account created. Sign in with your phone number and password.";
    }
    if (sanitizeQueryParam(searchParams.get("message"), 30) === "password-updated") {
      return "Your password has been updated. You can sign in now.";
    }
    return null;
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (hydrated && !rememberInitialized) {
    const savedIdentifier = localStorage.getItem(REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY);
    if (savedIdentifier) {
      setRememberMe(true);
      setValue("identifier", savedIdentifier);
    }
    setRememberInitialized(true);
  }

  async function onSubmit(data: LoginInput) {
    setError(null);
    setInfo(null);

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
      localStorage.setItem(REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY, data.identifier);
    } else {
      localStorage.removeItem(REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY);
    }

    try {
      const loginResponse = await appFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: data.identifier,
          password: data.password,
        }),
      });

      if (loginResponse.status === 429) {
        setError({
          title: "Too Many Requests",
          description: "Too many sign-in attempts. Please wait a few minutes and try again.",
          retryable: true,
        });
        return;
      }

      if (!loginResponse.ok) {
        const body = (await loginResponse.json().catch(() => null)) as { error?: string } | null;
        try {
          const client = createClient();
          await client.auth.signOut();
        } catch {
          // Ignore sign-out errors after a failed login attempt.
        }
        clearClientStorageAfterAuthReset();
        setError(
          toAuthMessage(
            "Sign In Failed",
            body?.error ?? "Sign in failed. Please check your phone number or email and password.",
            false
          )
        );
        return;
      }

      let supabase;
      try {
        supabase = createClient();
      } catch (cause) {
        setError(mapAuthError(cause, "login", "auth.login.createClient"));
        return;
      }

      const { data: authData, error: sessionError } = await supabase.auth.getUser();

      if (sessionError || !authData.user) {
        await supabase.auth.signOut();
        clearClientStorageAfterAuthReset();
        setError(
          toAuthMessage(
            "Sign In Failed",
            "Sign in succeeded but the session could not be established. Please try again.",
            true
          )
        );
        return;
      }

      const user = authData.user;
      if (!user) {
        await supabase.auth.signOut();
        clearClientStorageAfterAuthReset();
        setError(
          toAuthMessage("Sign In Failed", "Sign in failed. Please try again.", true)
        );
        return;
      }

      const { role, networkFailure } = await resolveClientRoleAfterAuth(supabase);

      if (!role) {
        await supabase.auth.signOut();
        clearClientStorageAfterAuthReset();
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
        clearClientStorageAfterAuthReset();
        setError(
          toAuthMessage(
            "Access Denied",
            "This sign-in page is for platform administrators only. Lecturers and students should use the main Lectrax app.",
            false
          )
        );
        return;
      }

      if (!adminOnly && role === "platform_admin") {
        await supabase.auth.signOut();
        clearClientStorageAfterAuthReset();
        setError(
          toAuthMessage("Access Denied", getPlatformAdminMainAppLoginDeniedMessage(), false)
        );
        return;
      }

      setIsRedirecting(true);
      redirectAfterAuth(role, searchParams.get("redirect"));
    } catch (cause) {
      setError(mapAuthError(cause, "login", "auth.login.unhandled"));
    }
  }

  return (
    <div className="auth-fade-in auth-fade-in-delay-1 w-full">
      <div className="auth-form-header mb-5 text-center sm:mb-6">
        <h2 className="text-balance text-xl font-bold tracking-tight text-slate-800 md:text-2xl">
          Welcome Back
        </h2>
        <p className="auth-form-marketing-copy mt-1.5 text-sm text-slate-500">
          Sign in to manage your academic workspace with Lectrax.
        </p>
      </div>

      <AuthCard>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left">
          <div className="space-y-2">
            <Label htmlFor="identifier" className={authCardLabelClass}>
              Phone Number or Email
            </Label>
            <div className="relative">
              <AuthFieldIcon wide>
                <Phone className="h-4 w-4" strokeWidth={1.75} />
                <Mail className="h-4 w-4" strokeWidth={1.75} />
              </AuthFieldIcon>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="Phone number or email address"
                className={cn(authCardInputClass, "pl-[3.75rem]")}
                {...register("identifier")}
              />
            </div>
            {errors.identifier && (
              <p className="text-sm text-destructive">{errors.identifier.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className={authCardLabelClass}>
              Password
            </Label>
            <div className="relative">
              <AuthFieldIcon>
                <Lock className="h-4 w-4" strokeWidth={1.75} />
              </AuthFieldIcon>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className={cn(authCardInputClass, "pl-10")}
                {...register("password")}
              />
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              <span className="text-sm text-slate-600">Remember me</span>
            </label>
            <Link href="/forgot-password" className={cn(authCardLinkClass, "shrink-0 text-sm")}>
              Forgot password?
            </Link>
          </div>

          {info && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</p>
          )}
          {error && <AuthErrorNotice error={error} onRetry={() => setError(null)} />}

          <Button
            type="submit"
            loading={isSubmitting || isRedirecting}
            className={authCardButtonClass}
          >
            {isSubmitting || isRedirecting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className={authCardLinkClass}>
            sign up
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "lecturer" ? "lecturer" : "student";
  // Stay disabled after success until portal / next-page navigation completes.
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<AuthUserMessage | null>(() => {
    const signupError = searchParams.get("error");
    if (signupError === "signup") {
      return toAuthMessage(
        "Request Failed",
        "Could not create your account. Please try again.",
        true
      );
    }
    if (signupError === "auth") {
      return toAuthMessage(
        "Request Failed",
        "Account verification failed. Please try creating your account again.",
        true
      );
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
    setIsRedirecting(false);

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

    try {
      let supabase;
      try {
        supabase = createClient();
      } catch (cause) {
        setError(mapAuthError(cause, "signup", "auth.signup.createClient"));
        return;
      }

      const collegeId = data.collegeId?.trim() || undefined;
      const signupId = parseSignupIdentifier(data.identifier);

      const signupCheck = await appFetch("/api/auth/check-signup-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: data.identifier }),
      });

      if (signupCheck.status === 409) {
        const body = (await signupCheck.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        setError(
          toAuthMessage(
            body?.error ??
              (signupId.type === "phone"
                ? "Phone Number Already Registered"
                : "Email Already Registered"),
            body?.message ??
              (signupId.type === "phone"
                ? "An account already exists with this phone number. Sign in instead."
                : "An account already exists with this email address. Sign in instead."),
            false
          )
        );
        return;
      }

      if (!signupCheck.ok) {
        const body = (await signupCheck.json().catch(() => null)) as { error?: string } | null;
        setError(
          toAuthMessage(
            "Request Failed",
            body?.error ?? "Could not verify your details. Please try again.",
            true
          )
        );
        return;
      }

      const authEmail =
        signupId.type === "email" ? signupId.email : buildPhoneAuthEmail(signupId.phone);
      const signupPhone = signupId.type === "phone" ? signupId.phone : null;
      const contactEmail = signupId.type === "email" ? signupId.email : null;

      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: authEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: data.role,
            college_id: collegeId,
            phone: signupPhone,
            contact_email: contactEmail,
            signup_method: signupId.type,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        const alreadyRegistered = /user already registered/i.test(authError.message);
        if (alreadyRegistered) {
          setError(
            toAuthMessage(
              signupId.type === "phone"
                ? "Phone Number Already Registered"
                : "Email Already Registered",
              signupId.type === "phone"
                ? "An account already exists with this phone number. Sign in with your phone number and password."
                : "An account already exists with this email address. Sign in instead.",
              false
            )
          );
          return;
        }

        setError(
          mapSupabaseAuthError(authError, "signup", "auth.signup.signUp") ?? {
            title: "Request Failed",
            description: "Could not create your account. Please try again.",
            retryable: true,
          }
        );
        return;
      }

      const user = signUpData.user;
      if (!user) {
        setError(
          toAuthMessage(
            "Request Failed",
            "Account could not be created. Please check your details and try again.",
            true
          )
        );
        return;
      }

      if (signupId.type === "phone") {
        await appFetch("/api/auth/finalize-phone-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, phoneNumber: signupId.phone }),
        }).catch(() => {
          // Login will retry activation for phone-only accounts.
        });
      }

      if (signUpData.session) {
        await syncStudentCollegeIdFromSignupMetadata(supabase, user);
        const { role: resolvedRole, networkFailure } = await resolveClientRoleAfterAuth(supabase);

        if (!resolvedRole) {
          await supabase.auth.signOut();
        clearClientStorageAfterAuthReset();
          setError(
            networkFailure
              ? getAuthNetworkMessage("session")
              : toAuthMessage(
                  "Request Failed",
                  "Account created but sign-in failed. Please sign in with your new credentials.",
                  true
                )
          );
          return;
        }

        if (resolvedRole === "student") {
          void appFetch("/api/attendance/device/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(getAttendanceDeviceIdentity()),
          }).catch(() => {
            // Device registration is best-effort after signup.
          });
        }

        setIsRedirecting(true);
        redirectAfterAuth(resolvedRole);
        return;
      }

      setIsRedirecting(true);
      router.push(
        signupId.type === "email"
          ? "/login?message=confirm-email"
          : "/login?message=account-created"
      );
    } catch (cause) {
      setIsRedirecting(false);
      setError(mapAuthError(cause, "signup", "auth.signup.unhandled"));
    }
  }

  return (
    <div className="auth-fade-in auth-fade-in-delay-1 w-full">
      <AuthCard>
        <div className="auth-form-header mb-6 text-center">
          <h2 className="text-balance text-xl font-bold tracking-tight text-slate-800 md:text-2xl">
            Create Your Account
          </h2>
          <p className="auth-form-marketing-copy mt-1.5 text-sm text-slate-500">
            Welcome to Lectrax. Create your account and start managing academic activities efficiently.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left">
          <div className="space-y-2">
            <Label className={authCardLabelClass}>Account type</Label>
            <div className="relative">
              <AuthFieldIcon>
                <UsersRound className="h-4 w-4" strokeWidth={1.75} />
              </AuthFieldIcon>
              <DeferredSelect
                placeholderLabel={role === "student" ? "Student" : "Lecturer / Teacher"}
                triggerClassName={cn(authCardInputClass, "pl-10")}
              >
                <Select
                  value={role}
                  onValueChange={(v) => {
                    setRole(v as "lecturer" | "student");
                    setValue("role", v as "lecturer" | "student");
                  }}
                >
                  <SelectTrigger className={cn(authCardInputClass, "pl-10")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecturer">Lecturer / Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </DeferredSelect>
            </div>
            <input type="hidden" {...register("role")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className={authCardLabelClass}>
              Full Name
            </Label>
            <div className="relative">
              <AuthFieldIcon>
                <User className="h-4 w-4" strokeWidth={1.75} />
              </AuthFieldIcon>
              <Input
                id="fullName"
                placeholder="John Doe"
                className={cn(authCardInputClass, "pl-10")}
                {...register("fullName")}
              />
            </div>
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="identifier" className={authCardLabelClass}>
              Phone Number or Email
            </Label>
            <div className="relative">
              <AuthFieldIcon wide>
                <Phone className="h-4 w-4" strokeWidth={1.75} />
                <Mail className="h-4 w-4" strokeWidth={1.75} />
              </AuthFieldIcon>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="+232 7612 **** or john@example.com"
                className={cn(authCardInputClass, "pl-[3.75rem]")}
                {...register("identifier")}
              />
            </div>
            {errors.identifier && (
              <p className="text-sm text-destructive">{errors.identifier.message}</p>
            )}
          </div>

          {role === "student" && (
            <div className="space-y-2">
              <Label htmlFor="collegeId" className={authCardLabelClass}>
                Student ID <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <div className="relative">
                <AuthFieldIcon>
                  <IdCard className="h-4 w-4" strokeWidth={1.75} />
                </AuthFieldIcon>
                <Input
                  id="collegeId"
                  placeholder="Your student ID"
                  className={cn(authCardInputClass, "pl-10")}
                  {...register("collegeId")}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className={authCardLabelClass}>
              Password
            </Label>
            <div className="relative">
              <AuthFieldIcon>
                <Lock className="h-4 w-4" strokeWidth={1.75} />
              </AuthFieldIcon>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                className={cn(authCardInputClass, "pl-10")}
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className={authCardLabelClass}>
              Confirm Password
            </Label>
            <div className="relative">
              <AuthFieldIcon>
                <Lock className="h-4 w-4" strokeWidth={1.75} />
              </AuthFieldIcon>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm your password"
                className={cn(authCardInputClass, "pl-10")}
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
            <p className="text-xs text-slate-400">Must be at least 8 characters</p>
          </div>

          {error && <AuthErrorNotice error={error} onRetry={() => setError(null)} />}

          <Button
            type="submit"
            loading={isSubmitting || isRedirecting}
            className={authCardButtonClass}
          >
            {isSubmitting || isRedirecting ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className={authCardLinkClass}>
            Sign In
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
