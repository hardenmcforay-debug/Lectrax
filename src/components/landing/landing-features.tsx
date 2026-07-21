import Image from "next/image";
import {
  LandingReveal,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/landing-motion";
import {
  LANDING_FEATURE_CARDS,
  type FeatureCardId,
} from "@/lib/landing/feature-cards";
import { cn } from "@/lib/utils";

const FEATURE_ACCENTS = [
  { dot: "bg-primary", line: "from-primary/70 to-primary/15" },
  { dot: "bg-accent", line: "from-accent/70 to-accent/15" },
] as const;

function FeatureCardAccent({ index }: { index: number }) {
  const accent = FEATURE_ACCENTS[index % FEATURE_ACCENTS.length];

  return (
    <div className="landing-feature-accent mb-3 flex items-center gap-2" aria-hidden>
      <span className={cn("h-2 w-2 shrink-0 rounded-full shadow-sm", accent.dot)} />
      <span
        className={cn(
          "h-px w-10 rounded-full bg-gradient-to-r sm:w-12",
          accent.line
        )}
      />
    </div>
  );
}

type LandingFeaturesProps = {
  featureImages?: Partial<Record<FeatureCardId, string>>;
};

export function LandingFeatures({ featureImages }: LandingFeaturesProps) {
  return (
    <section id="features" className="relative -mt-px scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <LandingReveal className="mx-auto max-w-2xl px-1 text-center sm:px-0">
          <h2 className="text-balance text-xl font-bold leading-snug tracking-tight text-slate-900 min-[400px]:text-2xl sm:text-3xl sm:leading-tight lg:text-4xl">
            Everything You Need to Manage Academic Activities
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:mt-4 sm:text-base sm:leading-relaxed lg:text-lg">
            A complete toolkit for lecturers, departments, and institutions. Designed for clarity,
            speed, and accuracy.
          </p>
        </LandingReveal>

        <LandingStagger className="mt-10 grid grid-cols-1 gap-6 sm:mt-14 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {LANDING_FEATURE_CARDS.map((feature, index) => {
            const image = featureImages?.[feature.id] ?? feature.defaultImage;

            return (
              <LandingStaggerItem key={feature.id}>
                <article
                  id={`feature-${feature.id}`}
                  className="landing-feature-card group flex h-full scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                >
                  <div className="landing-feature-card-media relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      key={image}
                      src={image}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="landing-feature-card-image object-cover"
                    />
                    <div className="landing-feature-card-overlay" aria-hidden />
                    <div className="landing-feature-card-shine" aria-hidden />
                  </div>
                  <div className="group/cardbody flex flex-1 flex-col p-5 sm:p-6">
                    <FeatureCardAccent index={index} />
                    <h3 className="landing-feature-card-title text-balance text-lg font-bold leading-snug tracking-tight text-slate-900 transition-colors duration-300 group-hover/cardbody:text-primary hover:text-primary active:text-primary sm:text-xl">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
                      {feature.description}
                    </p>
                  </div>
                </article>
              </LandingStaggerItem>
            );
          })}
        </LandingStagger>
      </div>
    </section>
  );
}
