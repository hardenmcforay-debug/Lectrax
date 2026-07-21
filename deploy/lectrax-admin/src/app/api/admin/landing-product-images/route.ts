import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { isProductSlug } from "@/lib/landing/products";
import {
  LANDING_ASSETS_BUCKET,
  LANDING_PRODUCT_IMAGES_SETTING_KEY,
  BRANDING_ASSET_CACHE_CONTROL,
  buildProductImageStoragePath,
  extensionForImageMime,
  getLandingProductImagesSetting,
  isAllowedBrandingImage,
  type LandingProductImagesSetting,
  type BrandingImageSetting,
} from "@/lib/landing/site-branding";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { brandingExtensionMatchesMime, readBrandingFileBytes } from "@/lib/security/file-validation";
import { logPlatformAdminAudit } from "@/lib/admin/platform-admin-audit";

type AdminSupabase = Extract<
  Awaited<ReturnType<typeof requirePlatformAdmin>>,
  { supabase: unknown }
>["supabase"];

async function saveProductImagesSetting(
  supabase: AdminSupabase,
  userId: string,
  products: Record<string, BrandingImageSetting>
) {
  const updatedAt = new Date().toISOString();
  const value: LandingProductImagesSetting = { products };

  const { error } = await supabase.from("site_settings").upsert(
    {
      key: LANDING_PRODUCT_IMAGES_SETTING_KEY,
      value,
      updated_at: updatedAt,
      updated_by: userId,
    },
    { onConflict: "key" }
  );

  return { error, updatedAt };
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, userId } = auth;
  const formData = await request.formData();
  const file = formData.get("file");
  const productSlug = formData.get("productSlug");

  if (typeof productSlug !== "string" || !isProductSlug(productSlug)) {
    return NextResponse.json({ error: "A valid product is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!isAllowedBrandingImage(file)) {
    return NextResponse.json(
      { error: "Upload a JPEG, PNG, WebP, or GIF image up to 5 MB." },
      { status: 400 }
    );
  }

  if (!brandingExtensionMatchesMime(file)) {
    return NextResponse.json(
      { error: "File extension does not match the image type." },
      { status: 400 }
    );
  }

  const rawFile = await readBrandingFileBytes(file);
  if (!rawFile.ok) {
    return NextResponse.json({ error: rawFile.error }, { status: 400 });
  }

  const ext = extensionForImageMime(file.type);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  const version = Date.now();
  const storagePath = buildProductImageStoragePath(productSlug, ext, version);
  const existingProducts = await getLandingProductImagesSetting();
  const previous = existingProducts[productSlug];

  if (previous?.storage_path) {
    await supabase.storage.from(LANDING_ASSETS_BUCKET).remove([previous.storage_path]);
  }

  const buffer = Buffer.from(rawFile.bytes);
  const { error: uploadError } = await supabase.storage
    .from(LANDING_ASSETS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: BRANDING_ASSET_CACHE_CONTROL,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(uploadError.message ?? "Could not upload image.") },
      { status: 500 }
    );
  }

  const productUpdatedAt = new Date().toISOString();
  const nextProducts = {
    ...existingProducts,
    [productSlug]: { storage_path: storagePath, updated_at: productUpdatedAt },
  };

  const { error: settingsError, updatedAt } = await saveProductImagesSetting(
    supabase,
    userId,
    nextProducts
  );

  if (settingsError) {
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(
          settingsError.message ?? "Image uploaded but settings could not be saved."
        ),
      },
      { status: 500 }
    );
  }

  await logPlatformAdminAudit({
    actorId: userId,
    action: "landing_product_image_uploaded",
    entityType: "site_settings",
    entityId: productSlug,
    metadata: { storage_path: storagePath },
  });

  return NextResponse.json({
    success: true,
    product_slug: productSlug,
    storage_path: storagePath,
    updated_at: updatedAt,
    product_updated_at: productUpdatedAt,
  });
}

export async function DELETE(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, userId } = auth;
  const productSlug = new URL(request.url).searchParams.get("productSlug");

  if (!productSlug || !isProductSlug(productSlug)) {
    return NextResponse.json({ error: "A valid product is required." }, { status: 400 });
  }

  const existingProducts = await getLandingProductImagesSetting();
  const previous = existingProducts[productSlug];

  if (previous?.storage_path) {
    await supabase.storage.from(LANDING_ASSETS_BUCKET).remove([previous.storage_path]);
  }

  const nextProducts = { ...existingProducts };
  delete nextProducts[productSlug];

  const { error: settingsError } = await saveProductImagesSetting(
    supabase,
    userId,
    nextProducts
  );

  if (settingsError) {
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(
          settingsError.message ?? "Could not remove product image."
        ),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, product_slug: productSlug });
}
