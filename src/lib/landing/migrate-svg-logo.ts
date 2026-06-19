import "server-only";

import {
  LANDING_ASSETS_BUCKET,
  SITE_LOGO_SETTING_KEY,
  buildSiteLogoStoragePath,
} from "@/lib/landing/site-branding";
import { rasterizeSvgToPng } from "@/lib/security/branding-image-prepare";
import { createServiceClient } from "@/lib/supabase/server";

let inFlight: Promise<void> | null = null;

/** Convert any legacy public SVG logo to PNG (one-time, idempotent). */
export async function ensureSiteLogoRasterized(): Promise<void> {
  if (!inFlight) {
    inFlight = migrateLegacySvgLogo().finally(() => {
      inFlight = null;
    });
  }

  await inFlight;
}

async function migrateLegacySvgLogo(): Promise<void> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", SITE_LOGO_SETTING_KEY)
      .maybeSingle();

    if (error || !data?.value) return;

    const storagePath = (data.value as { storage_path?: string }).storage_path;
    if (!storagePath?.toLowerCase().endsWith(".svg")) return;

    const { data: blob, error: downloadError } = await supabase.storage
      .from(LANDING_ASSETS_BUCKET)
      .download(storagePath);

    if (downloadError || !blob) {
      console.error("[migrate-svg-logo] download failed:", downloadError?.message);
      return;
    }

    const pngBuffer = await rasterizeSvgToPng(Buffer.from(await blob.arrayBuffer()));
    const newPath = buildSiteLogoStoragePath("png");

    const { error: uploadError } = await supabase.storage
      .from(LANDING_ASSETS_BUCKET)
      .upload(newPath, pngBuffer, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[migrate-svg-logo] upload failed:", uploadError.message);
      return;
    }

    const updatedAt = new Date().toISOString();
    const { error: settingsError } = await supabase.from("site_settings").upsert(
      {
        key: SITE_LOGO_SETTING_KEY,
        value: { storage_path: newPath, updated_at: updatedAt },
        updated_at: updatedAt,
      },
      { onConflict: "key" }
    );

    if (settingsError) {
      console.error("[migrate-svg-logo] settings update failed:", settingsError.message);
      return;
    }

    await supabase.storage.from(LANDING_ASSETS_BUCKET).remove([storagePath]);
  } catch (error) {
    console.error("[migrate-svg-logo] unexpected error:", error);
  }
}
