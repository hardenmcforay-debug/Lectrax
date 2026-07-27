import { useReducedMotion } from "framer-motion";
import { useHydrated } from "@/lib/hooks/use-hydrated";

/**
 * prefers-reduced-motion that stays false during SSR and the hydration pass.
 * Framer's useReducedMotion() is null on the server and true/false on the client,
 * which can change initial styles or DOM tags and trigger hydration mismatches.
 */
export function useSafeReducedMotion(): boolean {
  const hydrated = useHydrated();
  const prefersReduced = useReducedMotion();
  return hydrated && prefersReduced === true;
}
