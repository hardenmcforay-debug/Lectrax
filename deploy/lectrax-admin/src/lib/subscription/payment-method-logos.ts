import { createPublicReadClient } from "@/lib/supabase/server";
import { buildLandingAssetPublicUrl } from "@/lib/landing/public-asset-url";
import type { BrandingImageSetting } from "@/lib/landing/site-branding";
import {
  PAYMENT_METHOD_LOGO_OPTIONS,
  type PaymentMethodLogoId,
} from "@/lib/subscription/payment-method-logo-ids";

export {
  PAYMENT_METHOD_LOGO_OPTIONS,
  buildPaymentMethodLogoStoragePath,
  isPaymentMethodLogoId,
  type PaymentMethodLogoId,
} from "@/lib/subscription/payment-method-logo-ids";

export const PAYMENT_METHOD_LOGOS_SETTING_KEY = "payment_method_logos";

export type PaymentMethodLogosSetting = {
  logos: Record<string, BrandingImageSetting>;
};

export async function getPaymentMethodLogosSetting(): Promise<
  Record<string, BrandingImageSetting>
> {
  const supabase = await createPublicReadClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", PAYMENT_METHOD_LOGOS_SETTING_KEY)
    .maybeSingle();

  if (error || !data?.value) return {};

  const value = data.value as PaymentMethodLogosSetting;
  return value.logos ?? {};
}

/** Public logo URLs keyed by payment method; null when no custom logo is uploaded. */
export async function getPaymentMethodLogoUrls(): Promise<
  Record<PaymentMethodLogoId, string | null>
> {
  const logos = await getPaymentMethodLogosSetting();
  const urls = {} as Record<PaymentMethodLogoId, string | null>;

  for (const option of PAYMENT_METHOD_LOGO_OPTIONS) {
    const setting = logos[option.id];
    if (!setting?.storage_path) {
      urls[option.id] = null;
      continue;
    }
    const url = buildLandingAssetPublicUrl(setting.storage_path, setting.updated_at);
    urls[option.id] = url || null;
  }

  return urls;
}
