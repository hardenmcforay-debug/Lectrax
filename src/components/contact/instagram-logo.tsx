/** Official-style Instagram mark (gradient camera). */
export function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <radialGradient
          id="instagramGradient"
          cx="19.38"
          cy="42.013"
          r="44.766"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fd5" />
          <stop offset="0.1" stopColor="#fd5" />
          <stop offset="0.5" stopColor="#ff543e" />
          <stop offset="1" stopColor="#c837ab" />
        </radialGradient>
      </defs>
      <path
        fill="url(#instagramGradient)"
        d="M34.017,41.99l-20,0.019c-4.4,0.004-8.003-3.592-8.008-7.992l-0.019-20
        c-0.004-4.4,3.592-8.003,7.992-8.008l20-0.019c4.4-0.004,8.003,3.592,8.008,7.992l0.019,20
        C42.014,38.383,38.417,41.986,34.017,41.99z"
      />
      <path
        fill="#FFF"
        d="M24,31c-3.859,0-7-3.14-7-7s3.141-7,7-7s7,3.14,7,7S27.859,31,24,31z M24,19c-2.757,0-5,2.243-5,5
        s2.243,5,5,5s5-2.243,5-5S26.757,19,24,19z"
      />
      <circle cx="31.5" cy="16.5" r="1.5" fill="#FFF" />
      <path
        fill="#FFF"
        d="M30,37H18c-3.859,0-7-3.14-7-7V18c0-3.86,3.141-7,7-7h12c3.859,0,7,3.14,7,7v12
        C37,33.86,33.859,37,30,37z M18,13c-2.757,0-5,2.243-5,5v12c0,2.757,2.243,5,5,5h12c2.757,0,5-2.243,5-5V18
        c0-2.757-2.243-5-5-5H18z"
      />
    </svg>
  );
}
