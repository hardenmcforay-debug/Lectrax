import { afterEach, vi } from "vitest";

process.env.QR_TOKEN_SECRET ??=
  "ci-qr-token-secret-min-32-characters-long!!";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://ci-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "ci-anon-key-for-tests-only";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "ci-service-role-key-for-tests-only";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.MONIME_WEBHOOK_SECRET ??= "ci-monime-webhook-secret-for-tests";
process.env.MONIME_API_KEY ??= "ci-monime-api-key-for-tests";
process.env.MONIME_SPACE_ID ??= "ci-monime-space-id";
process.env.MONIME_CURRENCY ??= "SLE";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
