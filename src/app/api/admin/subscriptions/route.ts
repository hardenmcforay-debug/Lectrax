import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  adminActivatePremium,
  adminExtendPremium,
  revokePremiumSubscription,
} from "@/lib/subscription/lifecycle";
import type { BillingPlan } from "@/types/database";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

const activateSchema = z.object({
  lecturerId: z.string().uuid(),
  billingPlan: z.enum(["monthly", "semester", "annual"]).default("monthly"),
});

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const subscription = await adminActivatePremium({
      lecturerId: parsed.data.lecturerId,
      billingPlan: parsed.data.billingPlan as BillingPlan,
      actorId: auth.userId,
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    const message = sanitizeErrorMessage(
      error instanceof Error ? error.message : "Failed to activate subscription"
    );
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

const extendSchema = z.object({
  lecturerId: z.string().uuid(),
  days: z.coerce.number().min(1).max(730).default(30),
});

export async function PATCH(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = extendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const subscription = await adminExtendPremium({
    lecturerId: parsed.data.lecturerId,
    days: parsed.data.days,
    actorId: auth.userId,
  });

  return NextResponse.json({ success: true, subscription });
}

const revokeSchema = z.object({
  lecturerId: z.string().uuid(),
});

export async function DELETE(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await revokePremiumSubscription(parsed.data.lecturerId, auth.userId);
  return NextResponse.json({ success: true });
}
