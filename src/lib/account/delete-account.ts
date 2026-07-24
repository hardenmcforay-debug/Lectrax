import "server-only";

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ASSIGNMENT_SUBMISSIONS_BUCKET } from "@/lib/assignments/storage";
import {
  ACCOUNT_DELETE_CONFIRMATION_PHRASE,
} from "@/lib/account/delete-account-constants";
import { logSystemAudit } from "@/lib/audit";
import { getRoleForUserSafe } from "@/lib/auth/get-role";
import { getPublicSupabaseEnv } from "@/lib/env";
import { logServerError } from "@/lib/errors/logger";
import type { UserRole } from "@/types/database";

export { ACCOUNT_DELETE_CONFIRMATION_PHRASE } from "@/lib/account/delete-account-constants";

const deletingUsers = new Set<string>();

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function anonymizeLabel(fullName: string | null | undefined, collegeId: string | null | undefined): string {
  const name = fullName?.trim();
  const id = collegeId?.trim();
  if (name && id) return `Former student (${id})`;
  if (name) return "Former student";
  if (id) return `Former student (${id})`;
  return "Former student";
}

/** Re-authenticate with password before destructive account deletion. */
export async function verifyAccountPassword(params: {
  authEmail: string;
  password: string;
  expectedUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { url, anonKey } = getPublicSupabaseEnv();

  const verifier = createSupabaseJsClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await verifier.auth.signInWithPassword({
    email: params.authEmail,
    password: params.password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Incorrect password. Please try again." };
  }

  if (data.user.id !== params.expectedUserId) {
    return { ok: false, error: "Password verification failed." };
  }

  // Discard the verifier session; the caller's cookie session remains authoritative.
  await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);

  return { ok: true };
}

async function removeStoragePaths(
  service: SupabaseClient,
  paths: string[]
): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  const chunkSize = 50;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { error } = await service.storage.from(ASSIGNMENT_SUBMISSIONS_BUCKET).remove(chunk);
    if (error) {
      logServerError("account_delete.storage_remove", {
        message: error.message,
        count: chunk.length,
      });
    }
  }
}

async function cleanupStudentOwnedData(
  service: SupabaseClient,
  userId: string,
  profile: { full_name: string | null; college_id: string | null }
): Promise<void> {
  const label = anonymizeLabel(profile.full_name, profile.college_id);

  // Preserve academic enrollment history with an anonymized label.
  await service
    .from("enrollments")
    .update({ former_student_label: label })
    .eq("student_id", userId);

  const { data: submissions } = await service
    .from("assignment_submissions")
    .select("id, storage_path")
    .eq("student_id", userId);

  const paths = (submissions ?? [])
    .map((row) => row.storage_path)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  await removeStoragePaths(service, paths);

  if (submissions && submissions.length > 0) {
    await service
      .from("assignment_submissions")
      .update({
        storage_path: null,
        file_name: "deleted.pdf",
        file_size: 0,
      })
      .eq("student_id", userId);
  }

  await service.from("device_registrations").delete().eq("student_id", userId);
  await service.from("student_notifications").delete().eq("student_id", userId);
  await service.from("attendance_device_transfers").delete().eq("student_id", userId);
}

async function cleanupLecturerOwnedData(
  service: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { count, error } = await service
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("lecturer_id", userId);

  if (error) {
    logServerError("account_delete.lecturer_sessions_check", error);
    return {
      ok: false,
      status: 500,
      error: "Could not verify class sessions before deletion.",
    };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      status: 409,
      error:
        "Delete or transfer all class sessions before deleting your lecturer account. This protects enrolled students’ academic records.",
    };
  }

  // Personal lecturer notifications / subscription rows cascade with profile.
  await service.from("subscription_notifications").delete().eq("lecturer_id", userId);

  return { ok: true };
}

/**
 * Permanently delete the authenticated user's account after password confirmation.
 * Academic records for students are retained with anonymized identity where required.
 */
export async function deleteUserAccount(params: {
  user: User;
  service: SupabaseClient;
  userClient: SupabaseClient;
  password: string;
  confirmationPhrase: string;
}): Promise<DeleteAccountResult> {
  const { user, service, password, confirmationPhrase } = params;

  if (confirmationPhrase.trim().toUpperCase() !== ACCOUNT_DELETE_CONFIRMATION_PHRASE) {
    return {
      ok: false,
      status: 400,
      error: `Type ${ACCOUNT_DELETE_CONFIRMATION_PHRASE} to confirm account deletion.`,
    };
  }

  if (!password || password.length < 1) {
    return { ok: false, status: 400, error: "Password is required to delete your account." };
  }

  if (deletingUsers.has(user.id)) {
    return {
      ok: false,
      status: 409,
      error: "Account deletion is already in progress.",
    };
  }

  const roleResult = await getRoleForUserSafe(params.userClient, user, service);
  if (roleResult.status === "service_unavailable") {
    return {
      ok: false,
      status: 503,
      error: "Service temporarily unavailable. Please try again.",
    };
  }

  if (roleResult.status !== "ok") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const role = roleResult.role as UserRole;
  if (role === "platform_admin") {
    return {
      ok: false,
      status: 403,
      error: "Platform admin accounts cannot be self-deleted from the app.",
    };
  }

  const authEmail = user.email?.trim();
  if (!authEmail) {
    return {
      ok: false,
      status: 400,
      error: "Your account is missing a sign-in email. Contact support to delete this account.",
    };
  }

  const passwordCheck = await verifyAccountPassword({
    authEmail,
    password,
    expectedUserId: user.id,
  });
  if (!passwordCheck.ok) {
    return { ok: false, status: 401, error: passwordCheck.error };
  }

  deletingUsers.add(user.id);

  try {
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("id, full_name, college_id, role, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return { ok: false, status: 404, error: "Profile not found." };
    }

    if (role === "lecturer") {
      const lecturerGate = await cleanupLecturerOwnedData(service, user.id);
      if (!lecturerGate.ok) return lecturerGate;
    }

    if (role === "student") {
      await cleanupStudentOwnedData(service, user.id, {
        full_name: profile.full_name,
        college_id: profile.college_id,
      });
    }

    // Audit without retaining contact PII.
    await logSystemAudit({
      action: "account_deleted",
      entityType: "profile",
      entityId: user.id,
      metadata: {
        role,
        hadCollegeId: Boolean(profile.college_id),
        hadPhone: Boolean(profile.phone),
        deletedAt: new Date().toISOString(),
      },
    });

    const { error: deleteAuthError } = await service.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      logServerError("account_delete.auth_delete", deleteAuthError);
      return {
        ok: false,
        status: 500,
        error: "Could not delete authentication account. Please try again or contact support.",
      };
    }

    return { ok: true };
  } catch (error) {
    logServerError("account_delete.unexpected", error);
    return {
      ok: false,
      status: 500,
      error: "Account deletion failed unexpectedly. Please try again.",
    };
  } finally {
    deletingUsers.delete(user.id);
  }
}
