import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getRoleForUserSafe } from "@/lib/auth/get-role";
import { getCachedAuthUser } from "@/lib/auth/session";
import { apiServiceUnavailableResponse } from "@/lib/errors/api";
import type { UserRole } from "@/types/database";

type ApiRoleGuardSuccess = {
  error?: undefined;
  user: User;
  userId: string;
  supabase: SupabaseClient;
  service: SupabaseClient;
};

type ApiRoleGuardFailure = {
  error: NextResponse;
};

async function requireApiRole(
  requiredRole: UserRole
): Promise<ApiRoleGuardSuccess | ApiRoleGuardFailure> {
  const auth = await getCachedAuthUser();

  if (auth.status === "service_unavailable") {
    return { error: apiServiceUnavailableResponse() };
  }

  if (auth.status === "unauthenticated") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const service = await createServiceClient();
  const supabase = await createClient();
  const roleResult = await getRoleForUserSafe(supabase, auth.user, service);

  if (roleResult.status === "service_unavailable") {
    return { error: apiServiceUnavailableResponse() };
  }

  if (roleResult.status !== "ok" || roleResult.role !== requiredRole) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: auth.user, userId: auth.user.id, supabase, service };
}

export async function requireStudentRole() {
  return requireApiRole("student");
}

export async function requireLecturerRole() {
  return requireApiRole("lecturer");
}

export async function requireAuthenticatedUser(): Promise<
  ApiRoleGuardSuccess | ApiRoleGuardFailure
> {
  const auth = await getCachedAuthUser();

  if (auth.status === "service_unavailable") {
    return { error: apiServiceUnavailableResponse() };
  }

  if (auth.status === "unauthenticated") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const service = await createServiceClient();
  const supabase = await createClient();

  return { user: auth.user, userId: auth.user.id, supabase, service };
}
