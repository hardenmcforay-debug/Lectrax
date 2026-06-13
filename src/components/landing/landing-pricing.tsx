import Link from "next/link";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import {

  LandingReveal,

  LandingStagger,

  LandingStaggerItem,

} from "@/components/landing/landing-motion";

import { BILLING_PLANS } from "@/lib/subscription/constants";

import { cn } from "@/lib/utils";



const freeFeatures = [

  "2 Active Class Sessions",

  "50 Students Per Session",

  "Attendance Tracking",

  "Manual Assignment Grading",

  "Test Records",

  "CA Calculation",

  "Export Features",

];



const standardFeatures = [

  "Unlimited Students",

  "Unlimited Sessions",

  "Assignment Submissions",

  "Analytics Dashboard",

  "Audit Logs",

  "Premium Features",

];



const billingOptions: Array<{

  id: keyof typeof BILLING_PLANS;

  price: number;

  days: number;

  label: string;

  description: string;

  recommended?: boolean;

}> = [

  { id: "monthly", ...BILLING_PLANS.monthly },

  { id: "semester", ...BILLING_PLANS.semester, recommended: true },

  { id: "annual", ...BILLING_PLANS.annual },

];



export function LandingPricing() {

  return (

    <section id="pricing" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <LandingReveal className="mx-auto max-w-2xl text-center">

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">

            Simple and Transparent Pricing

          </h2>

          <p className="mt-4 text-lg text-slate-600">

            Start free. Upgrade when your institution needs more capacity and premium capabilities.

          </p>

        </LandingReveal>



        <LandingStagger className="mt-14 grid gap-8 lg:grid-cols-2">

          <LandingStaggerItem>

            <div className="h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

              <h3 className="text-xl font-bold text-slate-900">Free Plan</h3>

              <p className="mt-2 text-4xl font-bold text-slate-900">

                $0

                <span className="text-base font-normal text-slate-500"> / forever</span>

              </p>

              <ul className="mt-8 space-y-3">

                {freeFeatures.map((f) => (

                  <li key={f} className="flex items-start gap-3 text-sm text-slate-600">

                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/10">

                      <Check className="h-3 w-3 text-accent" aria-hidden />

                    </div>

                    {f}

                  </li>

                ))}

              </ul>

              <Button variant="outline" className="mt-8 w-full rounded-xl" asChild>

                <Link href="/signup?role=lecturer">Get Started Free</Link>

              </Button>

            </div>

          </LandingStaggerItem>



          <LandingStaggerItem>

            <div className="relative h-full rounded-2xl border-2 border-accent bg-white p-8 shadow-lg ring-1 ring-accent/20">

              <Badge variant="accent" className="absolute -top-3 left-8">

                Recommended

              </Badge>

              <h3 className="text-xl font-bold text-slate-900">Standard Plan</h3>

              <p className="mt-2 text-sm text-slate-600">Lectrax Premium, full platform access</p>

              <ul className="mt-8 space-y-3">

                {standardFeatures.map((f) => (

                  <li key={f} className="flex items-start gap-3 text-sm text-slate-600">

                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/10">

                      <Check className="h-3 w-3 text-accent" aria-hidden />

                    </div>

                    {f}

                  </li>

                ))}

              </ul>

              <Button variant="accent" className="mt-8 w-full rounded-xl" asChild>

                <Link href="/signup?role=lecturer">Upgrade to Standard</Link>

              </Button>

            </div>

          </LandingStaggerItem>

        </LandingStagger>



        <LandingStagger className="mt-12 grid gap-6 md:grid-cols-3">

          {billingOptions.map((plan) => (

            <LandingStaggerItem key={plan.id}>

              <div

                className={cn(

                  "h-full rounded-xl border bg-white p-6 text-center",

                  plan.recommended ? "border-accent ring-2 ring-accent/30" : "border-slate-200"

                )}

              >

                {plan.recommended && (

                  <Badge variant="accent" className="mb-3">

                    Best Value

                  </Badge>

                )}

                <p className="font-semibold text-slate-900">{plan.label}</p>

                <p className="mt-2 text-3xl font-bold text-primary">${plan.price}</p>

                <p className="mt-1 text-sm text-slate-500">{plan.description}</p>

              </div>

            </LandingStaggerItem>

          ))}

        </LandingStagger>

      </div>

    </section>

  );

}


