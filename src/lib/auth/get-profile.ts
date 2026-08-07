import { createClient } from "@/lib/supabase/server";
import { PROFILE_COLUMNS } from "@/lib/auth/profile-columns";
import type { Profile } from "@/types/database";

/** Load a profile by user id (server-only, own-profile read via RLS). Caller must verify auth first. */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}
