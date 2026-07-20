/** Polished response-time clock mark for the contact card. */
export function ResponseTimeLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      <path
        fill="#2563EB"
        d="M24,4C12.954,4,4,12.954,4,24s8.954,20,20,20s20-8.954,20-20S35.046,4,24,4z"
      />
      <circle cx="24" cy="24" r="13" fill="#EFF6FF" />
      <circle cx="24" cy="24" r="11" fill="#FFFFFF" />
      <path
        fill="#2563EB"
        stroke="#2563EB"
        strokeWidth="0.5"
        strokeLinecap="round"
        d="M24,14.5c-0.55,0-1,0.45-1,1V24c0,0.35,0.18,0.68,0.48,0.86l6.2,3.72
        c0.48,0.29,1.1,0.13,1.38-0.35c0.29-0.48,0.13-1.1-0.35-1.38L25,23.45V15.5C25,14.95,24.55,14.5,24,14.5z"
      />
      <circle cx="24" cy="24" r="2" fill="#2563EB" />
      <circle cx="24" cy="15" r="1.2" fill="#93C5FD" />
      <circle cx="33" cy="24" r="1.2" fill="#93C5FD" />
      <circle cx="24" cy="33" r="1.2" fill="#93C5FD" />
      <circle cx="15" cy="24" r="1.2" fill="#93C5FD" />
    </svg>
  );
}
