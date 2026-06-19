import "server-only";

import sharp from "sharp";

import { extensionForImageMime } from "@/lib/landing/site-branding";

const SITE_LOGO_MAX_PIXELS = 1024;
const SITE_LOGO_RASTER_DENSITY = 150;

export type PreparedBrandingImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

/** Rasterize SVG to PNG so active content cannot execute in the public bucket. */
export async function rasterizeSvgToPng(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { density: SITE_LOGO_RASTER_DENSITY })
    .resize({
      width: SITE_LOGO_MAX_PIXELS,
      height: SITE_LOGO_MAX_PIXELS,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9, force: true })
    .toBuffer();
}

export async function prepareSiteLogoForPublicStorage(params: {
  buffer: Buffer;
  mime: string;
}): Promise<PreparedBrandingImage> {
  if (params.mime === "image/svg+xml") {
    return {
      buffer: await rasterizeSvgToPng(params.buffer),
      contentType: "image/png",
      ext: "png",
    };
  }

  const ext = extensionForImageMime(params.mime);
  if (!ext) {
    throw new Error("Unsupported image type.");
  }

  return {
    buffer: params.buffer,
    contentType: params.mime,
    ext,
  };
}
