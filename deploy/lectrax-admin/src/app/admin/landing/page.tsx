import {
  buildLandingAssetPublicUrl,
  getLandingHeroImageSetting,
  getSiteLogoSetting,
} from "@/lib/landing/site-branding";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminLandingHeroUpload } from "@/components/admin/admin-landing-hero-upload";
import { AdminSiteLogoUpload } from "@/components/admin/admin-site-logo-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminLandingPage() {
  const [heroSetting, logoSetting] = await Promise.all([
    getLandingHeroImageSetting(),
    getSiteLogoSetting(),
  ]);

  const heroImageUrl = heroSetting?.storage_path
    ? buildLandingAssetPublicUrl(heroSetting.storage_path)
    : null;

  const logoUrl = logoSetting?.storage_path
    ? buildLandingAssetPublicUrl(logoSetting.storage_path)
    : null;

  return (
    <DashboardShell
      role="platform_admin"
      title="Landing Page"
      description="Manage the site logo and hero image on the public homepage"
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
      </div>
    </DashboardShell>
  );
}
