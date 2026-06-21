import { appFetch } from "@/lib/api/client-fetch";
import { isEmailIdentifier } from "@/lib/auth/phone-number";

type ResolveLoginResponse = {
  email?: string;
  error?: string;
};

export async function resolveLoginEmailForAuth(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (isEmailIdentifier(trimmed)) {
    return trimmed.toLowerCase();
  }

  const response = await appFetch("/api/auth/resolve-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: trimmed }),
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json().catch(() => null)) as ResolveLoginResponse | null;
  return body?.email?.trim().toLowerCase() ?? null;
}
