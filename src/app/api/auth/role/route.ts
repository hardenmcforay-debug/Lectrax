import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getRoleForUserSafe } from "@/lib/auth/get-role";
import { getCachedAuthUser } from "@/lib/auth/session";
import { apiServiceUnavailableResponse, apiUnauthorizedResponse } from "@/lib/errors/api";

export async function GET() {
  const auth = await getCachedAuthUser();

  if (auth.status === "service_unavailable") {
    return apiServiceUnavailableResponse();
  }

  if (auth.status === "unauthenticated") {
    return apiUnauthorizedResponse();
  }

  const service = await createServiceClient();
  const supabase = await createClient();
  const roleResult = await getRoleForUserSafe(supabase, auth.user, service);

  if (roleResult.status === "service_unavailable") {
    return apiServiceUnavailableResponse();
  }

  if (roleResult.status === "no_role") {
    return NextResponse.json(
      { role: null, error: "No role assigned to this account. Ensure profiles.role is set." },
      { status: 403 }
    );
  }

  return NextResponse.json({ role: roleResult.role, userId: auth.user.id });
}
