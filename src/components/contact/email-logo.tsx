/** Polished email envelope mark for the contact card. */
export function EmailLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      <path
        fill="#EA4335"
        d="M24,4C12.954,4,4,12.954,4,24s8.954,20,20,20s20-8.954,20-20S35.046,4,24,4z"
      />
      <path
        fill="#FFFFFF"
        d="M34,16H14c-1.105,0-2,0.895-2,2v12c0,1.105,0.895,2,2,2h20c1.105,0,2-0.895,2-2V18
        C36,16.895,35.105,16,34,16z M34,18l-10,7L14,18H34z M14,30V19.5l9.4,6.58c0.36,0.25,0.84,0.25,1.2,0L34,19.5V30H14z"
      />
    </svg>
  );
}
