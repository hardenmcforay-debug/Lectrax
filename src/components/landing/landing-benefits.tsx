import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  LandingReveal,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/landing-motion";

const benefits: Array<{
  icon: LucideIcon;
  title: string;
  stat: string;
  statLabel: string;
}> = [
  { icon: Clock, title: "Saves Time", stat: "40%", statLabel: "less admin overhead" },
  {
    icon: ShieldCheck,
    title: "Reduces Administrative Work",
    stat: "3×",
    statLabel: "faster record keeping",
  },
  {
    icon: CheckCircle2,
    title: "Improves Record Accuracy",
    stat: "99%",
    statLabel: "attendance traceability",
  },
  {
    icon: ClipboardCheck,
    title: "Simplifies Assessment Tracking",
    stat: "1",
    statLabel: "unified CA dashboard",
  },
  {
    icon: Users,
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
              {benefits.map(({ icon: Icon, title }) => (
                <LandingStaggerItem key={title}>
                  <div className="group flex items-center gap-3">
                    <Icon
                      aria-hidden
                      strokeWidth={2}
                      absoluteStrokeWidth
                      className="h-6 w-6 shrink-0 text-[#60A5FA] transition-[color,transform] duration-200 ease-out group-hover:scale-[1.08] group-hover:text-[#3B82F6] sm:h-7 sm:w-7"
                    />
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
