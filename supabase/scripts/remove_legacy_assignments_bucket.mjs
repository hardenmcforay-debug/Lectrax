/**
 * One-time cleanup: delete the legacy public "assignments" bucket via Storage API.
 *
 * Usage (from project root):
 *   node supabase/scripts/remove_legacy_assignments_bucket.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const LEGACY_BUCKET = "assignments";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // fall through to process.env
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  console.error("Could not list buckets:", listError.message);
  process.exit(1);
}

if (!buckets.some((b) => b.id === LEGACY_BUCKET)) {
  console.log(`Bucket "${LEGACY_BUCKET}" does not exist — nothing to do.`);
  process.exit(0);
}

const { error: deleteError } = await supabase.storage.deleteBucket(LEGACY_BUCKET);
if (deleteError) {
  console.error("Could not delete bucket:", deleteError.message);
  process.exit(1);
}

console.log(`Deleted legacy bucket "${LEGACY_BUCKET}".`);
