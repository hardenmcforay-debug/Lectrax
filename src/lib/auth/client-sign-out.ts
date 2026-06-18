import { createClient } from "@/lib/supabase/client";
import { clearSensitiveClientStorage } from "@/lib/security/client-storage";
import { useAuthStore } from "@/store/auth-store";

function resetInMemoryAuthState(): void {
  useAuthStore.getState().setProfile(null);
  useAuthStore.getState().setLoading(false);
}

/** Sign out and purge client-side caches that may hold user data. */
export async function signOutAndClearClientStorage(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  clearSensitiveClientStorage();
  resetInMemoryAuthState();
}

/** Clear cached client data after a failed or partial auth without signing out again. */
export function clearClientStorageAfterAuthReset(): void {
  clearSensitiveClientStorage();
  resetInMemoryAuthState();
}
