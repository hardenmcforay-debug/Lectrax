import Link from "next/link";

import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LandingReveal } from "@/components/landing/landing-motion";



export function LandingUniversityPartnerships() {

  return (

    <section className="scroll-mt-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 py-20 sm:py-24">

      <LandingReveal className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary sm:px-4 sm:py-1.5 sm:text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary sm:h-6 sm:w-6">
            <Building2 className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" aria-hidden />
          </span>
          <span className="text-pretty leading-snug">For universities and academic departments</span>
        </div>

        <h2 className="mt-4 text-balance text-xl font-bold leading-snug tracking-tight text-slate-900 min-[400px]:text-2xl sm:mt-5 sm:text-3xl sm:leading-tight lg:text-4xl">
          University Partnerships
        </h2>

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
          variant="accent"
          className="mt-6 h-10 w-full rounded-xl px-6 text-sm font-semibold sm:mt-8 sm:h-11 sm:w-auto sm:px-8 md:text-base"
          asChild
        >
          <Link href="/partnerships">Request Partnership</Link>
        </Button>
      </LandingReveal>

    </section>

  );

}


