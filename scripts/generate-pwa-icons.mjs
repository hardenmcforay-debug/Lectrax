import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const splashDir = join(root, "public", "splash");
const svgPath = join(iconsDir, "icon.svg");

/** Cache-bust token written into manifest + companion JSON (bump when regenerating). */
export const ICON_ASSET_VERSION = "20260717b";

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

const BRAND_BLUE = { r: 11, g: 61, b: 145, alpha: 1 };
const BRAND_WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/**
 * Render the Lectrax mark onto a square canvas with padding so it is not cropped
 * on home screens / maskable adaptive icons.
 */
async function renderIconPng(svgBuffer, size, { padded = true, background = null } = {}) {
  const contentSize = padded ? Math.round(size * 0.72) : size;
  const mark = await sharp(svgBuffer)
    .resize(contentSize, contentSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const base = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  return base
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function generateIcons() {
  await mkdir(iconsDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });

  const svgBuffer = await readFile(svgPath);

  for (const size of ICON_SIZES) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    // Keep brand blue plate for "any" icons (matches official mark).
    const png = await renderIconPng(svgBuffer, size, {
      padded: size >= 72,
      background: BRAND_BLUE,
    });
    await writeFile(outputPath, png);
    console.log(`Generated ${outputPath}`);
  }

  const appleTouchIcon = join(iconsDir, "apple-touch-icon.png");
  await writeFile(
    appleTouchIcon,
    await renderIconPng(svgBuffer, 180, { padded: true, background: BRAND_BLUE })
  );
  console.log(`Generated ${appleTouchIcon}`);

  // Standalone favicon PNGs + multi-size ICO (PNG-in-ICO via sharp for 32px primary).
  const favicon16 = await renderIconPng(svgBuffer, 16, { padded: false, background: BRAND_BLUE });
  const favicon32 = await renderIconPng(svgBuffer, 32, { padded: false, background: BRAND_BLUE });
  await writeFile(join(root, "public", "favicon-16x16.png"), favicon16);
  await writeFile(join(root, "public", "favicon-32x32.png"), favicon32);
  await writeFile(join(iconsDir, "favicon-16x16.png"), favicon16);
  await writeFile(join(iconsDir, "favicon-32x32.png"), favicon32);

  // Browsers accept a PNG served as favicon.ico; also keep public/favicon.png.
  await writeFile(join(root, "public", "favicon.png"), favicon32);
  await writeFile(join(root, "public", "favicon.ico"), favicon32);
  console.log("Generated favicon.ico / favicon.png / favicon-16/32");

  // Maskable: solid brand plate + more inset so adaptive masks do not crop the mark.
  const maskable512 = join(iconsDir, "icon-maskable-512x512.png");
  await writeFile(
    maskable512,
    await renderIconPng(svgBuffer, 512, {
      padded: true,
      background: BRAND_BLUE,
    })
  );
  // Extra inset for maskable safe zone (~40% padding).
  {
    const contentSize = Math.round(512 * 0.55);
    const mark = await sharp(svgBuffer)
      .resize(contentSize, contentSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const buffer = await sharp({
      create: { width: 512, height: 512, channels: 4, background: BRAND_BLUE },
    })
      .composite([{ input: mark, gravity: "centre" }])
      .png()
      .toBuffer();
    await writeFile(maskable512, buffer);
  }
  console.log(`Generated ${maskable512}`);

  const splashIcon = await renderIconPng(svgBuffer, 256, {
    padded: true,
    background: BRAND_BLUE,
  });

  for (const { width, height } of APPLE_SPLASH_SCREENS) {
    const splashPath = join(splashDir, `apple-splash-${width}x${height}.png`);
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: BRAND_WHITE,
      },
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

  const manifestPath = join(root, "public", "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    manifest = {
      name: "Lectrax",
      short_name: "Lectrax",
      start_url: "/",
      display: "standalone",
      background_color: "#FFFFFF",
      theme_color: "#0B3D91",
    };
  }
  manifest.icons = manifestIcons;
  if (Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.map((shortcut) => ({
      ...shortcut,
      icons: [{ src: `/icons/icon-192x192.png?v=${v}`, sizes: "192x192", type: "image/png" }],
    }));
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  // Next.js App Router file-based icons (hashed URLs → reliable tab favicon updates).
  const appDir = join(root, "src", "app");
  await mkdir(appDir, { recursive: true });
  await writeFile(join(appDir, "icon.png"), await readFile(join(iconsDir, "icon-192x192.png")));
  await writeFile(join(appDir, "apple-icon.png"), await readFile(join(iconsDir, "apple-touch-icon.png")));

  console.log(`PWA icon generation complete (v=${v}).`);
}

generateIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
