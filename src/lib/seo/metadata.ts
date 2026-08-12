import type { Metadata } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import {
  absoluteUrl,
  CANONICAL_SITE_ORIGIN,
  DEFAULT_OG_IMAGE_PATH,
} from "@/lib/seo/site";

const pageTitle = `${APP_NAME} | Modern Academic Management Platform`;

/** Shared Open Graph / Twitter image for public marketing pages. */
export function defaultOgImages() {
  return [
    {
      url: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
      width: 512,
      height: 512,
      alt: `${APP_NAME} logo`,
    },
  ];
}

/** Root metadata defaults — public pages are indexable; private layouts override. */
export function buildRootMetadata(): Metadata {
  return {
    metadataBase: new URL(CANONICAL_SITE_ORIGIN),
    title: {
      default: pageTitle,
      template: `%s | ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    applicationName: APP_NAME,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: pageTitle,
      description: APP_DESCRIPTION,
      url: absoluteUrl("/"),
      siteName: APP_NAME,
      locale: "en_US",
      type: "website",
      images: defaultOgImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: APP_DESCRIPTION,
      images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    },
  };
}

/** Metadata helpers for public marketing pages (indexable + canonical). */
export function publicPageMetadata(options: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonicalPath = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const url = absoluteUrl(canonicalPath);

  return {
    title: options.title,
    description: options.description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url,
      siteName: APP_NAME,
      locale: "en_US",
      type: "website",
      images: defaultOgImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    },
  };
}

/** Private / auth / app-shell pages must stay out of search indexes. */
export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};
