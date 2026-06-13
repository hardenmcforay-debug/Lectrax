import Link from "next/link";

import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LandingReveal } from "@/components/landing/landing-motion";



export function LandingUniversityPartnerships() {

  return (

    <section className="scroll-mt-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 py-20 sm:py-24">

      <LandingReveal className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">

        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">

          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">

            <Building2 className="h-3.5 w-3.5 text-white" aria-hidden />

          </span>

          For universities and academic departments

        </div>



        <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">

          University Partnerships

        </h2>



        <p className="mt-4 text-lg text-slate-600">

          Empower your lecturers with a centralized academic management platform designed for

          attendance tracking, assessments, assignments, and student performance management.

        </p>



        <p className="mt-3 text-base text-slate-500">

          Universities and academic departments can partner with Lectrax to provide premium access for

          their lecturers through an annual departmental subscription plan. Our team will assist with

          onboarding, setup, and lecturer activation.

        </p>



        <Button variant="accent" className="mt-8 h-11 rounded-xl px-8 text-sm font-semibold md:text-base" asChild>

          <Link href="/partnerships">Request Partnership</Link>

        </Button>

      </LandingReveal>

    </section>

  );

}


