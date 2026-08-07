#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "deploy", "lectrax-admin", "src");
const missing = new Set();

function resolveImport(rel) {
  const candidates = [
    join(root, `${rel}.ts`),
    join(root, `${rel}.tsx`),
    join(root, rel, "index.ts"),
    join(root, rel, "index.tsx"),
  ];
  return candidates.some((candidate) => existsSync(candidate));
}

function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const filePath = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(filePath);
      continue;
    }

    if (!/\.(ts|tsx)$/.test(ent.name)) continue;

    const content = readFileSync(filePath, "utf8");
    for (const match of content.matchAll(/from ["']@\/([^"']+)["']/g)) {
      const rel = match[1];
      if (!resolveImport(rel)) {
        missing.add(`@/${rel} (from ${filePath.replace(/\\/g, "/")})`);
      }
    }
  }
}

if (!existsSync(root)) {
  console.error("deploy/lectrax-admin/src is missing. Run: npm run export:admin");
  process.exit(1);
}

walk(root);

if (missing.size > 0) {
  console.error("Unresolved admin @/ imports:");
  console.error([...missing].sort().join("\n"));
  process.exit(1);
}

console.log("Admin @/ import graph is closed.");
