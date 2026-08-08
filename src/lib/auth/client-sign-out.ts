import { createClient } from "@/lib/supabase/client";
import { getClientAuthEntryPath } from "@/lib/pwa/config";
import { clearSensitiveClientStorage } from "@/lib/security/client-storage";
import { useAuthStore } from "@/store/auth-store";

function resetInMemoryAuthState(): void {
  useAuthStore.getState().setProfile(null);
  useAuthStore.getState().setLoading(false);
}

/** Sign out, purge client caches, and hard-navigate so protected pages cannot remain in history. */
export async function signOutAndClearClientStorage(options?: {
  redirectTo?: string | null;
}): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  clearSensitiveClientStorage();
  resetInMemoryAuthState();

  if (options?.redirectTo !== null) {
    // Default to the in-app auth entry so PWA logout never leaves `/go` scope.
    window.location.replace(options?.redirectTo ?? getClientAuthEntryPath());
  }
}

/** Clear cached client data after a failed or partial auth without signing out again. */
export function clearClientStorageAfterAuthReset(): void {
  clearSensitiveClientStorage();
  resetInMemoryAuthState();
}
