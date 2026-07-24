"use client";

import type { ComponentType, ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  QrCode,
  Users,
} from "lucide-react";

type FloatingIcon = {
  icon: ComponentType<{ className?: string }>;
  className: string;
  delay: number;
};

const FLOATING_ICONS: FloatingIcon[] = [
  { icon: QrCode, className: "left-[2%] top-[8%]", delay: 0 },
  { icon: CheckCircle2, className: "right-[4%] top-[12%]", delay: 0.4 },
  { icon: FileText, className: "right-[0%] top-[42%]", delay: 0.8 },
  { icon: BarChart3, className: "left-[-2%] top-[48%]", delay: 1.2 },
  { icon: Calendar, className: "left-[8%] bottom-[14%]", delay: 0.6 },
  { icon: GraduationCap, className: "right-[10%] bottom-[18%]", delay: 1 },
  { icon: Bell, className: "right-[22%] top-[2%]", delay: 1.4 },
  { icon: Users, className: "left-[18%] top-[2%]", delay: 0.2 },
];

function FloatingBadge({
  icon: Icon,
  className,
  delay,
  reducedMotion,
}: FloatingIcon & { reducedMotion: boolean }) {
  return (
    <motion.div
      className={`absolute z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/25 bg-white/10 shadow-lg backdrop-blur-md sm:h-12 sm:w-12 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: reducedMotion ? 0 : [0, -10, 0],
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: reducedMotion
          ? undefined
          : { duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay },
      }}
    >
      <Icon className="h-5 w-5 text-cyan-200" />
    </motion.div>
  );
}

type HeroVisualProps = {
  imageUrl?: string | null;
};

export function HeroVisual({ imageUrl }: HeroVisualProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="hero-portal-stage relative mx-auto flex w-full max-w-xl items-center justify-center lg:max-w-none">
      {FLOATING_ICONS.map((item) => (
        <FloatingBadge key={item.className} {...item} reducedMotion={!!reducedMotion} />
      ))}

      <motion.div
        className="hero-portal relative aspect-[4/3] w-full max-w-[min(100%,32rem)]"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="absolute inset-0"
          animate={reducedMotion ? undefined : { y: [0, -14, 0] }}
          transition={
            reducedMotion
              ? undefined
              : { duration: 9, repeat: Infinity, ease: "easeInOut" }
          }
        >
        <div className="hero-halo-ambient" aria-hidden />
        <div className="hero-halo-ambient-secondary" aria-hidden />

        <motion.div
          className="hero-halo-pulse-wrap"
          animate={
            reducedMotion
              ? undefined
              : { opacity: [0.82, 0.95, 0.82], scale: [1, 1.015, 1] }
          }
          transition={
            reducedMotion
              ? undefined
              : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <div className="hero-halo-glow-outer" aria-hidden />
          <div className="hero-halo-glow-mid" aria-hidden />
          <div className="hero-halo-glow-inner" aria-hidden />

          <div className="hero-portal-frame">
            <div className="hero-portal-ring-outer" aria-hidden />
            <div className="hero-portal-ring-inner" aria-hidden />

            <div className={imageUrl ? "hero-portal-core hero-portal-core--image" : "hero-portal-core"}>
              <div className="hero-portal-core-inner">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Lectrax academic management platform"
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 1024px) 90vw, 32rem"
                    priority
                  />
                ) : (
                  <DashboardMockup />
                )}
              </div>
            </div>
          </div>
        </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20">
            <QrCode className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
              Live Session
            </p>
            <p className="text-xs font-semibold text-white">CSC 301 — Attendance</p>
          </div>
        </div>
        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
          94% present
        </span>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 sm:gap-3">
        <DashboardPanel title="QR Check-in" className="col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-cyan-400/40 bg-cyan-500/10">
              <QrCode className="h-8 w-8 text-cyan-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-2 w-full rounded-full bg-white/10">
                <div className="h-full w-[94%] rounded-full bg-cyan-400" />
              </div>
              <p className="mt-2 text-[10px] text-white/50">45 of 48 students checked in</p>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Assignments">
          <p className="text-lg font-bold text-white">12</p>
          <p className="text-[10px] text-white/50">Active submissions</p>
          <div className="mt-2 flex gap-1">
            {[40, 65, 80, 55].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-cyan-400/80"
                style={{ height: `${h * 0.25}px` }}
              />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="CA Average">
          <p className="text-lg font-bold text-white">3.72</p>
          <p className="text-[10px] text-white/50">Class GPA</p>
          <div className="mt-2 flex items-end gap-1">
            {[3.1, 3.4, 3.5, 3.6, 3.72].map((v, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${i === 4 ? "bg-cyan-400" : "bg-white/20"}`}
                style={{ height: `${(v / 4) * 32}px` }}
              />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Students" className="col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {["A", "B", "C", "D"].map((letter) => (
                <div
                  key={letter}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-blue-500/80 text-[10px] font-bold text-white"
                >
                  {letter}
                </div>
              ))}
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-white/10 text-[10px] text-white/70">
                +44
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-200">
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">48 enrolled</span>
            </div>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}

function DashboardPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3 ${className}`}>
      <p className="mb-1.5 text-[10px] font-medium text-white/60">{title}</p>
      {children}
    </div>
  );
}
