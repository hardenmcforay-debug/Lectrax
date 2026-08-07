import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { logServerError } from "@/lib/errors/logger";
import { uuidField } from "@/lib/security/zod-helpers";
import { withApiObservability } from "@/lib/observability/with-api-observability";

const PARTNERSHIP_NOTIFICATION_TYPES = [
  "partnership_inquiry",
  "partnership_payment",
] as const;

const markReadSchema = z
  .object({
    ids: z.array(uuidField()).max(200).optional(),
    types: z.array(z.enum(PARTNERSHIP_NOTIFICATION_TYPES)).max(10).optional(),
  })
  .refine((value) => Boolean(value.ids?.length || value.types?.length), {
    error: "Provide ids or types",
  });

async function postHandler(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let query = auth.service
    .from("platform_admin_notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (parsed.data.ids?.length) {
    query = query.in("id", parsed.data.ids);
  }

  if (parsed.data.types?.length) {
    query = query.in("type", parsed.data.types);
  }

  const { data, error } = await query.select("id");

  if (error) {
    logServerError("admin.notifications.mark_read", error);
    return NextResponse.json({ error: "Could not mark notifications as read" }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: data?.length ?? 0 });
}

export const POST = withApiObservability("admin.notifications.mark-read.post", postHandler);
