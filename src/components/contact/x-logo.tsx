/** Official-style X (Twitter) mark. */
export function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      <path
        fill="#000000"
        d="M24,4C12.954,4,4,12.954,4,24s8.954,20,20,20s20-8.954,20-20S35.046,4,24,4z"
      />
      <path
        fill="#FFFFFF"
        d="M33.552,15h-3.106l-4.553,5.445L21.154,15H14l7.548,10.119L14.3,33h3.106l5.042-6.031L28.846,33H36
        l-7.764-10.426L33.552,15z M17.395,16.812h1.911l11.269,14.376h-1.911L17.395,16.812z"
      />
    </svg>
  );
}
