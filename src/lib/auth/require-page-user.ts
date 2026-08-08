import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getCachedAuthUser } from "@/lib/auth/session";
import { ServiceUnavailableError } from "@/lib/errors/service-unavailable";
import { toPwaScopePath } from "@/lib/pwa/scope";

export { ServiceUnavailableError };

/** Redirects only on definitive auth failure; throws on transient outages. */
export async function requireAuthenticatedUser(): Promise<User> {
  const auth = await getCachedAuthUser();

  if (auth.status === "authenticated") {
    return auth.user;
  }

  if (auth.status === "unauthenticated") {
    const pwaScoped = (await headers()).get("x-lectrax-pwa-scoped") === "1";
    redirect(pwaScoped ? toPwaScopePath("/login") : "/login");
  }

  throw new ServiceUnavailableError();
}
