import { createServiceClient } from "@/lib/supabase/server";

/** Platform admin audit entries with insert failure logging. */
export async function logPlatformAdminAudit(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const service = await createServiceClient();
  const { error } = await service.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("platform_admin_audit_insert_failed", params.action, error.message);
  }
}
