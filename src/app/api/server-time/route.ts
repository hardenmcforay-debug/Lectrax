import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiObservability } from "@/lib/observability/with-api-observability";


/** Returns the trusted database server time for deadline comparisons. */
async function getHandler() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_server_time");

  if (error || typeof data !== "string") {
    return NextResponse.json({ serverTime: new Date().toISOString() });
  }

  return NextResponse.json({ serverTime: data });
}

export const GET = withApiObservability("server-time.get", getHandler);
