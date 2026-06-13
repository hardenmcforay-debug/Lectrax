import { BarChart3, BookOpen, UserPlus, Users } from "lucide-react";
import {
  LandingReveal,
  LandingStaggerList,
  LandingStaggerListItem,
} from "@/components/landing/landing-motion";

const steps = [
  {
    step: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up as a lecturer or student and set up your academic profile in minutes.",
  },
  {
    step: "02",
    icon: BookOpen,
    title: "Create a Class Session",
    description: "Launch a session with course details and share a unique code for students to join.",
  },
  {
    step: "03",
    icon: Users,
    title: "Manage Attendance and Assessments",
    description: "Run QR attendance, record tests, grade assignments, and manage CA in one workflow.",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "Track Academic Performance",
    description: "Review analytics, export records, and monitor student progress with confidence.",
  },
];

function StepContent({
  step,
  title,
  description,
  align,
}: {
  step: string;
  title: string;
  description: string;
  align: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <div className={`max-w-md ${isRight ? "lg:text-right" : ""}`}>
      <span className="text-xs font-bold uppercase tracking-widest text-accent">Step {step}</span>
      <h3 className="mt-2 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  );
}

export function LandingHowItWorks() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <LandingReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How Lectrax Works
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From setup to insights, a streamlined workflow built for modern academic teams.
          </p>
        </LandingReveal>

        <div className="relative mt-16">
          <div
            className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-primary/30 via-accent/30 to-primary/10 lg:block"
            aria-hidden
          />

          <LandingStaggerList>
            {steps.map((item, index) => {
              const Icon = item.icon;
              const isRight = index % 2 === 1;

              return (
                <LandingStaggerListItem
                  key={item.step}
                  className="relative grid grid-cols-1 items-center gap-6 py-3 sm:py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-10 lg:py-5 xl:gap-x-16"
                >
                  <div
                    className={
                      isRight
                        ? "lg:col-start-3 lg:row-start-1 lg:flex lg:w-full lg:justify-end lg:pl-10 lg:pr-0 xl:pl-14"
                        : "lg:col-start-1 lg:row-start-1 lg:flex lg:w-full lg:justify-start lg:pl-0 lg:pr-10 xl:pr-14"
                    }
                  >
                    <StepContent
                      step={item.step}
                      title={item.title}
                      description={item.description}
                      align={isRight ? "right" : "left"}
                    />
                  </div>

                  <div className="relative z-10 flex justify-center lg:col-start-2 lg:row-start-1">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-md">
                      <Icon className="h-7 w-7 text-white" aria-hidden />
                    </div>
                  </div>
                </LandingStaggerListItem>
              );
            })}
          </LandingStaggerList>
        </div>
      </div>
    </section>
  );
}
