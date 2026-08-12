import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/contact/constants";
import {
  absoluteUrl,
  CANONICAL_SITE_ORIGIN,
  DEFAULT_OG_IMAGE_PATH,
} from "@/lib/seo/site";

/** JSON-LD for the public marketing homepage (Organization + WebSite + SoftwareApplication). */
export function buildMarketingStructuredData() {
  const logoUrl = absoluteUrl(DEFAULT_OG_IMAGE_PATH);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${CANONICAL_SITE_ORIGIN}/#organization`,
        name: APP_NAME,
        url: CANONICAL_SITE_ORIGIN,
        logo: logoUrl,
        email: CONTACT_EMAIL,
        description: APP_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${CANONICAL_SITE_ORIGIN}/#website`,
        name: APP_NAME,
        url: CANONICAL_SITE_ORIGIN,
        description: APP_DESCRIPTION,
        publisher: { "@id": `${CANONICAL_SITE_ORIGIN}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${CANONICAL_SITE_ORIGIN}/#software`,
        name: APP_NAME,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: CANONICAL_SITE_ORIGIN,
        description: APP_DESCRIPTION,
        slogan: APP_TAGLINE,
        publisher: { "@id": `${CANONICAL_SITE_ORIGIN}/#organization` },
      },
    ],
  };
}
