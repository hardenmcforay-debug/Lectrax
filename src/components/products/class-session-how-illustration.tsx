type ClassSessionHowStep = 0 | 1 | 2 | 3;

type ClassSessionHowIllustrationProps = {
  step: ClassSessionHowStep;
  className?: string;
};

/** Technical isometric line art for Class Session Management how-it-works cards. */
export function ClassSessionHowIllustration({
  step,
  className,
}: ClassSessionHowIllustrationProps) {
  const stroke = "#0B3D91";
  const strokeSoft = "#60A5FA";
  const strokeMid = "#1455C4";

  if (step === 0) {
    // Create a class session — isometric workspace / desk console
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Desk top */}
        <path d="M40 78 L100 52 L160 78 L100 104 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M40 78 L40 92 L100 118 L100 104 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 104 L160 78 L160 92 L100 118 Z" stroke={stroke} strokeWidth="1.4" />
        {/* Monitor */}
        <path d="M78 54 L100 44 L122 54 L100 64 Z" stroke={stroke} strokeWidth="1.5" />
        <path d="M78 54 L78 72 L100 82 L100 64 Z" stroke={strokeMid} strokeWidth="1.3" />
        <path d="M100 64 L122 54 L122 72 L100 82 Z" stroke={stroke} strokeWidth="1.3" />
        <path d="M86 58 L100 52 L114 58" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M88 64 L100 58 L112 64" stroke={strokeSoft} strokeWidth="1.1" opacity="0.7" />
        {/* Stand */}
        <path d="M100 82 L100 96" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M90 96 L110 96" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        {/* Plus / create mark */}
        <circle cx="148" cy="42" r="10" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M148 36 V48 M142 42 H154" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (step === 1) {
    // Share the session code — isometric ticket / code tile
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Code card */}
        <path d="M58 58 L118 32 L152 52 L92 80 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M58 58 L58 86 L92 108 L92 80 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M92 80 L152 52 L152 80 L92 108 Z" stroke={stroke} strokeWidth="1.4" />
        {/* Code dashes */}
        <path d="M78 70 L98 60" stroke={strokeSoft} strokeWidth="2" strokeLinecap="round" />
        <path d="M84 78 L108 66" stroke={strokeSoft} strokeWidth="2" strokeLinecap="round" />
        <path d="M90 86 L116 72" stroke={strokeSoft} strokeWidth="2" strokeLinecap="round" />
        {/* Share arrow node */}
        <circle cx="148" cy="38" r="9" stroke={stroke} strokeWidth="1.4" />
        <path d="M144 38 H152 M148 34 V42" stroke={strokeMid} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M130 48 L140 42" stroke={strokeSoft} strokeWidth="1.3" strokeLinecap="round" />
        {/* Floating chip */}
        <path d="M44 90 L68 78 L80 86 L56 98 Z" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M44 90 L44 98 L56 106 L56 98 Z" stroke={strokeMid} strokeWidth="1.1" />
        <path d="M56 98 L80 86 L80 94 L56 106 Z" stroke={stroke} strokeWidth="1.1" />
      </svg>
    );
  }

  if (step === 2) {
    // Run academic activities — isometric activity modules
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Module A */}
        <path d="M42 70 L70 56 L90 68 L62 84 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M42 70 L42 86 L62 102 L62 84 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M62 84 L90 68 L90 84 L62 102 Z" stroke={stroke} strokeWidth="1.2" />
        <path d="M52 74 L72 64" stroke={strokeSoft} strokeWidth="1.3" strokeLinecap="round" />
        {/* Module B */}
        <path d="M86 58 L114 44 L134 56 L106 72 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M86 58 L86 74 L106 90 L106 72 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M106 72 L134 56 L134 72 L106 90 Z" stroke={stroke} strokeWidth="1.2" />
        <circle cx="110" cy="64" r="5" stroke={strokeSoft} strokeWidth="1.2" />
        {/* Module C */}
        <path d="M118 78 L146 64 L166 76 L138 92 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M118 78 L118 94 L138 110 L138 92 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M138 92 L166 76 L166 92 L138 110 Z" stroke={stroke} strokeWidth="1.2" />
        <path d="M128 84 L148 74 M130 90 L146 80" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" />
        {/* Connector lines */}
        <path d="M70 66 L86 60" stroke={strokeSoft} strokeWidth="1.1" strokeDasharray="3 3" />
        <path d="M114 68 L124 76" stroke={strokeSoft} strokeWidth="1.1" strokeDasharray="3 3" />
      </svg>
    );
  }

  // Keep everything connected — isometric hub / network
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
      {/* Center hub */}
      <path d="M84 62 L100 52 L116 62 L100 72 Z" stroke={stroke} strokeWidth="1.6" />
      <path d="M84 62 L84 78 L100 90 L100 72 Z" stroke={strokeMid} strokeWidth="1.4" />
      <path d="M100 72 L116 62 L116 78 L100 90 Z" stroke={stroke} strokeWidth="1.4" />
      <circle cx="100" cy="68" r="4" stroke={strokeSoft} strokeWidth="1.3" />
      {/* Nodes */}
      <path d="M46 54 L62 46 L74 54 L58 62 Z" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M46 54 L46 64 L58 72 L58 62 Z" stroke={strokeMid} strokeWidth="1.1" />
      <path d="M58 62 L74 54 L74 64 L58 72 Z" stroke={stroke} strokeWidth="1.1" />

      <path d="M132 48 L148 40 L160 48 L144 56 Z" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M132 48 L132 58 L144 66 L144 56 Z" stroke={strokeMid} strokeWidth="1.1" />
      <path d="M144 56 L160 48 L160 58 L144 66 Z" stroke={stroke} strokeWidth="1.1" />

      <path d="M54 92 L70 84 L82 92 L66 100 Z" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M54 92 L54 102 L66 110 L66 100 Z" stroke={strokeMid} strokeWidth="1.1" />
      <path d="M66 100 L82 92 L82 102 L66 110 Z" stroke={stroke} strokeWidth="1.1" />

      <path d="M128 88 L144 80 L156 88 L140 96 Z" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M128 88 L128 98 L140 106 L140 96 Z" stroke={strokeMid} strokeWidth="1.1" />
      <path d="M140 96 L156 88 L156 98 L140 106 Z" stroke={stroke} strokeWidth="1.1" />
      {/* Links */}
      <path d="M74 56 L88 62" stroke={strokeSoft} strokeWidth="1.1" />
      <path d="M116 58 L132 52" stroke={strokeSoft} strokeWidth="1.1" />
      <path d="M88 82 L74 90" stroke={strokeSoft} strokeWidth="1.1" />
      <path d="M112 84 L128 90" stroke={strokeSoft} strokeWidth="1.1" />
    </svg>
  );
}

export function classSessionHowStep(index: number): ClassSessionHowStep {
  return (index % 4) as ClassSessionHowStep;
}
