import type { ComponentType } from "react";

import {
  AccuracyLogo,
  AdminWorkLogo,
  AssessmentLogo,
  EngagementLogo,
  SavesTimeLogo,
} from "@/components/landing/landing-benefit-logos";
import {
  LandingReveal,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/landing-motion";

const benefits: Array<{
  Logo: ComponentType<{ className?: string }>;
  title: string;
  stat: string;
  statLabel: string;
}> = [
  { Logo: SavesTimeLogo, title: "Saves Time", stat: "40%", statLabel: "less admin overhead" },
  {
    Logo: AdminWorkLogo,
    title: "Reduces Administrative Work",
    stat: "3×",
    statLabel: "faster record keeping",
  },
  {
    Logo: AccuracyLogo,
    title: "Improves Record Accuracy",
    stat: "99%",
    statLabel: "attendance traceability",
  },
  {
    Logo: AssessmentLogo,
    title: "Simplifies Assessment Tracking",
    stat: "1",
    statLabel: "unified CA dashboard",
  },
  {
    Logo: EngagementLogo,
    title: "Enhances Student Engagement",
    stat: "24/7",
    statLabel: "cloud access for students",
  },
];

export function LandingBenefits() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <LandingReveal className="px-1 sm:px-0">
            <h2 className="text-balance text-xl font-bold leading-snug tracking-tight text-slate-900 min-[400px]:text-2xl sm:text-3xl sm:leading-tight lg:text-4xl">
              Why Lecturers Choose Lectrax
            </h2>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:mt-4 sm:text-base sm:leading-relaxed lg:text-lg">
              Trusted by educators who need enterprise-grade reliability without enterprise-level
              complexity.
            </p>

            <LandingStagger className="mt-10 space-y-4">
              {benefits.map(({ Logo, title }) => (
                <LandingStaggerItem key={title}>
                  <div className="flex items-center gap-3">
                    <Logo className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
                    <span className="font-medium text-slate-800">{title}</span>
                  </div>
                </LandingStaggerItem>
              ))}
            </LandingStagger>
          </LandingReveal>

          <LandingStagger className="grid gap-4 sm:grid-cols-2">
            {benefits.slice(0, 4).map(({ title, stat, statLabel }) => (
              <LandingStaggerItem key={title}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center">
                  <p className="text-3xl font-bold text-primary">{stat}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {statLabel}
                  </p>
                  <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
                </div>
              </LandingStaggerItem>
            ))}
          </LandingStagger>
        </div>
      </div>
    </section>
  );
}
