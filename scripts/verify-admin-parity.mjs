#!/usr/bin/env node
/**
 * Verify deploy/lectrax-admin matches a fresh export from the main app.
 *
 * Fails CI when:
 * - committed admin export drifts from `npm run export:admin`
 * - required infrastructure files are missing
 * - admin package versions diverge from the main app for shared deps
 *
 * Usage:
 *   node scripts/verify-admin-parity.mjs
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  EXPORT_OWNED_ROOT_ENTRIES,
  PARITY_IGNORE_BASENAMES,
  REQUIRED_ADMIN_DEPENDENCIES,
  REQUIRED_ADMIN_DEV_DEPENDENCIES,
} from "./admin-export-manifest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COMMITTED = join(ROOT, "deploy", "lectrax-admin");

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (PARITY_IGNORE_BASENAMES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, acc);
      continue;
    }
    acc.push(full);
  }
  return acc;
}

function normalizeNewlines(buffer) {
  return buffer.toString("utf8").replace(/\r\n/g, "\n");
}

function fileFingerprint(filePath) {
  const raw = readFileSync(filePath);
  // Text and generated configs: compare as UTF-8 with normalized newlines.
  if (/\.(ts|tsx|js|mjs|css|json|txt|example|gitignore)$/i.test(filePath)) {
    return createHash("sha256").update(normalizeNewlines(raw)).digest("hex");
  }
  return createHash("sha256").update(raw).digest("hex");
}

function collectOwnedRelativePaths(baseDir) {
  const paths = new Set();
  for (const entry of EXPORT_OWNED_ROOT_ENTRIES) {
    const full = join(baseDir, entry);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) {
      for (const file of walkFiles(full)) {
        paths.add(relative(baseDir, file).split(sep).join("/"));
      }
    } else {
      paths.add(entry);
    }
  }
  return paths;
}

function assertPackageParity() {
  const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const adminPkg = JSON.parse(readFileSync(join(COMMITTED, "package.json"), "utf8"));
  const issues = [];

  for (const key of REQUIRED_ADMIN_DEPENDENCIES) {
    const expected = rootPkg.dependencies?.[key];
    if (!expected) continue;
    const actual = adminPkg.dependencies?.[key];
    if (!actual) {
      issues.push(`missing dependency ${key} (expected ${expected})`);
    } else if (actual !== expected) {
      issues.push(`dependency ${key}: admin=${actual} main=${expected}`);
    }
  }

  for (const key of REQUIRED_ADMIN_DEV_DEPENDENCIES) {
    const expected = rootPkg.devDependencies?.[key];
    if (!expected) continue;
    const actual = adminPkg.devDependencies?.[key];
    if (!actual) {
      issues.push(`missing devDependency ${key} (expected ${expected})`);
    } else if (actual !== expected) {
      issues.push(`devDependency ${key}: admin=${actual} main=${expected}`);
    }
  }

  const rootOverride = JSON.stringify(rootPkg.overrides ?? {});
  const adminOverride = JSON.stringify(adminPkg.overrides ?? {});
  if (rootOverride !== adminOverride) {
    issues.push("package.json overrides differ from main app");
  }

  return issues;
}

function assertInfrastructurePresent() {
  const required = [
    "src/proxy.ts",
    "src/instrumentation.ts",
    "src/instrumentation-client.ts",
    "sentry.server.config.ts",
    "sentry.edge.config.ts",
    "src/lib/observability/with-api-observability.ts",
    "src/lib/observability/sentry.ts",
    "src/lib/observability/constants.ts",
    "src/lib/security/rate-limit.ts",
    "src/lib/security/headers.ts",
    "next.config.ts",
    ".env.example",
  ];

  return required
    .filter((rel) => !existsSync(join(COMMITTED, rel)))
    .map((rel) => `missing infrastructure file: ${rel}`);
}

function main() {
  if (!existsSync(COMMITTED)) {
    console.error("deploy/lectrax-admin is missing. Run: npm run export:admin");
    process.exit(1);
  }

  const tempOut = mkdtempSync(join(tmpdir(), "lectrax-admin-parity-"));
  console.log("Generating fresh admin export for parity check...");

  const exportResult = spawnSync(process.execPath, [join(__dirname, "export-admin-app.mjs")], {
    cwd: ROOT,
    env: { ...process.env, LECTRAX_ADMIN_OUT: tempOut },
    encoding: "utf8",
  });

  if (exportResult.status !== 0) {
    console.error(exportResult.stdout);
    console.error(exportResult.stderr);
    rmSync(tempOut, { recursive: true, force: true });
    console.error("Admin export failed during parity check.");
    process.exit(exportResult.status ?? 1);
  }

  const freshPaths = collectOwnedRelativePaths(tempOut);
  const committedPaths = collectOwnedRelativePaths(COMMITTED);
  const issues = [];

  for (const rel of [...freshPaths].sort()) {
    if (!committedPaths.has(rel)) {
      issues.push(`missing from committed export: ${rel}`);
      continue;
    }
    const freshHash = fileFingerprint(join(tempOut, rel));
    const committedHash = fileFingerprint(join(COMMITTED, rel));
    if (freshHash !== committedHash) {
      issues.push(`content drift: ${rel}`);
    }
  }

  for (const rel of [...committedPaths].sort()) {
    if (!freshPaths.has(rel)) {
      issues.push(`stale in committed export (not produced by export script): ${rel}`);
    }
  }

  issues.push(...assertInfrastructurePresent());
  issues.push(...assertPackageParity());

  // Ensure next.config wraps Sentry like production.
  const nextConfig = readFileSync(join(COMMITTED, "next.config.ts"), "utf8");
  if (!nextConfig.includes("withSentryConfig")) {
    issues.push("next.config.ts is not wrapped with withSentryConfig");
  }
  if (!nextConfig.includes("@sentry/nextjs")) {
    issues.push("next.config.ts does not import @sentry/nextjs");
  }

  const envExample = readFileSync(join(COMMITTED, ".env.example"), "utf8");
  for (const key of [
    "NEXT_PUBLIC_DEPLOYMENT_TARGET",
    "UPSTASH_REDIS_REST_URL",
    "SENTRY_DSN",
    "NEXT_PUBLIC_SENTRY_DSN",
    "CSP_MODE",
  ]) {
    if (!envExample.includes(key)) {
      issues.push(`.env.example missing ${key}`);
    }
  }

  rmSync(tempOut, { recursive: true, force: true });

  if (issues.length) {
    console.error("Admin deployment parity check FAILED:");
    for (const issue of issues.slice(0, 80)) {
      console.error(`  - ${issue}`);
    }
    if (issues.length > 80) {
      console.error(`  … and ${issues.length - 80} more`);
    }
    console.error("\nFix by running: npm run export:admin");
    console.error("Then commit the updated deploy/lectrax-admin tree.");
    process.exit(1);
  }

  console.log("Admin deployment parity check passed.");
  console.log(`Compared ${freshPaths.size} export-owned files against deploy/lectrax-admin.`);
}

main();
