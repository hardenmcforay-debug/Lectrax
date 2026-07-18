import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const splashDir = join(root, "public", "splash");
const brandDir = join(root, "public", "brand");

const ICON_ASSET_VERSION = "20260718w";
const OFFICIAL_LOGO_URL =
  "https://resvbqlaazevlrvjdgpx.supabase.co/storage/v1/object/public/landing-assets/brand/logo.png?v=2026-06-12T22%3A26%3A52.007Z";

const ICON_SIZES = [16, 32, 48, 64, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];

const APPLE_SPLASH_SCREENS = [
  { width: 2048, height: 2732 },
  { width: 1668, height: 2388 },
  { width: 1536, height: 2048 },
  { width: 1290, height: 2796 },
  { width: 1179, height: 2556 },
  { width: 1170, height: 2532 },
  { width: 1125, height: 2436 },
  { width: 828, height: 1792 },
  { width: 750, height: 1334 },
];

const BRAND_WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const ICON_BACKGROUND = BRAND_WHITE;

async function renderOnCanvas(sourceBuffer, size, { padRatio = 0.14, background }) {
  const contentSize = Math.max(1, Math.round(size * (1 - padRatio * 2)));
  const mark = await sharp(sourceBuffer)
    .resize(contentSize, contentSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });
  await mkdir(brandDir, { recursive: true });

  console.log("Downloading official Lectrax logo...");
  const res = await fetch(OFFICIAL_LOGO_URL);
  if (!res.ok) throw new Error(`Failed to download logo: ${res.status}`);
  const sourceBuffer = Buffer.from(await res.arrayBuffer());
  const sourcePath = join(brandDir, "official-logo.png");
  await writeFile(sourcePath, sourceBuffer);
  console.log(`Saved ${sourcePath} (${sourceBuffer.length} bytes)`);

  // Inspect alpha — if logo already has opaque background, keep contain on brand blue.
  const meta = await sharp(sourceBuffer).metadata();
  console.log(`Source: ${meta.width}x${meta.height} ${meta.format} channels=${meta.channels}`);

  for (const size of ICON_SIZES) {
    const padRatio = size >= 72 ? 0.12 : 0.06;
    const png = await renderOnCanvas(sourceBuffer, size, {
      padRatio,
      background: ICON_BACKGROUND,
    });
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    await writeFile(outputPath, png);
    console.log(`Generated ${outputPath}`);
  }

  await writeFile(
    join(iconsDir, "apple-touch-icon.png"),
    await renderOnCanvas(sourceBuffer, 180, { padRatio: 0.12, background: ICON_BACKGROUND })
  );

  const favicon16 = await renderOnCanvas(sourceBuffer, 16, {
    padRatio: 0.04,
    background: ICON_BACKGROUND,
  });
  const favicon32 = await renderOnCanvas(sourceBuffer, 32, {
    padRatio: 0.04,
    background: ICON_BACKGROUND,
  });
  await writeFile(join(root, "public", "favicon-16x16.png"), favicon16);
  await writeFile(join(root, "public", "favicon-32x32.png"), favicon32);
  await writeFile(join(iconsDir, "favicon-16x16.png"), favicon16);
  await writeFile(join(iconsDir, "favicon-32x32.png"), favicon32);
  await writeFile(join(root, "public", "favicon.png"), favicon32);
  // Serve a real PNG as favicon.ico (widely accepted by Chromium).
  await writeFile(join(root, "public", "favicon.ico"), favicon32);

  // Maskable: more inset for Android adaptive icons.
  await writeFile(
    join(iconsDir, "icon-maskable-512x512.png"),
    await renderOnCanvas(sourceBuffer, 512, { padRatio: 0.22, background: ICON_BACKGROUND })
  );

  // Replace legacy SVG mark with a PNG-backed reference note — keep SVG for compatibility
  // by embedding a simplified link isn't possible; copy a 512 PNG as the canonical "any" mark
  // and point metadata at PNGs. Also write a high-res source for app router.
  const icon512 = await readGenerated(join(iconsDir, "icon-512x512.png"));
  const appDir = join(root, "src", "app");
  await mkdir(appDir, { recursive: true });
  await writeFile(join(appDir, "icon.png"), await readGenerated(join(iconsDir, "icon-192x192.png")));
  await writeFile(
    join(appDir, "apple-icon.png"),
    await readGenerated(join(iconsDir, "apple-touch-icon.png"))
  );

  const splashIcon = await renderOnCanvas(sourceBuffer, 256, {
    padRatio: 0.1,
    background: ICON_BACKGROUND,
  });
  for (const { width, height } of APPLE_SPLASH_SCREENS) {
    const splashPath = join(splashDir, `apple-splash-${width}x${height}.png`);
    await sharp({
      create: { width, height, channels: 4, background: BRAND_WHITE },
    })
      .composite([{ input: splashIcon, gravity: "centre" }])
      .png()
      .toFile(splashPath);
    console.log(`Generated ${splashPath}`);
  }

  const v = ICON_ASSET_VERSION;
  const manifestIcons = ICON_SIZES.filter((size) => size >= 72).map((size) => ({
    src: `/icons/icon-${size}x${size}.png?v=${v}`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  }));
  manifestIcons.push({
    src: `/icons/icon-maskable-512x512.png?v=${v}`,
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  });

  await writeFile(join(iconsDir, "manifest-icons.json"), JSON.stringify(manifestIcons, null, 2));

  // Update main manifest icons in place.
  const { readFile } = await import("node:fs/promises");
  const manifestPath = join(root, "public", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.icons = manifestIcons;
  if (Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.map((shortcut) => ({
      ...shortcut,
      icons: [{ src: `/icons/icon-192x192.png?v=${v}`, sizes: "192x192", type: "image/png" }],
    }));
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  // Keep a local copy used by Logo fallback when Supabase is unreachable.
  await copyFile(sourcePath, join(iconsDir, "official-logo.png"));

  console.log(`Official logo icon generation complete (v=${v}).`);
  console.log("Remember to bump PWA_ICON_ASSET_VERSION in src/lib/pwa/config.ts to", v);
}

async function readGenerated(path) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
