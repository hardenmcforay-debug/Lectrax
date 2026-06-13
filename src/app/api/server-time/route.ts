import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Returns the trusted database server time for deadline comparisons. */
export async function GET() {
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
