import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { isFeatureCardId } from "@/lib/landing/feature-cards";
import {
  LANDING_ASSETS_BUCKET,
  LANDING_FEATURE_CARDS_SETTING_KEY,
  BRANDING_ASSET_CACHE_CONTROL,
  buildFeatureCardStoragePath,
  extensionForImageMime,
  getLandingFeatureCardsSetting,
  isAllowedBrandingImage,
  type LandingFeatureCardsSetting,
  type BrandingImageSetting,
} from "@/lib/landing/site-branding";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { brandingExtensionMatchesMime } from "@/lib/security/file-validation";

type AdminSupabase = Extract<
  Awaited<ReturnType<typeof requirePlatformAdmin>>,
  { supabase: unknown }
>["supabase"];

async function saveFeatureCardsSetting(
  supabase: AdminSupabase,
  userId: string,
  cards: Record<string, BrandingImageSetting>
) {
  const updatedAt = new Date().toISOString();
  const value: LandingFeatureCardsSetting = { cards };

  const { error } = await supabase.from("site_settings").upsert(
    {
      key: LANDING_FEATURE_CARDS_SETTING_KEY,
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
  const cardId = formData.get("cardId");

  if (typeof cardId !== "string" || !isFeatureCardId(cardId)) {
    return NextResponse.json({ error: "A valid feature card is required." }, { status: 400 });
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

  const ext = extensionForImageMime(file.type);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  const version = Date.now();
  const storagePath = buildFeatureCardStoragePath(cardId, ext, version);
  const existingCards = await getLandingFeatureCardsSetting();
  const previous = existingCards[cardId];

  if (previous?.storage_path) {
    await supabase.storage.from(LANDING_ASSETS_BUCKET).remove([previous.storage_path]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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

  const cardUpdatedAt = new Date().toISOString();
  const nextCards = {
    ...existingCards,
    [cardId]: { storage_path: storagePath, updated_at: cardUpdatedAt },
  };

  const { error: settingsError, updatedAt } = await saveFeatureCardsSetting(
    supabase,
    userId,
    nextCards
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

  return NextResponse.json({
    success: true,
    card_id: cardId,
    storage_path: storagePath,
    updated_at: updatedAt,
    card_updated_at: cardUpdatedAt,
  });
}

export async function DELETE(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, userId } = auth;
  const cardId = new URL(request.url).searchParams.get("cardId");

  if (!cardId || !isFeatureCardId(cardId)) {
    return NextResponse.json({ error: "A valid feature card is required." }, { status: 400 });
  }

  const existingCards = await getLandingFeatureCardsSetting();
  const previous = existingCards[cardId];

  if (previous?.storage_path) {
    await supabase.storage.from(LANDING_ASSETS_BUCKET).remove([previous.storage_path]);
  }

  const nextCards = { ...existingCards };
  delete nextCards[cardId];

  const { error: settingsError } = await saveFeatureCardsSetting(supabase, userId, nextCards);

  if (settingsError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(settingsError.message ?? "Could not remove feature card image.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, card_id: cardId });
}
