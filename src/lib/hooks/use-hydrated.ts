import { useSyncExternalStore } from "react";

/** True only after the client has hydrated; false during SSR and the hydration pass. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
