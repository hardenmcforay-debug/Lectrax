import Image from "next/image";
import Link from "next/link";
import { Check, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LandingCta } from "@/components/landing/landing-cta";
import { PARTNERSHIP_BENEFITS, PARTNERSHIP_PACKAGES } from "@/lib/partnerships/constants";
import { BILLING_PLANS } from "@/lib/subscription/constants";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/monime/payment-methods";
import type { PaymentMethodLogoId } from "@/lib/subscription/payment-method-logo-ids";
import { cn } from "@/lib/utils";

const PAYMENT_LOGO_CARD_CLASS =
  "relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden p-1 sm:h-32 sm:w-32 sm:p-1.5";

function PaymentMethodLogo({
  label,
  logoUrl,
}: {
  label: string;
  logoUrl: string | null | undefined;
}) {
  if (logoUrl) {
    return (
      <span className={PAYMENT_LOGO_CARD_CLASS}>
        <span className="relative h-full w-full">
          <Image
            src={logoUrl}
            alt={`${label} logo`}
            fill
            unoptimized
            className="object-contain"
            sizes="(max-width: 640px) 112px, 128px"
          />
        </span>
      </span>
    );
  }

  return (
    <span className={PAYMENT_LOGO_CARD_CLASS}>
      <Smartphone className="h-12 w-12 text-accent sm:h-14 sm:w-14" aria-hidden />
    </span>
  );
}

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

const billingOptions = [
  { id: "monthly" as const, ...BILLING_PLANS.monthly },
  { id: "semester" as const, ...BILLING_PLANS.semester, recommended: true },
  { id: "annual" as const, ...BILLING_PLANS.annual },
];

const lecturerHowItWorks = [
  {
    title: "Create your lecturer account",
    description: "Sign up free and start with the Free Plan. Students always use Lectrax at no cost.",
  },
  {
    title: "Choose a Premium plan when you need more",
    description:
      "Upgrade to Monthly, Semester, or 8 Months when you need unlimited sessions, students, and premium tools.",
  },
  {
    title: "Pay with a local payment method",
    description:
      "Complete checkout with Orange Money, Afrimoney, or card through Monime. Amounts are charged in SLE at checkout.",
  },
  {
    title: "Activate and keep teaching",
    description:
      "Once payment is confirmed, Premium access is activated automatically so you can continue managing your classes.",
  },
];

const partnershipHowItWorks = [
  {
    title: "Select a departmental package",
    description:
      "Choose Small, Medium, or Large based on how many lecturers your department needs to cover for the year.",
  },
  {
    title: "Submit a partnership inquiry",
    description:
      "Share your university and department details through the University Partnerships form.",
  },
  {
    title: "Talk with the Lectrax team",
    description:
      "Our team reviews your request and contacts you to discuss onboarding, setup, and lecturer activation.",
  },
  {
    title: "Onboard your lecturers",
    description:
      "After approval, Lectrax helps activate lecturers under your departmental plan so your faculty can start quickly.",
  },
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 sm:text-base">
          <Check
            aria-hidden
            strokeWidth={2}
            absoluteStrokeWidth
            className="mt-0.5 h-5 w-5 shrink-0 text-[#60A5FA]"
          />
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingPageContent({
  paymentMethodLogos,
}: {
  paymentMethodLogos: Record<PaymentMethodLogoId, string | null>;
}) {
  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="border-b border-slate-200/80 bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Simple and Transparent Pricing
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-600">
            Choose lecturer subscriptions for individual educators, or university partnership packages
            for departments. Students always use Lectrax for free.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Lecturer Subscriptions
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Start free, then upgrade to Lectrax Premium when your teaching needs grow.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-xl font-bold text-slate-900">Free Plan</h3>
              <p className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                $0
                <span className="text-base font-normal text-slate-500"> / forever</span>
              </p>
              <FeatureList items={freeFeatures} />
              <Link
                href="/signup?role=lecturer"
                className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                Get Started Free
              </Link>
            </div>

            <div className="relative rounded-2xl border-2 border-accent bg-white p-6 shadow-lg ring-1 ring-accent/20 sm:p-8">
              <Badge variant="accent" className="absolute -top-3 left-6">
                Recommended
              </Badge>
              <h3 className="text-xl font-bold text-slate-900">Standard Plan</h3>
              <p className="mt-2 text-sm text-slate-600">Lectrax Premium, full platform access</p>
              <FeatureList items={standardFeatures} />
              <Link
                href="/signup?role=lecturer"
                className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent/90"
              >
                Upgrade to Standard
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {billingOptions.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "rounded-2xl border bg-white p-5 text-center shadow-sm sm:p-6",
                  "recommended" in plan && plan.recommended
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-slate-200"
                )}
              >
                {"recommended" in plan && plan.recommended ? (
                  <Badge variant="accent" className="mb-3">
                    Best Value
                  </Badge>
                ) : (
                  <span className="mb-3 block h-6" aria-hidden />
                )}
                <p className="font-semibold text-slate-900">{plan.label}</p>
                <p className="mt-2 text-3xl font-bold text-primary">${plan.price}</p>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              University Partnerships
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Annual departmental packages for universities that want to provide Premium access for
              their lecturers.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PARTNERSHIP_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  "relative rounded-2xl border bg-slate-50/50 p-6 sm:p-8",
                  pkg.recommended
                    ? "border-2 border-accent ring-1 ring-accent/20"
                    : "border-slate-200"
                )}
              >
                {pkg.recommended ? (
                  <Badge variant="accent" className="absolute -top-3 left-6">
                    Recommended
                  </Badge>
                ) : null}
                <p className="text-xl font-bold text-slate-900">{pkg.name}</p>
                <p className="mt-2 text-sm font-medium text-primary">
                  Up to {pkg.lecturerLimit} Lecturers
                </p>
                <p className="mt-6 text-4xl font-bold text-slate-900">
                  ${pkg.price.toLocaleString()}
                  <span className="text-base font-normal text-slate-500"> / Year</span>
                </p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900">Included with every package</h3>
            <FeatureList items={[...PARTNERSHIP_BENEFITS]} />
            <Link
              href="/partnerships"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[#1455C4] px-7 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(20,85,196,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#0B3D91] hover:shadow-[0_14px_28px_-8px_rgba(11,61,145,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1455C4]"
            >
              Request Partnership
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              How pricing works
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Clear paths for individual lecturers and university departments.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-xl font-semibold text-slate-900">For lecturers</h3>
              <ol className="mt-6 space-y-5">
                {lecturerHowItWorks.map((step, index) => (
                  <li key={step.title}>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                      Step {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-xl font-semibold text-slate-900">For universities</h3>
              <ol className="mt-6 space-y-5">
                {partnershipHowItWorks.map((step, index) => (
                  <li key={step.title}>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                      Step {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Payment providers
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Lecturer Premium checkout is processed securely through Monime with local payment
              options.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <div
                key={method.id}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center sm:p-7"
              >
                <PaymentMethodLogo
                  label={method.label}
                  logoUrl={paymentMethodLogos[method.id as PaymentMethodLogoId]}
                />
                <p className="mt-4 text-lg font-semibold text-slate-900">{method.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{method.description}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
            Plan prices are shown in USD. At checkout, Monime charges the equivalent amount in SLE.
            University partnership payments are arranged with the Lectrax team during onboarding.
          </p>
        </div>
      </section>

      <LandingCta />
    </div>
  );
}
