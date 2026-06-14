import Link from "next/link";

import { Button } from "@/components/ui/button";

import { LandingReveal } from "@/components/landing/landing-motion";



export function LandingCta() {

  return (

    <section className="bg-primary py-20 sm:py-24">

      <LandingReveal className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-balance text-xl font-bold leading-snug tracking-tight text-white min-[400px]:text-2xl sm:text-3xl sm:leading-tight lg:text-4xl">
          Transform Academic Management with Lectrax
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-white/80 sm:mt-4 sm:text-base sm:leading-relaxed lg:text-lg">
          Join lecturers and institutions using Lectrax to streamline academic activities.
        </p>
        <Button
          size="lg"
          variant="accent"
          className="mt-6 h-10 w-full rounded-xl px-6 text-sm font-semibold sm:mt-8 sm:h-12 sm:w-auto sm:px-10 sm:text-base lg:mt-10"
          asChild
        >
          <Link href="/signup">Get Started Today</Link>
        </Button>
      </LandingReveal>

    </section>

  );

}


