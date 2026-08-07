import { headers } from "next/headers";
import { CSP_NONCE_HEADER } from "@/lib/security/csp";

/** Read the per-request CSP nonce set by `proxy.ts` (empty when CSP_MODE=off). */
export async function getRequestCspNonce(): Promise<string | undefined> {
  const headerStore = await headers();
  const nonce = headerStore.get(CSP_NONCE_HEADER)?.trim();
  return nonce && nonce.length > 0 ? nonce : undefined;
}
