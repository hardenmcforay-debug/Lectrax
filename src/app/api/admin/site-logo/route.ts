import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  LANDING_ASSETS_BUCKET,
  SITE_LOGO_SETTING_KEY,
  buildSiteLogoStoragePath,
  extensionForImageMime,
  getSiteLogoSetting,
  isAllowedBrandingImage,
} from "@/lib/landing/site-branding";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, userId } = auth;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Logo image is required." }, { status: 400 });
  }

  if (!isAllowedBrandingImage(file)) {
    return NextResponse.json(
      { error: "Upload a JPEG, PNG, WebP, GIF, or SVG image up to 5 MB." },
      { status: 400 }
    );
  }

  const ext = extensionForImageMime(file.type);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  const storagePath = buildSiteLogoStoragePath(ext);
  const previous = await getSiteLogoSetting();

  if (previous?.storage_path && previous.storage_path !== storagePath) {
    await supabase.storage.from(LANDING_ASSETS_BUCKET).remove([previous.storage_path]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(LANDING_ASSETS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(uploadError.message ?? "Could not upload logo.") },
      { status: 500 }
    );
  }

  const updatedAt = new Date().toISOString();
  const { error: settingsError } = await supabase.from("site_settings").upsert(
    {
      key: SITE_LOGO_SETTING_KEY,
      value: { storage_path: storagePath, updated_at: updatedAt },
      updated_at: updatedAt,
      updated_by: userId,
    },
    { onConflict: "key" }
  );

  if (settingsError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(settingsError.message ?? "Logo uploaded but settings could not be saved.") },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    storage_path: storagePath,
    updated_at: updatedAt,
  });
}

export async function DELETE() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase } = auth;
  const previous = await getSiteLogoSetting();

  if (previous?.storage_path) {
    await supabase.storage.from(LANDING_ASSETS_BUCKET).remove([previous.storage_path]);
  }

  const { error } = await supabase.from("site_settings").delete().eq("key", SITE_LOGO_SETTING_KEY);

  if (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error.message ?? "Could not remove logo.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
