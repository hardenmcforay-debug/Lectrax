import Link from "next/link";

import { Button } from "@/components/ui/button";
import { UniversityPartnershipsLogo } from "@/components/contact/university-partnerships-logo";
import { LandingReveal } from "@/components/landing/landing-motion";

export function LandingUniversityPartnerships() {
  return (
    <section className="scroll-mt-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 py-20 sm:py-24">
      <LandingReveal className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <UniversityPartnershipsLogo className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
          <h2 className="text-balance text-xl font-bold leading-snug tracking-tight text-slate-900 min-[400px]:text-2xl sm:text-3xl sm:leading-tight lg:text-4xl">
            University Partnerships
          </h2>
        </div>

        <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:mt-4 sm:text-base sm:leading-relaxed lg:text-lg">
          Empower your lecturers with a centralized academic management platform designed for
          attendance tracking, assessments, assignments, and student performance management.
        </p>

        <p className="mt-2.5 text-pretty text-xs leading-relaxed text-slate-500 sm:mt-3 sm:text-sm sm:leading-relaxed md:text-base">
          Universities and academic departments can partner with Lectrax to provide premium access for
          their lecturers through an annual departmental subscription plan. Our team will assist with
          onboarding, setup, and lecturer activation.
        </p>

        <Button
          className="mt-6 h-10 w-full rounded-xl bg-[#1455C4] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(20,85,196,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#0B3D91] hover:shadow-[0_14px_28px_-8px_rgba(11,61,145,0.5)] focus-visible:ring-[#1455C4] sm:mt-8 sm:h-11 sm:w-auto sm:px-8 md:text-base"
          asChild
        >
          <Link href="/partnerships">Request Partnership</Link>
        </Button>
      </LandingReveal>

    </section>

  );

}


