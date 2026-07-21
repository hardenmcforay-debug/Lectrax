import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { LandingCta } from "@/components/landing/landing-cta";
import type { ProductDetail } from "@/lib/landing/products";
import { PRODUCTS } from "@/lib/landing/products";

type ProductPageContentProps = {
  product: ProductDetail;
};

export function ProductPageContent({ product }: ProductPageContentProps) {
  const otherProducts = PRODUCTS.filter((item) => item.slug !== product.slug);

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="border-b border-slate-200/80 bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Product</p>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {product.title}
            </h1>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-600 sm:text-xl">
              {product.headline}
            </p>
            <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              {product.summary}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-7 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Get Started
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Contact Us
              </Link>
            </div>
          </div>

          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
            <Image
              src={product.image}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {product.overview && product.overview.length > 0 ? (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Everything you need to know
              </h2>
              <div className="mt-6 space-y-4">
                {product.overview.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-relaxed text-slate-600 sm:text-lg">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section
        className={
          product.overview && product.overview.length > 0
            ? "border-y border-slate-200/80 bg-white py-16 sm:py-20"
            : "py-16 sm:py-20"
        }
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Why lecturers use {product.title}
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Built for real classroom workflows and academic accountability.
            </p>
          </div>

          <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
            {product.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <Check
                  aria-hidden
                  strokeWidth={2}
                  absoluteStrokeWidth
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#60A5FA]"
                />
                <span className="text-sm leading-relaxed text-slate-700 sm:text-base">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className={
          product.overview && product.overview.length > 0
            ? "py-16 sm:py-20"
            : "border-y border-slate-200/80 bg-white py-16 sm:py-20"
        }
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              How {product.title} works
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              A clear flow from class setup to recorded attendance.
            </p>
          </div>

          <ol className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
            {product.howItWorks.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-7"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Step {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {product.guides && product.guides.length > 0 ? (
        <section className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                How to use {product.title}
              </h2>
              <p className="mt-3 text-base text-slate-600 sm:text-lg">
                Step-by-step guidance for lecturers and students.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-2">
              {product.guides.map((guide) => (
                <div
                  key={guide.audience}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8"
                >
                  <h3 className="text-xl font-semibold text-slate-900">{guide.audience}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {guide.intro}
                  </p>
                  <ol className="mt-6 space-y-5">
                    {guide.steps.map((step) => (
                      <li key={step.title}>
                        <p className="font-semibold text-slate-900">{step.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {step.description}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {product.keyFacts && product.keyFacts.length > 0 ? (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Important details
              </h2>
              <p className="mt-3 text-base text-slate-600 sm:text-lg">
                Key facts that help you use {product.title} correctly.
              </p>
            </div>

            <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
              {product.keyFacts.map((fact) => (
                <li
                  key={fact}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-relaxed text-slate-700 shadow-sm sm:text-base"
                >
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {product.faqs && product.faqs.length > 0 ? (
        <section className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Frequently asked questions
              </h2>
            </div>

            <div className="mx-auto mt-10 max-w-3xl space-y-4">
              {product.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6"
                >
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              What you gain
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {product.outcomes.map((outcome) => (
              <div
                key={outcome}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
              >
                <p className="text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                  {outcome}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Explore more products
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Every Lectrax capability works together in one academic platform.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherProducts.map((item) => (
              <Link
                key={item.slug}
                href={`/products/${item.slug}`}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition-colors hover:border-primary/30 hover:bg-white hover:shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-900">{item.navLabel}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.headline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <LandingCta />
    </div>
  );
}
