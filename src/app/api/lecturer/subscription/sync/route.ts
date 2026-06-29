import { NextResponse } from "next/server";
import { requireLecturerRole } from "@/lib/auth/require-api-role";
import { backfillMissingSubscriptionRecordsForLecturer } from "@/lib/subscription/lifecycle";
import { handleApiRouteError } from "@/lib/errors/api";
import { rejectIfUserRateLimited } from "@/lib/security/enforce-rate-limit";

/** Repairs missing subscription history rows for the signed-in lecturer only. */
export async function POST() {
  const auth = await requireLecturerRole();
  if (auth.error) return auth.error;

  const rateLimited = rejectIfUserRateLimited(
    auth.userId,
    "subscriptionSync",
    "subscription.sync"
  );
  if (rateLimited) return rateLimited;

  try {
    const backfilled = await backfillMissingSubscriptionRecordsForLecturer(
      auth.userId,
      auth.service
    );
    return NextResponse.json({ ok: true, backfilled });
  } catch (error) {
    return handleApiRouteError("subscription.sync", error);
  }
}
