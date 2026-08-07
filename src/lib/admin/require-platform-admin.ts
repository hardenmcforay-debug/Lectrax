import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getRoleForUserSafe } from "@/lib/auth/get-role";
import { getCachedAuthUser } from "@/lib/auth/session";
import { apiServiceUnavailableResponse } from "@/lib/errors/api";
import { rejectIfUserRateLimited } from "@/lib/security/enforce-rate-limit";
import { bindObservabilityUser } from "@/lib/observability/request-store";

export async function requirePlatformAdmin() {
  const auth = await getCachedAuthUser();

  if (auth.status === "service_unavailable") {
    return { error: apiServiceUnavailableResponse() };
  }

  if (auth.status === "unauthenticated") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = await createClient();
  const roleResult = await getRoleForUserSafe(supabase, auth.user);

  if (roleResult.status === "service_unavailable") {
    return { error: apiServiceUnavailableResponse() };
  }

  if (roleResult.status !== "ok" || roleResult.role !== "platform_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const rateLimited = await rejectIfUserRateLimited(
    auth.user.id,
    "adminMutationPerUser",
    "admin.mutation"
  );
  if (rateLimited) return { error: rateLimited };

  bindObservabilityUser(auth.user.id);
  // Service retained for admin mutation callers that still bypass RLS.
  const service = await createServiceClient();
  return { supabase, service, user: auth.user, userId: auth.user.id };
}
