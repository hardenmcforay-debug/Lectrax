import Link from "next/link";

import { Button } from "@/components/ui/button";

import { LandingReveal } from "@/components/landing/landing-motion";



export function LandingCta() {

  return (

    <section className="bg-primary py-20 sm:py-24">

      <LandingReveal className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">

        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">

          Transform Academic Management with Lectrax

        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">

          Join lecturers and institutions using Lectrax to streamline academic activities.

        </p>

        <Button

          size="lg"

          variant="accent"

          className="mt-10 h-12 rounded-xl px-10 text-base"

          asChild

        >

          <Link href="/signup">Get Started Today</Link>

        </Button>

      </LandingReveal>

    </section>

  );

}


