/**
 * Validates production environment variables locally or in CI.
 * Usage: node scripts/validate-env.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const PLACEHOLDER = /^your-|change-this|replace-me|^example|^xxx/i;

function read(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "QR_TOKEN_SECRET",
  "CRON_SECRET",
];

const errors = [];
const warnings = [];

for (const name of required) {
  const value = read(name);
  if (!value) {
    errors.push(`Missing ${name}`);
    continue;
  }
  if (PLACEHOLDER.test(value)) {
    errors.push(`${name} is still a placeholder`);
  }
}

const qr = read("QR_TOKEN_SECRET");
if (qr && qr.length < 32) {
  errors.push("QR_TOKEN_SECRET must be at least 32 characters");
}

const monimeKeys = ["MONIME_API_KEY", "MONIME_SPACE_ID", "MONIME_WEBHOOK_SECRET"];
const monimeSet = monimeKeys.filter((key) => read(key));
if (monimeSet.length > 0 && monimeSet.length < monimeKeys.length) {
  errors.push("Incomplete Monime configuration (set all MONIME_* keys together)");
}
if (monimeSet.length === 0) {
  warnings.push("Monime not configured (optional until payments are enabled)");
}

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }
}

if (errors.length > 0) {
  console.error("Environment validation failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("Environment validation passed.");
