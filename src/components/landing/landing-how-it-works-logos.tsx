import type { ComponentType, ReactNode } from "react";

/** Polished circular marks for the “How Lectrax Works” steps. */

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

/** User + — Create Your Account */
export function CreateAccountLogo({ className }: LogoProps) {
  return (
    <LogoShell className={className}>
      <circle cx="21" cy="18" r="5" fill="#FFFFFF" />
      <path
        fill="#FFFFFF"
        d="M21,24.5c-5.2,0-9.4,3.15-9.4,7.05c0,0.5,0.4,0.9,0.9,0.9h17c0.5,0,0.9-0.4,0.9-0.9
        C30.4,27.65,26.2,24.5,21,24.5z"
      />
      <circle cx="32.5" cy="22.5" r="5.2" fill={BLUE_LIGHT} />
      <path
        fill={BLUE}
        strokeLinecap="round"
        d="M32.5,19.8c-0.45,0-0.8,0.35-0.8,0.8v1.7h-1.7c-0.45,0-0.8,0.35-0.8,0.8
        s0.35,0.8,0.8,0.8h1.7v1.7c0,0.45,0.35,0.8,0.8,0.8s0.8-0.35,0.8-0.8v-1.7h1.7
        c0.45,0,0.8-0.35,0.8-0.8s-0.35-0.8-0.8-0.8h-1.7v-1.7C33.3,20.15,32.95,19.8,32.5,19.8z"
      />
    </LogoShell>
  );
}

/** Open book — Create a Class Session */
export function ClassSessionLogo({ className }: LogoProps) {
  return (
    <LogoShell className={className}>
      <path
        fill="#FFFFFF"
        d="M24,15.2c-0.35-0.2-0.75-0.2-1.1,0C19.6,17.1,15.8,17.8,12.5,17.8c-0.55,0-1,0.45-1,1
        v12.4c0,0.55,0.45,1,1,1c3.05,0,6.55-0.65,9.85-2.45c0.4-0.22,0.9-0.22,1.3,0
        c3.3,1.8,6.8,2.45,9.85,2.45c0.55,0,1-0.45,1-1V18.8c0-0.55-0.45-1-1-1
        C32.2,17.8,28.4,17.1,24,15.2z"
      />
      <path
        fill={BLUE_SOFT}
        d="M23.2,17.6v12.35c-2.85,1.45-5.95,2.1-9.2,2.25V19.55
        C17.15,19.45,20.25,18.85,23.2,17.6z"
      />
      <path
        fill={BLUE_LIGHT}
        d="M24.8,17.6c2.95,1.25,6.05,1.85,9.2,1.95v12.65c-3.25-0.15-6.35-0.8-9.2-2.25V17.6z"
      />
      <path
        fill={BLUE}
        d="M23.2,15.85h1.6v14.9h-1.6V15.85z"
      />
    </LogoShell>
  );
}

/** People — Manage Attendance and Assessments */
export function ManageAttendanceLogo({ className }: LogoProps) {
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

/** Chart — Track Academic Performance */
export function TrackPerformanceLogo({ className }: LogoProps) {
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

export const HOW_IT_WORKS_ICON_NAMES = [
  "user-plus",
  "book-open",
  "users",
  "bar-chart-3",
] as const;

export type HowItWorksIconName = (typeof HOW_IT_WORKS_ICON_NAMES)[number];

export const howItWorksLogos: Record<
  HowItWorksIconName,
  ComponentType<LogoProps>
> = {
  "user-plus": CreateAccountLogo,
  "book-open": ClassSessionLogo,
  users: ManageAttendanceLogo,
  "bar-chart-3": TrackPerformanceLogo,
};
