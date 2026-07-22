import {
  LandingReveal,
  LandingStaggerList,
  LandingStaggerListItem,
} from "@/components/landing/landing-motion";
import {
  LandingHowItWorksIcon,
  type HowItWorksIconName,
} from "@/components/landing/landing-how-it-works-icon";

const steps: Array<{
  step: string;
  iconName: HowItWorksIconName;
  title: string;
  description: string;
}> = [
  {
    step: "01",
    iconName: "user-plus",
    title: "Create Your Account",
    description: "Sign up as a lecturer or student and set up your academic profile in minutes.",
  },
  {
    step: "02",
    iconName: "book-open",
    title: "Create a Class Session",
    description: "Launch a session with course details and share a unique code for students to join.",
  },
  {
    step: "03",
    iconName: "users",
    title: "Manage Attendance and Assessments",
    description: "Run QR attendance, record tests, grade assignments, and manage CA in one workflow.",
  },
  {
    step: "04",
    iconName: "bar-chart-3",
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
      <h3 className="mt-2 text-balance text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
        {title}
      </h3>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function MobileStepCard({
  step,
  iconName,
  title,
  description,
}: {
  step: string;
  iconName: HowItWorksIconName;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-5 lg:hidden">
      <div className="flex items-start gap-4">
        <LandingHowItWorksIcon step={step} iconName={iconName} size="lg" />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-widest text-accent sm:text-xs">
            Step {step}
          </span>
          <h3 className="mt-1.5 text-balance text-base font-semibold leading-snug text-slate-900 sm:text-lg">
            {title}
          </h3>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <LandingReveal className="mx-auto max-w-2xl px-1 text-center sm:px-0">
          <h2 className="text-balance text-2xl font-bold leading-snug tracking-tight text-slate-900 min-[400px]:text-3xl sm:text-3xl sm:leading-tight lg:text-4xl">
            How Lectrax Works
          </h2>
          <p className="mt-3.5 text-pretty text-base leading-relaxed text-slate-600 sm:mt-4 sm:text-base sm:leading-relaxed lg:text-lg">
            From setup to insights, a streamlined workflow built for modern academic teams.
          </p>
        </LandingReveal>

        <div className="relative mt-12 sm:mt-14 lg:mt-16">
          <div
            className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-primary/30 via-accent/30 to-primary/10 lg:block"
            aria-hidden
          />

          <LandingStaggerList className="flex flex-col gap-4 sm:gap-4 lg:gap-0">
            {steps.map((item, index) => {
              const isRight = index % 2 === 1;

              return (
                <LandingStaggerListItem
                  key={item.step}
                  className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-10 lg:py-5 xl:gap-x-16"
                >
                  <MobileStepCard
                    step={item.step}
                    iconName={item.iconName}
                    title={item.title}
                    description={item.description}
                  />

                  <div
                    className={
                      isRight
                        ? "hidden lg:col-start-3 lg:row-start-1 lg:flex lg:w-full lg:justify-end lg:pl-10 lg:pr-0 xl:pl-14"
                        : "hidden lg:col-start-1 lg:row-start-1 lg:flex lg:w-full lg:justify-start lg:pl-0 lg:pr-10 xl:pr-14"
                    }
                  >
                    <StepContent
                      step={item.step}
                      title={item.title}
                      description={item.description}
                      align={isRight ? "right" : "left"}
                    />
                  </div>

                  <div className="relative z-10 hidden justify-center lg:col-start-2 lg:row-start-1 lg:flex">
                    <LandingHowItWorksIcon
                      step={item.step}
                      iconName={item.iconName}
                      size="lg"
                    />
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
