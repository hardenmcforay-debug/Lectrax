"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  ClipboardList,
  FileText,
  QrCode,
} from "lucide-react";
import { APP_TAGLINE } from "@/lib/constants";
import { HeroVisual } from "@/components/landing/hero-visual";
import { InstallAppButton } from "@/components/pwa/install-app-button";

const FEATURE_HIGHLIGHTS = [
  {
    icon: QrCode,
    title: "QR Attendance",
  },
  {
    icon: ClipboardList,
    title: "Continuous Assessment",
  },
  {
    icon: FileText,
    title: "Assignment Management",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
  },
] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="hero-gradient absolute inset-0" />
      <div className="hero-grid absolute inset-0 opacity-40" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
    </div>
  );
}

function HeroWave() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 leading-[0]" aria-hidden>
      <svg
        className="block w-full translate-y-px"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,64 C360,120 720,0 1080,48 C1260,72 1380,96 1440,80 L1440,120 L0,120 Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

type LandingHeroProps = {
  heroImageUrl?: string | null;
};

export function LandingHero({ heroImageUrl }: LandingHeroProps) {
  const reducedMotion = useReducedMotion();

  return (
    <section className="hero-section relative flex min-h-screen flex-col overflow-hidden">
      <HeroBackground />

      <div className="landing-hero-safe relative z-[1] mx-auto flex w-full max-w-7xl flex-1 items-center px-4 pb-28 sm:px-6 sm:pb-32 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <div className="order-1 hidden md:block lg:order-none">
            <HeroVisual imageUrl={heroImageUrl} />
          </div>

          <div className="order-2 text-center lg:text-left">
            <motion.p
              className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl"
              {...(reducedMotion ? {} : fadeUp(0))}
            >
              {APP_TAGLINE}
            </motion.p>

            <motion.p
              className="mx-auto mt-4 max-w-[600px] text-sm leading-relaxed text-blue-100/90 sm:text-base lg:mx-0"
              {...(reducedMotion ? {} : fadeUp(0.1))}
            >
              Empower lecturers with a centralized platform for attendance tracking, assignments,
              continuous assessment, and student performance management.
            </motion.p>

            <motion.div
              className="mt-8 grid grid-cols-4 gap-2 sm:gap-2.5 md:gap-3"
              {...(reducedMotion ? {} : fadeUp(0.2))}
            >
              {FEATURE_HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    className="hero-feature-card group min-w-0 rounded-lg p-2.5 text-center sm:rounded-xl sm:p-2.5 md:p-3.5"
                    whileHover={reducedMotion ? undefined : { y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/20 sm:mb-1.5 sm:h-8 sm:w-8 sm:rounded-lg md:mb-2 md:h-9 md:w-9">
                      <Icon className="h-3.5 w-3.5 text-emerald-300 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </div>
                    <p className="text-[10px] font-semibold leading-tight text-white sm:text-[11px] md:text-sm">
                      {item.title}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
              {...(reducedMotion ? {} : fadeUp(0.3))}
            >
              <motion.div whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-7 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-400"
                >
                  Get Started
                </Link>
              </motion.div>
              <motion.div whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/40 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/10"
                >
                  Contact Us
                </Link>
              </motion.div>
              <InstallAppButton variant="hero" />
            </motion.div>
          </div>
        </div>
      </div>

      <HeroWave />
    </section>
  );
}
