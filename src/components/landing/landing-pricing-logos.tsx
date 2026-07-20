/** Polished check mark for pricing feature lists. */

type LogoProps = { className?: string };

const BLUE = "#2563EB";
const BLUE_LIGHT = "#EFF6FF";

export function PricingCheckLogo({ className }: LogoProps) {
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
      <circle cx="24" cy="24" r="12.5" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="10" fill={BLUE_LIGHT} />
      <path
        fill={BLUE}
        d="M21.9,29.4c-0.32,0-0.62-0.13-0.84-0.35l-3.7-3.7c-0.47-0.47-0.47-1.22,0-1.69
        s1.22-0.47,1.69,0l2.85,2.85l6.05-6.05c0.47-0.47,1.22-0.47,1.69,0s0.47,1.22,0,1.69l-6.9,6.9
        C22.52,29.27,22.22,29.4,21.9,29.4z"
      />
    </svg>
  );
}
