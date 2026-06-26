import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId?: string;
  classSessionId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    class_session_id: params.classSessionId ?? null,
    metadata: params.metadata ?? {},
  });
}

/** Machine-auth audit entries (webhooks, cron) via service role. */
export async function logSystemAudit(params: {
  action: string;
  entityType: string;
  entityId?: string;
  classSessionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const service = await createServiceClient();
  const { error } = await service.from("audit_logs").insert({
    actor_id: null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    class_session_id: params.classSessionId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("system_audit_insert_failed", params.action, error.message);
  }
}
