import { appFetch } from "@/lib/api/client-fetch";
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  passwordChangeSchema,
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { createClient } from "@/lib/supabase/client";
import type { ProfileSettingsInitial } from "@/lib/settings/profile-settings-initial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";
import { User, Phone, GraduationCap, CreditCard, Lock } from "lucide-react";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { studentDashboardCardClass } from "@/components/student/student-dashboard-styles";
import { cn } from "@/lib/utils";

export function ProfileSettings({
  role,
  initialProfile,
}: {
  role: "student" | "lecturer";
  initialProfile: ProfileSettingsInitial;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: initialProfile.full_name,
      phone: initialProfile.phone ?? "",
      collegeId: initialProfile.college_id ?? "",
    },
  });

  const {
    register: registerPw,
    handleSubmit: handleSubmitPw,
    reset: resetPw,
    formState: { errors: pwErrors, isSubmitting: pwSubmitting },
  } = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(passwordChangeSchema),
  });

  async function onSaveProfile(data: ProfileUpdateInput) {
    setProfileError(null);
    setProfileSaved(false);

    const res = await appFetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fullName: data.fullName,
        phone: data.phone,
        collegeId: role === "student" ? data.collegeId : undefined,
      }),
    });

    const result = (await res.json()) as {
      error?: string;
      profile?: ProfileSettingsInitial;
    };

    if (!res.ok || !result.profile) {
      setProfileError(result.error ?? "Could not save profile. Please try again.");
      return;
    }

    setProfile(result.profile);
    reset({
      fullName: result.profile.full_name,
      phone: result.profile.phone ?? "",
      collegeId: result.profile.college_id ?? "",
    });

    router.refresh();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  async function onChangePassword(data: { password: string; confirmPassword: string }) {
    setPasswordError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      setPasswordError(sanitizeErrorMessage(error.message));
      return;
    }
    resetPw();
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 3000);
  }

  const portalCardClass =
    role === "student" ? studentDashboardCardClass : lecturerPortalCardClass;

  return (
    <div
      className={cn(
        "mx-auto max-w-2xl space-y-6",
        role === "lecturer" && "lecturer-stagger"
      )}
    >
      <Card className={portalCardClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-accent" />
            Profile
          </CardTitle>
          <CardDescription>
            {role === "student"
              ? "Your college ID syncs automatically to every class you join."
              : "Update your account details visible to students and the platform."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge>{ROLE_LABELS[profile?.role as UserRole] ?? role}</Badge>
            </div>

            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone (optional)
              </Label>
              <Input id="phone" type="tel" {...register("phone")} placeholder="+232 XX XXX XXXX" />
            </div>

            {role === "student" && (
              <div>
                <Label htmlFor="collegeId" className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" /> College ID (optional)
                </Label>
                <Input
                  id="collegeId"
                  {...register("collegeId")}
                  placeholder="e.g. STU/2024/001"
                  className="font-mono"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Shown on your lecturer&apos;s attendance and grading tables.
                </p>
              </div>
            )}

            {profileError && <p className="text-sm text-destructive">{profileError}</p>}

            {profileSaved && (
              <p className="text-sm font-medium text-accent">Profile saved successfully.</p>
            )}

            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {role === "lecturer" && (
        <Card className={portalCardClass}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
              Subscription
            </CardTitle>
            <CardDescription>Manage your Lectrax Premium plan and billing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/lecturer/subscription">Go to subscription</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className={portalCardClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-accent" />
            Password
          </CardTitle>
          <CardDescription>Change your sign-in password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPw(onChangePassword)} className="space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" {...registerPw("password")} />
              {pwErrors.password && (
                <p className="text-sm text-destructive">{pwErrors.password.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" {...registerPw("confirmPassword")} />
              {pwErrors.confirmPassword && (
                <p className="text-sm text-destructive">{pwErrors.confirmPassword.message}</p>
              )}
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSaved && (
              <p className="text-sm font-medium text-accent">Password updated successfully.</p>
            )}
            <Button type="submit" variant="outline" disabled={pwSubmitting}>
              {pwSubmitting ? "Updating..." : "Update password"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Forgot your password?{" "}
            <Link href="/forgot-password" className="text-primary hover:underline">
              Reset via email
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card className={cn("border-muted bg-slate-50", portalCardClass)}>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          <p>Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
