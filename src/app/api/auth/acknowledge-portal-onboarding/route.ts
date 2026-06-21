import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PORTAL_ONBOARDING_ACKNOWLEDGED_KEY } from "@/lib/auth/signup-method";
import { logServerError } from "@/lib/errors/logger";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = user.user_metadata ?? {};
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        [PORTAL_ONBOARDING_ACKNOWLEDGED_KEY]: new Date().toISOString(),
      },
    });

    if (updateError) {
      logServerError("auth.portalOnboarding.acknowledge", updateError);
      return NextResponse.json(
        { error: "Could not save your confirmation. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("auth.portalOnboarding.unhandled", error);
    return NextResponse.json({ error: "Could not save your confirmation." }, { status: 500 });
  }
}
