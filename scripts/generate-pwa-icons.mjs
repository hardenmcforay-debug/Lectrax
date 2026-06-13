import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const splashDir = join(root, "public", "splash");
const svgPath = join(iconsDir, "icon.svg");

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const APPLE_SPLASH_SCREENS = [
  { width: 2048, height: 2732, media: "(device-width: 1024px) and (device-height: 1366px)" },
  { width: 1668, height: 2388, media: "(device-width: 834px) and (device-height: 1194px)" },
  { width: 1536, height: 2048, media: "(device-width: 768px) and (device-height: 1024px)" },
  { width: 1290, height: 2796, media: "(device-width: 430px) and (device-height: 932px)" },
  { width: 1179, height: 2556, media: "(device-width: 393px) and (device-height: 852px)" },
  { width: 1170, height: 2532, media: "(device-width: 390px) and (device-height: 844px)" },
  { width: 1125, height: 2436, media: "(device-width: 375px) and (device-height: 812px)" },
  { width: 828, height: 1792, media: "(device-width: 414px) and (device-height: 896px)" },
  { width: 750, height: 1334, media: "(device-width: 375px) and (device-height: 667px)" },
];

async function generateIcons() {
  await mkdir(iconsDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });

  const svgBuffer = await readFile(svgPath);

  for (const size of ICON_SIZES) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }

  const appleTouchIcon = join(iconsDir, "apple-touch-icon.png");
  await sharp(svgBuffer).resize(180, 180).png().toFile(appleTouchIcon);
  console.log(`Generated ${appleTouchIcon}`);

  const favicon = join(root, "public", "favicon.ico");
  await sharp(svgBuffer).resize(32, 32).png().toFile(favicon.replace(".ico", ".png"));
  await sharp(svgBuffer).resize(32, 32).toFile(favicon);
  console.log(`Generated ${favicon}`);

  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#0B3D91"/>
  <path d="M256 148L136 212L256 276L376 212L256 148Z" fill="#FFFFFF"/>
  <path d="M196 244V316C196 340 222 360 256 360C290 360 316 340 316 316V244" stroke="#10B981" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M376 212V280" stroke="#10B981" stroke-width="20" stroke-linecap="round"/>
  <circle cx="376" cy="292" r="14" fill="#10B981"/>
</svg>`;

  const maskable512 = join(iconsDir, "icon-maskable-512x512.png");
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(maskable512);
  console.log(`Generated ${maskable512}`);

  const icon192Buffer = await sharp(svgBuffer).resize(192, 192).png().toBuffer();

  for (const { width, height } of APPLE_SPLASH_SCREENS) {
    const splashPath = join(splashDir, `apple-splash-${width}x${height}.png`);
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: icon192Buffer,
          gravity: "center",
        },
      ])
      .png()
      .toFile(splashPath);
    console.log(`Generated ${splashPath}`);
  }

  const manifestIcons = ICON_SIZES.map((size) => ({
    src: `/icons/icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  }));

  manifestIcons.push({
    src: "/icons/icon-maskable-512x512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  });

  await writeFile(
    join(iconsDir, "manifest-icons.json"),
    JSON.stringify(manifestIcons, null, 2)
  );

  console.log("PWA icon generation complete.");
}

generateIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
