import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ProductPageContent } from "@/components/products/product-page-content";
import {
  getProductBySlug,
  isProductSlug,
  PRODUCT_SLUGS,
} from "@/lib/landing/products";
import "../../landing.css";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Product" };
  }

  return {
    title: product.title,
    description: product.summary,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  if (!isProductSlug(slug)) {
    notFound();
  }

  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <main>
        <ProductPageContent product={product} />
      </main>
      <LandingFooter />
    </div>
  );
}
