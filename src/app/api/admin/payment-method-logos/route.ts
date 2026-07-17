import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  LANDING_ASSETS_BUCKET,
  BRANDING_ASSET_CACHE_CONTROL,
  extensionForImageMime,
  isAllowedBrandingImage,
  type BrandingImageSetting,
} from "@/lib/landing/site-branding";
import {
  PAYMENT_METHOD_LOGOS_SETTING_KEY,
  buildPaymentMethodLogoStoragePath,
  getPaymentMethodLogosSetting,
  isPaymentMethodLogoId,
  type PaymentMethodLogosSetting,
} from "@/lib/subscription/payment-method-logos";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { brandingExtensionMatchesMime, readBrandingFileBytes } from "@/lib/security/file-validation";
import { logPlatformAdminAudit } from "@/lib/admin/platform-admin-audit";

type AdminSupabase = Extract<
  Awaited<ReturnType<typeof requirePlatformAdmin>>,
  { supabase: unknown }
>["supabase"];

async function savePaymentMethodLogosSetting(
  supabase: AdminSupabase,
  userId: string,
  logos: Record<string, BrandingImageSetting>
) {
  const updatedAt = new Date().toISOString();
  const value: PaymentMethodLogosSetting = { logos };

  const { error } = await supabase.from("site_settings").upsert(
    {
      key: PAYMENT_METHOD_LOGOS_SETTING_KEY,
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
  const methodId = formData.get("methodId");

  if (typeof methodId !== "string" || !isPaymentMethodLogoId(methodId)) {
    return NextResponse.json({ error: "A valid payment method is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Logo image is required." }, { status: 400 });
  }

  if (!isAllowedBrandingImage(file)) {
    return NextResponse.json(
      { error: "Upload a JPEG, PNG, WebP, GIF, or SVG image up to 5 MB." },
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
  const storagePath = buildPaymentMethodLogoStoragePath(methodId, ext, version);
  const existingLogos = await getPaymentMethodLogosSetting();
  const previous = existingLogos[methodId];

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
      { error: sanitizeErrorMessage(uploadError.message ?? "Could not upload logo.") },
      { status: 500 }
    );
  }

  const logoUpdatedAt = new Date().toISOString();
  const nextLogos = {
    ...existingLogos,
    [methodId]: { storage_path: storagePath, updated_at: logoUpdatedAt },
  };

  const { error: settingsError, updatedAt } = await savePaymentMethodLogosSetting(
    supabase,
    userId,
    nextLogos
  );

  if (settingsError) {
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(
          settingsError.message ?? "Logo uploaded but settings could not be saved."
        ),
      },
      { status: 500 }
    );
  }

  await logPlatformAdminAudit({
    actorId: userId,
    action: "payment_method_logo_uploaded",
    entityType: "site_settings",
    entityId: methodId,
    metadata: { storage_path: storagePath },
  });

  return NextResponse.json({
    success: true,
    method_id: methodId,
    storage_path: storagePath,
    updated_at: updatedAt,
    logo_updated_at: logoUpdatedAt,
  });
}

export async function DELETE(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, userId } = auth;
  const methodId = new URL(request.url).searchParams.get("methodId");

  if (!methodId || !isPaymentMethodLogoId(methodId)) {
    return NextResponse.json({ error: "A valid payment method is required." }, { status: 400 });
  }

  const existingLogos = await getPaymentMethodLogosSetting();
  const previous = existingLogos[methodId];

  if (previous?.storage_path) {
    await supabase.storage.from(LANDING_ASSETS_BUCKET).remove([previous.storage_path]);
  }

  const nextLogos = { ...existingLogos };
  delete nextLogos[methodId];

  const { error: settingsError } = await savePaymentMethodLogosSetting(
    supabase,
    userId,
    nextLogos
  );

  if (settingsError) {
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(settingsError.message ?? "Could not remove payment method logo."),
      },
      { status: 500 }
    );
  }

  await logPlatformAdminAudit({
    actorId: userId,
    action: "payment_method_logo_removed",
    entityType: "site_settings",
    entityId: methodId,
  });

  return NextResponse.json({ success: true, method_id: methodId });
}
