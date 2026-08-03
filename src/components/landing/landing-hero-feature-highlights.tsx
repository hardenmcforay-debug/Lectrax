"use client";

import {
  BarChart3,
  ClipboardCheck,
  FilePen,
  ScanQrCode,
} from "lucide-react";

const FEATURE_HIGHLIGHTS = [
  {
    icon: ScanQrCode,
    title: "QR Attendance",
  },
  {
    icon: ClipboardCheck,
    title: "Continuous Assessment",
  },
  {
    icon: FilePen,
    title: "Assignment Management",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
  },
] as const;

/** Client island — lucide-react needs client runtime; keep hero LCP text on the server. */
export function LandingHeroFeatureHighlights() {
  return (
    <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-2.5 md:gap-3">
      {FEATURE_HIGHLIGHTS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="hero-feature-card group min-w-0 rounded-lg p-2.5 text-center transition-transform duration-200 ease-out hover:-translate-y-1 sm:rounded-xl sm:p-2.5 md:p-3.5"
          >
            <Icon
              aria-hidden
              strokeWidth={2}
              absoluteStrokeWidth
              className="mx-auto mb-1.5 h-6 w-6 text-emerald-400 transition-[color,transform] duration-200 ease-out group-hover:scale-[1.08] group-hover:text-emerald-300 sm:mb-1.5 sm:h-7 sm:w-7 md:mb-2 md:h-8 md:w-8"
            />
            <p className="text-[10px] font-semibold leading-tight text-white sm:text-[11px] md:text-sm">
              {item.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}
