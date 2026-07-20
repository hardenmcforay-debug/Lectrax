import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  LineChart,
  QrCode,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

const values = [
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

const capabilities = [
  { icon: QrCode, title: "QR Attendance", description: "Fast, secure check-ins for every session." },
  {
    icon: ClipboardList,
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
  { icon: Clock, title: "Saves Time", stat: "40%", statLabel: "less admin overhead" },
  { icon: ShieldCheck, title: "Reduces Administrative Work", stat: "3×", statLabel: "faster record keeping" },
  { icon: CheckCircle2, title: "Improves Record Accuracy", stat: "99%", statLabel: "attendance traceability" },
  { icon: Users, title: "Enhances Student Engagement", stat: "24/7", statLabel: "cloud access for students" },
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
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6"
              >
                <div className="landing-icon-bg flex h-11 w-11 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5 text-slate-300" />
                </div>
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
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Create your account today or reach out if you&apos;d like to learn more about{" "}
            {APP_NAME} for your institution.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" variant="accent" className="rounded-xl px-8" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl px-8" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
