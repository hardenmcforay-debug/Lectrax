type OutcomeIllustrationVariant = 0 | 1 | 2;

type ProductOutcomeIllustrationProps = {
  variant: OutcomeIllustrationVariant;
  className?: string;
};

/** Compact isometric accents for “What you gain” cards. */
export function ProductOutcomeIllustration({
  variant,
  className,
}: ProductOutcomeIllustrationProps) {
  const uid = `outcome-${variant}`;

  if (variant === 0) {
    return (
      <svg
        viewBox="0 0 160 120"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E6DFF" />
            <stop offset="100%" stopColor="#0B3D91" />
          </linearGradient>
          <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#1455C4" />
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="102" rx="52" ry="10" fill="#0B3D91" fillOpacity="0.08" />
        {/* Isometric clock / time saved */}
        <path d="M52 48 L80 34 L108 48 L80 64 Z" fill={`url(#${uid}-b)`} />
        <path d="M52 48 L52 78 L80 96 L80 64 Z" fill="#0B3D91" />
        <path d="M80 64 L108 48 L108 78 L80 96 Z" fill={`url(#${uid}-a)`} />
        <circle cx="80" cy="62" r="16" fill="white" fillOpacity="0.95" />
        <path d="M80 54 V62 L88 66" stroke="#0B3D91" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M118 36 L130 30 L138 35 L126 42 Z" fill="#93C5FD" />
        <path d="M118 36 L126 42 L126 50 L118 44 Z" fill="#60A5FA" />
        <path d="M126 42 L138 35 L138 43 L126 50 Z" fill="#1455C4" />
      </svg>
    );
  }

  if (variant === 1) {
    return (
      <svg
        viewBox="0 0 160 120"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E6DFF" />
            <stop offset="100%" stopColor="#0B3D91" />
          </linearGradient>
          <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#1455C4" />
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="102" rx="52" ry="10" fill="#0B3D91" fillOpacity="0.08" />
        {/* Isometric shield / protection */}
        <path d="M80 28 L112 42 L112 70 C112 86 96 98 80 104 C64 98 48 86 48 70 L48 42 Z" fill={`url(#${uid}-b)`} />
        <path
          d="M68 66 L76 74 L94 54"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M118 48 L136 40 L146 47 L128 56 Z" fill="#DBEAFE" />
        <path d="M118 48 L128 56 L128 66 L118 58 Z" fill="#93C5FD" />
        <path d="M128 56 L146 47 L146 57 L128 66 Z" fill={`url(#${uid}-a)`} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#0B3D91" />
        </linearGradient>
        <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="102" rx="52" ry="10" fill="#0B3D91" fillOpacity="0.08" />
      {/* Isometric chart / clarity */}
      <path d="M44 70 L64 58 L84 70 L64 84 Z" fill="#93C5FD" />
      <path d="M44 70 L44 88 L64 104 L64 84 Z" fill="#1455C4" />
      <path d="M64 84 L84 70 L84 88 L64 104 Z" fill={`url(#${uid}-a)`} />

      <path d="M72 54 L92 42 L112 54 L92 68 Z" fill="#BFDBFE" />
      <path d="M72 54 L72 74 L92 90 L92 68 Z" fill="#1E6DFF" />
      <path d="M92 68 L112 54 L112 74 L92 90 Z" fill={`url(#${uid}-a)`} />

      <path d="M100 36 L120 24 L140 36 L120 50 Z" fill={`url(#${uid}-b)`} />
      <path d="M100 36 L100 56 L120 72 L120 50 Z" fill="#0B3D91" />
      <path d="M120 50 L140 36 L140 56 L120 72 Z" fill="#1455C4" />
    </svg>
  );
}

export function outcomeIllustrationVariant(index: number): OutcomeIllustrationVariant {
  return (index % 3) as OutcomeIllustrationVariant;
}
