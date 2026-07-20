import type { ReactNode } from "react";

/** Polished marks for the “Why Lecturers Choose Lectrax” benefits list. */

const BLUE = "#2563EB";
const BLUE_LIGHT = "#EFF6FF";
const BLUE_SOFT = "#93C5FD";
const BLUE_MID = "#60A5FA";

type LogoProps = { className?: string };

function LogoShell({ className, children }: LogoProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      <path
        fill={BLUE}
        d="M24,4C12.954,4,4,12.954,4,24s8.954,20,20,20s20-8.954,20-20S35.046,4,24,4z"
      />
      {children}
    </svg>
  );
}

/** Clock — Saves Time */
export function SavesTimeLogo({ className }: LogoProps) {
  return (
    <LogoShell className={className}>
      <circle cx="24" cy="24" r="13" fill={BLUE_LIGHT} />
      <circle cx="24" cy="24" r="11" fill="#FFFFFF" />
      <path
        fill={BLUE}
        stroke={BLUE}
        strokeWidth="0.5"
        strokeLinecap="round"
        d="M24,14.5c-0.55,0-1,0.45-1,1V24c0,0.35,0.18,0.68,0.48,0.86l6.2,3.72
        c0.48,0.29,1.1,0.13,1.38-0.35c0.29-0.48,0.13-1.1-0.35-1.38L25,23.45V15.5C25,14.95,24.55,14.5,24,14.5z"
      />
      <circle cx="24" cy="24" r="2" fill={BLUE} />
      <circle cx="24" cy="15" r="1.2" fill={BLUE_SOFT} />
      <circle cx="33" cy="24" r="1.2" fill={BLUE_SOFT} />
      <circle cx="24" cy="33" r="1.2" fill={BLUE_SOFT} />
      <circle cx="15" cy="24" r="1.2" fill={BLUE_SOFT} />
    </LogoShell>
  );
}

/** Shield with check — Reduces Administrative Work */
export function AdminWorkLogo({ className }: LogoProps) {
  return (
    <LogoShell className={className}>
      <path
        fill="#FFFFFF"
        d="M24,11.5c-0.2,0-0.4,0.04-0.58,0.12l-8.4,3.7C14.4,15.55,14,16.1,14,16.75v7.55
        c0,5.35,3.55,10.1,9.45,12.45c0.35,0.14,0.75,0.14,1.1,0C30.45,34.4,34,29.65,34,24.3v-7.55
        c0-0.65-0.4-1.2-1.02-1.43l-8.4-3.7C24.4,11.54,24.2,11.5,24,11.5z"
      />
      <path
        fill={BLUE}
        d="M22.05,28.2c-0.3,0-0.58-0.12-0.79-0.33l-3.15-3.15c-0.44-0.44-0.44-1.15,0-1.59
        c0.44-0.44,1.15-0.44,1.59,0l2.35,2.35l5.05-5.05c0.44-0.44,1.15-0.44,1.59,0c0.44,0.44,0.44,1.15,0,1.59
        l-5.85,5.85C22.63,28.08,22.35,28.2,22.05,28.2z"
      />
    </LogoShell>
  );
}

/** Check badge — Improves Record Accuracy */
export function AccuracyLogo({ className }: LogoProps) {
  return (
    <LogoShell className={className}>
      <circle cx="24" cy="24" r="12.5" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="10" fill={BLUE_LIGHT} />
      <path
        fill={BLUE}
        d="M21.9,29.4c-0.32,0-0.62-0.13-0.84-0.35l-3.7-3.7c-0.47-0.47-0.47-1.22,0-1.69
        s1.22-0.47,1.69,0l2.85,2.85l6.05-6.05c0.47-0.47,1.22-0.47,1.69,0s0.47,1.22,0,1.69l-6.9,6.9
        C22.52,29.27,22.22,29.4,21.9,29.4z"
      />
    </LogoShell>
  );
}

/** Chart bars — Simplifies Assessment Tracking */
export function AssessmentLogo({ className }: LogoProps) {
  return (
    <LogoShell className={className}>
      <rect x="12" y="14" width="24" height="20" rx="3" fill={BLUE_LIGHT} />
      <rect x="15.5" y="26" width="4" height="5" rx="1" fill={BLUE_SOFT} />
      <rect x="22" y="21" width="4" height="10" rx="1" fill={BLUE_MID} />
      <rect x="28.5" y="17" width="4" height="14" rx="1" fill={BLUE} />
      <path
        fill="none"
        stroke={BLUE}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16,23.5 L21,20.5 L26.5,24 L31.5,18"
      />
      <circle cx="31.5" cy="18" r="1.6" fill={BLUE} />
    </LogoShell>
  );
}

/** People — Enhances Student Engagement */
export function EngagementLogo({ className }: LogoProps) {
  return (
    <LogoShell className={className}>
      <circle cx="24" cy="17.5" r="4.2" fill="#FFFFFF" />
      <path
        fill="#FFFFFF"
        d="M24,23.2c-5.1,0-9.2,3.2-9.2,7.15c0,0.55,0.45,1,1,1h16.4c0.55,0,1-0.45,1-1
        C33.2,26.4,29.1,23.2,24,23.2z"
      />
      <circle cx="14.5" cy="19.5" r="3.2" fill={BLUE_SOFT} />
      <path
        fill={BLUE_SOFT}
        d="M14.5,24c-3.55,0-6.4,2.15-6.4,4.8c0,0.44,0.36,0.8,0.8,0.8h5.55
        c0.55-1.85,2.05-3.35,4.05-4.15C16.85,24.5,15.7,24,14.5,24z"
      />
      <circle cx="33.5" cy="19.5" r="3.2" fill={BLUE_SOFT} />
      <path
        fill={BLUE_SOFT}
        d="M33.5,24c-1.2,0-2.35,0.5-3,1.45c2,0.8,3.5,2.3,4.05,4.15h5.55
        c0.44,0,0.8-0.36,0.8-0.8C39.9,26.15,37.05,24,33.5,24z"
      />
    </LogoShell>
  );
}
