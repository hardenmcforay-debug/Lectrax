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
  "Two tests & assignments",
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
        <LandingReveal className="mx-auto max-w-2xl px-1 text-center sm:px-0">
          <h2 className="text-balance text-3xl font-bold leading-snug tracking-tight text-slate-900 sm:text-3xl sm:leading-tight lg:text-4xl">
            Simple and Transparent Pricing
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-600 sm:mt-4 lg:text-lg">
            Start free. Upgrade when your institution needs more capacity and premium capabilities.
          </p>
        </LandingReveal>

        <LandingStagger className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-2 lg:gap-8">
          <LandingStaggerItem>
            <div className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6 lg:p-8">
              <h3 className="text-lg font-bold text-slate-900 sm:text-xl">Free Plan</h3>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 sm:mt-2 sm:text-4xl">
                $0
                <span className="text-sm font-normal text-slate-500 sm:text-base"> / forever</span>
              </p>
              <ul className="mt-4 space-y-2 sm:mt-6 sm:space-y-2.5 lg:mt-8 lg:space-y-3">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600 sm:gap-3 sm:text-sm">
                    <Check
                      aria-hidden
                      strokeWidth={2}
                      absoluteStrokeWidth
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA] sm:h-5 sm:w-5"
                    />
                    <span className="text-pretty leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-5 h-10 w-full rounded-xl text-sm sm:mt-6 lg:mt-8" asChild>
                <Link href="/signup?role=lecturer">Get Started Free</Link>
              </Button>
            </div>
          </LandingStaggerItem>

          <LandingStaggerItem>
            <div className="relative h-full rounded-xl border-2 border-accent bg-white p-4 shadow-lg ring-1 ring-accent/20 sm:rounded-2xl sm:p-6 lg:p-8">
              <Badge variant="accent" className="absolute -top-2.5 left-4 text-[10px] sm:-top-3 sm:left-6 sm:text-xs lg:left-8">
                Recommended
              </Badge>
              <h3 className="text-lg font-bold text-slate-900 sm:text-xl">Standard Plan</h3>
              <p className="mt-1.5 text-pretty text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm">
                Lectrax Premium, full platform access
              </p>
              <ul className="mt-4 space-y-2 sm:mt-6 sm:space-y-2.5 lg:mt-8 lg:space-y-3">
                {standardFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600 sm:gap-3 sm:text-sm">
                    <Check
                      aria-hidden
                      strokeWidth={2}
                      absoluteStrokeWidth
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA] sm:h-5 sm:w-5"
                    />
                    <span className="text-pretty leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="accent" className="mt-5 h-10 w-full rounded-xl text-sm sm:mt-6 lg:mt-8" asChild>
                <Link href="/signup?role=lecturer">Upgrade to Standard</Link>
              </Button>
            </div>
          </LandingStaggerItem>
        </LandingStagger>

        <LandingStagger className="mt-8 grid grid-cols-3 gap-2 sm:mt-10 sm:gap-3 md:mt-12 md:gap-4">
          {billingOptions.map((plan) => (
            <LandingStaggerItem key={plan.id}>
              <div
                className={cn(
                  "flex h-full min-w-0 flex-col items-center rounded-xl border bg-white p-3 text-center sm:rounded-2xl sm:p-4 md:p-6",
                  plan.recommended ? "border-accent ring-2 ring-accent/30" : "border-slate-200"
                )}
              >
                {plan.recommended ? (
                  <Badge variant="accent" className="mb-2 px-1.5 py-0 text-[10px] sm:mb-2 sm:px-2 sm:py-0.5 sm:text-xs">
                    Best Value
                  </Badge>
                ) : (
                  <span className="mb-2 block h-[18px] sm:h-5" aria-hidden />
                )}
                <p className="text-balance text-xs font-semibold leading-tight text-slate-900 sm:text-sm md:text-base">
                  {plan.label}
                </p>
                <p className="mt-1.5 text-xl font-bold text-primary sm:mt-2 sm:text-2xl md:text-3xl">
                  ${plan.price}
                </p>
                <p className="mt-1 text-pretty text-[11px] leading-snug text-slate-500 sm:text-xs md:text-sm">
                  {plan.description}
                </p>
              </div>
            </LandingStaggerItem>
          ))}
        </LandingStagger>
      </div>
    </section>
  );
}
