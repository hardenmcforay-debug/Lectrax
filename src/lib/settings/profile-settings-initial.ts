import type { Profile } from "@/types/database";

export type ProfileSettingsInitial = Pick<
  Profile,
  "id" | "full_name" | "phone" | "college_id" | "role" | "email" | "created_at"
>;

export function buildProfileSettingsInitial(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  role: "student" | "lecturer",
  profile: Profile | null
): ProfileSettingsInitial {
  if (profile) {
    return {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      college_id: profile.college_id,
      role: profile.role,
      email: profile.email,
      created_at: profile.created_at,
    };
  }

  return {
    id: user.id,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
    phone: null,
    college_id: null,
    role,
    email: user.email ?? "",
    created_at: new Date().toISOString(),
  };
}
