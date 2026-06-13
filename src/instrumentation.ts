import { validateProductionEnv } from "@/lib/env";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  // Skip during `next build`; validate when the production server starts.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const result = validateProductionEnv();

  for (const warning of result.warnings) {
    console.warn(`[env] ${warning}`);
  }

  if (!result.ok) {
    console.error("[env] Production environment validation failed:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    throw new Error(
      `Production environment misconfigured: ${result.errors.join("; ")}`
    );
  }

  console.info("[env] Production environment validated successfully");
}
