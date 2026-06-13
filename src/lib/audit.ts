import { createClient } from "@/lib/supabase/server";

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
