#!/usr/bin/env node
/**
 * Validates HTTPS enforcement for production builds and deployments.
 *
 * Usage:
 *   node scripts/check-https.mjs              # scan source only
 *   node scripts/check-https.mjs --production # strict env + source scan
 *   node scripts/check-https.mjs --scan-build # scan .next output (run after build)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const isProduction = args.has("--production") || process.env.NODE_ENV === "production";
const scanBuild = args.has("--scan-build");

const HTTPS_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_ADMIN_APP_URL",
  "NEXT_PUBLIC_MAIN_APP_URL",
];

const ALLOWED_HTTP_PATTERNS = [
  /xmlns="http:\/\/www\.w3\.org\/[^"]*"/gi,
  /http:\/\/www\.w3\.org\/[^\s"'`)<>]*/gi,
  /http:\/\/localhost(?::\d+)?/gi,
  /http:\/\/127\.0\.0\.1(?::\d+)?/gi,
  /http:\/\/\[::1\](?::\d+)?/gi,
  /http:\/\/fb\.me\/[^\s"'`)<>]*/gi,
];

const IGNORED_HTTP_HOSTS = new Set(["www.w3.org", "fb.me"]);

function isInsecureNetworkHttpUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:") {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    return false;
  }

  if (IGNORED_HTTP_HOSTS.has(host) || host.endsWith(".w3.org")) {
    return false;
  }

  // Minified bundles can produce false positives like http://n or http://f
  if (host.length < 3 || !host.includes(".")) {
    return false;
  }

  return true;
}

function stripAllowedHttp(content) {
  let stripped = content;
  for (const pattern of ALLOWED_HTTP_PATTERNS) {
    stripped = stripped.replace(pattern, "");
  }
  return stripped;
}

function findInsecureHttp(content) {
  const stripped = stripAllowedHttp(content);
  const matches = stripped.match(/http:\/\/[^\s"'`)<>\\]+/gi) ?? [];
  return matches.filter(isInsecureNetworkHttpUrl);
}

const SCAN_DIRS = ["src", "public"];
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".html"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "deploy"]);

function loadEnvFile(filename) {
  const path = resolve(ROOT, filename);
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

function readEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      files.push(full);
    }
  }
  return files;
}

function validateEnvUrls(errors) {
  if (!isProduction) return;

  const hasProductionEnv = HTTPS_ENV_VARS.some((name) => readEnv(name));
  if (!hasProductionEnv) {
    return;
  }

  for (const name of HTTPS_ENV_VARS) {
    const value = process.env[name]?.trim();
    if (!value) {
      if (name === "NEXT_PUBLIC_SUPABASE_URL" || name === "NEXT_PUBLIC_APP_URL") {
        errors.push(`Production requires ${name} to be set with an HTTPS URL`);
      }
      continue;
    }

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      errors.push(`${name} is not a valid URL`);
      continue;
    }

    if (parsed.protocol !== "https:") {
      errors.push(`${name} must use HTTPS in production (got ${parsed.protocol}//)`);
    }

    if (["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
      errors.push(`${name} must not use localhost in production`);
    }
  }
}

function scanDirectory(label, dirs, errors) {
  const files = dirs.flatMap((dir) => walk(resolve(ROOT, dir)));
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const matches = findInsecureHttp(content);
    if (matches.length > 0) {
      const rel = relative(ROOT, file);
      errors.push(
        `${label}: insecure HTTP URL(s) in ${rel}: ${[...new Set(matches)].join(", ")}`
      );
    }
  }
}

loadEnvFile(".env.production.local");
loadEnvFile(".env.production");
if (!isProduction) {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

const errors = [];

validateEnvUrls(errors);
scanDirectory("source", SCAN_DIRS, errors);

if (scanBuild) {
  scanDirectory("build", [".next"], errors);
}

if (errors.length > 0) {
  console.error("HTTPS security check failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

const mode = [
  isProduction ? "production" : "development",
  scanBuild ? "build-scan" : "source-scan",
].join(", ");

console.log(`HTTPS security check passed (${mode}).`);
