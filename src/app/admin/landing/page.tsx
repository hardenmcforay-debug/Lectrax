import {
  buildLandingAssetPublicUrl,
  getLandingFeatureCardsSetting,
  getLandingHeroImageSetting,
  getSiteLogoSetting,
} from "@/lib/landing/site-branding";
import { LANDING_FEATURE_CARDS, type FeatureCardId } from "@/lib/landing/feature-cards";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminLandingHeroUpload } from "@/components/admin/admin-landing-hero-upload";
import { AdminLandingFeatureCards } from "@/components/admin/admin-landing-feature-cards";
import { AdminSiteLogoUpload } from "@/components/admin/admin-site-logo-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminLandingPage() {
  const [heroSetting, logoSetting, featureCardSettings] = await Promise.all([
    getLandingHeroImageSetting(),
    getSiteLogoSetting(),
    getLandingFeatureCardsSetting(),
  ]);

  const heroImageUrl = heroSetting?.storage_path
    ? buildLandingAssetPublicUrl(heroSetting.storage_path)
    : null;

  const logoUrl = logoSetting?.storage_path
    ? buildLandingAssetPublicUrl(logoSetting.storage_path)
    : null;

  const featureImages = LANDING_FEATURE_CARDS.reduce(
    (acc, card) => {
      const setting = featureCardSettings[card.id];
      acc[card.id] = {
        imageUrl: setting?.storage_path
          ? buildLandingAssetPublicUrl(setting.storage_path)
          : card.defaultImage,
        isCustom: Boolean(setting?.storage_path),
        updatedAt: setting?.updated_at ?? null,
      };
      return acc;
    },
    {} as Record<
      FeatureCardId,
      { imageUrl: string; isCustom: boolean; updatedAt: string | null }
    >
  );

  return (
    <DashboardShell
      role="platform_admin"
      title="Landing Page"
      description="Manage the site logo, hero image, and feature card covers on the public homepage"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Site logo</CardTitle>
            <CardDescription>
              Upload your logo to Supabase storage. It replaces the default icon across the
              navbar, sidebar, footer, and auth pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminSiteLogoUpload
              initialLogoUrl={logoUrl}
              initialUpdatedAt={logoSetting?.updated_at ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hero circle image</CardTitle>
            <CardDescription>
              Upload an image to Supabase storage. It appears inside the glowing portal on the
              landing page hero section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLandingHeroUpload
              initialImageUrl={heroImageUrl}
              initialUpdatedAt={heroSetting?.updated_at ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature card images</CardTitle>
            <CardDescription>
              Upload cover images for the six feature cards in the &quot;Everything You Need to
              Manage Academic Activities&quot; section on the landing page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLandingFeatureCards initialImages={featureImages} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
