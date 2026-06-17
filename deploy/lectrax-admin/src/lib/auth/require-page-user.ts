import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getCachedAuthUser } from "@/lib/auth/session";
import { ServiceUnavailableError } from "@/lib/errors/service-unavailable";

export { ServiceUnavailableError };

/** Redirects only on definitive auth failure; throws on transient outages. */
export async function requireAuthenticatedUser(): Promise<User> {
  const auth = await getCachedAuthUser();

  if (auth.status === "authenticated") {
    return auth.user;
  }

  if (auth.status === "unauthenticated") {
    redirect("/login");
  }

  throw new ServiceUnavailableError();
}
