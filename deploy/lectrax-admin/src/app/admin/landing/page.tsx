import {
  buildLandingAssetPublicUrl,
  getLandingFeatureCardsSetting,
  getLandingHeroImageSetting,
  getLandingProductImagesSetting,
  getSiteLogoSetting,
} from "@/lib/landing/site-branding";
import { LANDING_FEATURE_CARDS, type FeatureCardId } from "@/lib/landing/feature-cards";
import { PRODUCTS, type ProductSlug } from "@/lib/landing/products";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminLandingHeroUpload } from "@/components/admin/admin-landing-hero-upload";
import { AdminLandingFeatureCards } from "@/components/admin/admin-landing-feature-cards";
import { AdminLandingProductImages } from "@/components/admin/admin-landing-product-images";
import { AdminSiteLogoUpload } from "@/components/admin/admin-site-logo-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminLandingPage() {
  const [heroSetting, logoSetting, featureCardSettings, productImageSettings] = await Promise.all([
    getLandingHeroImageSetting(),
    getSiteLogoSetting(),
    getLandingFeatureCardsSetting(),
    getLandingProductImagesSetting(),
  ]);

  const heroImageUrl = heroSetting?.storage_path
    ? buildLandingAssetPublicUrl(heroSetting.storage_path, heroSetting.updated_at)
    : null;

  const logoUrl = logoSetting?.storage_path
    ? buildLandingAssetPublicUrl(logoSetting.storage_path, logoSetting.updated_at)
    : null;

  const featureImages = LANDING_FEATURE_CARDS.reduce(
    (acc, card) => {
      const setting = featureCardSettings[card.id];
      acc[card.id] = {
        imageUrl: setting?.storage_path
          ? buildLandingAssetPublicUrl(setting.storage_path, setting.updated_at)
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

  const productImages = PRODUCTS.reduce(
    (acc, product) => {
      const setting = productImageSettings[product.slug];
      acc[product.slug] = {
        imageUrl: setting?.storage_path
          ? buildLandingAssetPublicUrl(setting.storage_path, setting.updated_at)
          : product.image,
        isCustom: Boolean(setting?.storage_path),
        updatedAt: setting?.updated_at ?? null,
      };
      return acc;
    },
    {} as Record<
      ProductSlug,
      { imageUrl: string; isCustom: boolean; updatedAt: string | null }
    >
  );

  return (
    <DashboardShell
      role="platform_admin"
      title="Landing Page"
      description="Manage the site logo, hero image, feature card covers, and product page images"
    >
      <div className="space-y-6">
        <nav
          aria-label="Landing page sections"
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-700"
        >
          <p className="font-medium text-slate-900">
            This page has four upload areas (logo, hero, feature cards, and product pages):
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              <a href="#site-logo" className="text-primary underline-offset-2 hover:underline">
                Site logo
              </a>
            </li>
            <li>
              <a href="#hero-image" className="text-primary underline-offset-2 hover:underline">
                Hero circle image
              </a>
            </li>
            <li>
              <a
                href="#feature-card-images"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Feature card images
              </a>{" "}
              — covers for &quot;Everything You Need to Manage Academic Activities&quot; (6 cards)
            </li>
            <li>
              <a
                href="#product-page-images"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Product page images
              </a>{" "}
              — hero images for Products nav links (6 pages)
            </li>
          </ol>
        </nav>

        <Card id="site-logo" className="scroll-mt-6">
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

        <Card id="hero-image" className="scroll-mt-6">
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

        <Card id="feature-card-images" className="scroll-mt-6 border-primary/30 ring-1 ring-primary/10">
          <CardHeader>
            <CardTitle>
              Feature card images — &quot;Everything You Need to Manage Academic Activities&quot;
            </CardTitle>
            <CardDescription>
              Upload cover images for the six feature cards in the &quot;Everything You Need to
              Manage Academic Activities&quot; section on the landing page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLandingFeatureCards initialImages={featureImages} />
          </CardContent>
        </Card>

        <Card id="product-page-images" className="scroll-mt-6 border-primary/30 ring-1 ring-primary/10">
          <CardHeader>
            <CardTitle>Product page images — Products nav links</CardTitle>
            <CardDescription>
              Upload hero images for each product page linked from the landing navbar Products
              dropdown (QR Attendance, Assignment Management, Continuous Assessment, Performance
              Analytics, Class Session Management, Secure Academic Records).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLandingProductImages initialImages={productImages} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
