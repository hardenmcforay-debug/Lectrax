type NameSource = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type ProfileNameSource = {
  full_name?: string | null;
  email?: string | null;
};

function trimName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function emailLocalPart(email?: string | null): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : null;
}

/** Resolve a user's display name from profile, auth metadata, or email. */
export function getDisplayName(
  user?: NameSource | null,
  profile?: ProfileNameSource | null,
  fallback = "Student"
): string {
  return (
    trimName(profile?.full_name) ??
    trimName(user?.user_metadata?.full_name) ??
    emailLocalPart(profile?.email) ??
    emailLocalPart(user?.email) ??
    fallback
  );
}
