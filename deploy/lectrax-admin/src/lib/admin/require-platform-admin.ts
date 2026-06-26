import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getRoleForUserSafe } from "@/lib/auth/get-role";
import { getCachedAuthUser } from "@/lib/auth/session";
import { apiServiceUnavailableResponse } from "@/lib/errors/api";

export async function requirePlatformAdmin() {
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

  if (roleResult.status !== "ok" || roleResult.role !== "platform_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, service, user: auth.user, userId: auth.user.id };
}
