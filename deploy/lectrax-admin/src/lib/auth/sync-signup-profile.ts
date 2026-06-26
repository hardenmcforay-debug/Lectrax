import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getRoleFromUser } from "@/lib/auth/roles";

function readCollegeIdFromMetadata(metadata: User["user_metadata"] | undefined): string | null {
  const raw = metadata?.college_id;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPhoneFromMetadata(metadata: User["user_metadata"] | undefined): string | null {
  const raw = metadata?.phone;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Fill profile fields from signup metadata when the DB trigger did not persist them yet. */
export async function syncStudentCollegeIdFromSignupMetadata(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const role = getRoleFromUser(user);
  const phone = readPhoneFromMetadata(user.user_metadata);

  if (role === "student") {
    const collegeId = readCollegeIdFromMetadata(user.user_metadata);
    if (collegeId) {
      await supabase
        .from("profiles")
        .update({ college_id: collegeId })
        .eq("id", user.id)
        .is("college_id", null);
    }
  }

  if (phone) {
    await supabase.from("profiles").update({ phone }).eq("id", user.id).is("phone", null);
  }
}
