/** Polished message / chat mark for the contact form. */
export function MessageLogo({ className }: { className?: string }) {
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
        d="M24,4C12.954,4,4,12.954,4,24c0,3.7,1.01,7.16,2.77,10.14L5.2,41.4
        c-0.22,0.74,0.48,1.4,1.2,1.14l7.95-2.9C17.3,41.2,20.55,42,24,42c11.046,0,20-8.954,20-20S35.046,4,24,4z"
      />
      <circle cx="16.5" cy="23.5" r="2.2" fill="#FFFFFF" />
      <circle cx="24" cy="23.5" r="2.2" fill="#FFFFFF" />
      <circle cx="31.5" cy="23.5" r="2.2" fill="#FFFFFF" />
    </svg>
  );
}
