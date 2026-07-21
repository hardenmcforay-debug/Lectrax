import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardCheck,
  LineChart,
  ScanQrCode,
  ShieldCheck,
  Target,
} from "lucide-react";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

const values: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Target,
    title: "Built for educators",
    description:
      "Every feature is designed around real classroom workflows, from QR attendance to continuous assessment.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    description:
      "Role-based access, encrypted connections, and audit trails keep academic records protected.",
  },
  {
    icon: LineChart,
    title: "Data-driven insights",
    description:
      "Track attendance trends, assignment progress, and student performance from one dashboard.",
  },
];

const capabilities: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: ScanQrCode,
    title: "QR Attendance",
    description: "Fast, secure check-ins for every session.",
  },
  {
    icon: ClipboardCheck,
    title: "Continuous Assessment",
    description: "Record and monitor CA scores in a unified workflow.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Visual insights into class and student progress.",
  },
];

const stats = [
  { title: "Saves Time", stat: "40%", statLabel: "less admin overhead" },
  { title: "Reduces Administrative Work", stat: "3×", statLabel: "faster record keeping" },
  { title: "Improves Record Accuracy", stat: "99%", statLabel: "attendance traceability" },
  { title: "Enhances Student Engagement", stat: "24/7", statLabel: "cloud access for students" },
];

export function AboutPageContent() {
  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="border-b border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            About {APP_NAME}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{APP_DESCRIPTION}</p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Our mission
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                {APP_NAME} exists to simplify academic administration for lecturers and institutions.
                We bring attendance tracking, assignments, continuous assessment, and student
                analytics into one modern platform so educators can focus on teaching not paperwork.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Whether you manage a single class or an entire department, {APP_NAME} gives you the
                tools to run sessions, record grades, and monitor performance with confidence.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {stats.map(({ title, stat, statLabel }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
                >
                  <p className="text-3xl font-bold text-primary">{stat}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {statLabel}
                  </p>
                  <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              What we help you manage
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Core capabilities that power modern academic workflows on {APP_NAME}.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-6"
              >
                <Icon
                  aria-hidden
                  strokeWidth={2}
                  absoluteStrokeWidth
                  className="h-8 w-8 text-[#60A5FA] transition-[color,transform] duration-200 ease-out group-hover:scale-[1.08] group-hover:text-[#3B82F6]"
                />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Why lecturers choose {APP_NAME}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Trusted by educators who need enterprise-grade reliability without enterprise-level
              complexity.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <Icon
                  aria-hidden
                  strokeWidth={2}
                  absoluteStrokeWidth
                  className="h-8 w-8 text-[#60A5FA] transition-[color,transform] duration-200 ease-out group-hover:scale-[1.08] group-hover:text-[#3B82F6]"
                />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
                  Ready to get started?
                </h2>
                <p className="mt-3 text-pretty text-base leading-relaxed text-white/85 sm:mt-3.5 sm:text-lg">
                  Create your account today or reach out if you&apos;d like to learn more about{" "}
                  {APP_NAME}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-7 text-sm font-semibold text-[#0B3D91] shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1455C4] sm:h-12 sm:px-8 sm:text-base"
                >
                  Get Started
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/50 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1455C4] sm:h-12 sm:px-8 sm:text-base"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
