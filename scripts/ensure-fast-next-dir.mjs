/**
 * Ensure `.next` is a real project-local directory (not a junction).
 *
 * Turbopack resolves modules from the dist dir; junctioning `.next` outside
 * the project breaks `require('react')` / `next/...` lookups.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");

function isReparsePoint(dir) {
  try {
    fs.readlinkSync(dir);
    return true;
  } catch {
    return false;
  }
}

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

if (!isReparsePoint(nextDir)) {
  process.exit(0);
}

console.warn(
  "[ensure-fast-next-dir] Removing invalid .next junction so Turbopack can resolve modules."
);

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
} catch {
  spawnSync(process.env.ComSpec || "cmd.exe", ["/c", "rmdir", nextDir], {
    encoding: "utf8",
    windowsHide: true,
  });
}

if (fs.existsSync(nextDir)) {
  try {
    // Directory junction removal on Windows
    fs.unlinkSync(nextDir);
  } catch {
    spawnSync(process.env.ComSpec || "cmd.exe", ["/c", "rmdir", nextDir], {
      encoding: "utf8",
      windowsHide: true,
    });
  }
}
