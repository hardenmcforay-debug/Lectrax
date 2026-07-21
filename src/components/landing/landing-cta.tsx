import Link from "next/link";

import { LandingReveal } from "@/components/landing/landing-motion";

export function LandingCta() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <LandingReveal>
          <div
            className="relative overflow-hidden rounded-2xl px-8 py-8 shadow-[0_16px_36px_-10px_rgba(11,61,145,0.32)] sm:rounded-[24px] sm:px-10 sm:py-10 lg:px-12 lg:py-11"
            style={{
              background:
                "linear-gradient(135deg, #0B3D91 0%, #1455C4 48%, #1E6DFF 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 70% 80% at 85% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)",
              }}
            />

            <div className="relative flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="max-w-xl text-center lg:text-left">
                <h2 className="text-balance text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl sm:leading-tight lg:text-[34px]">
                  Transform Academic Management with Lectrax
                </h2>
                <p className="mt-3 text-pretty text-base leading-relaxed text-white/85 sm:mt-3.5 sm:text-lg">
                  Let us simplify your academic management.
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  href="/signup"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-7 text-sm font-semibold text-[#0B3D91] shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1455C4] sm:h-12 sm:px-8 sm:text-base"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
