import type { Profile } from "@/types/database";
import {
  canEditRecoveryEmail,
  getRecoveryEmailDisplay,
} from "@/lib/auth/phone-number";

export type ProfileSettingsInitial = Pick<
  Profile,
  "id" | "full_name" | "phone" | "college_id" | "role" | "email" | "created_at"
> & {
  recoveryEmail: string;
  recoveryEmailEditable: boolean;
};

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
      recoveryEmail: getRecoveryEmailDisplay(profile.email),
      recoveryEmailEditable: canEditRecoveryEmail({
        authEmail: user.email,
        profilePhone: profile.phone,
        userMetadata: user.user_metadata,
      }),
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
    recoveryEmail: getRecoveryEmailDisplay(user.email),
    recoveryEmailEditable: canEditRecoveryEmail({
      authEmail: user.email,
      profilePhone: null,
      userMetadata: user.user_metadata,
    }),
  };
}
