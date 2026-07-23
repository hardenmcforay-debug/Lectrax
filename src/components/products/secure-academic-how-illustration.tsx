type SecureRecordsHowStep = 0 | 1 | 2 | 3;

type SecureAcademicHowIllustrationProps = {
  step: SecureRecordsHowStep;
  className?: string;
};

/** Technical isometric line art for Secure Academic Records how-it-works cards. */
export function SecureAcademicHowIllustration({
  step,
  className,
}: SecureAcademicHowIllustrationProps) {
  const stroke = "#0B3D91";
  const strokeSoft = "#60A5FA";
  const strokeMid = "#1455C4";

  if (step === 0) {
    // Capture records — isometric inbox / document capture
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Vault base */}
        <path d="M60 78 L100 58 L140 78 L100 98 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M60 78 L60 98 L100 118 L100 98 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 98 L140 78 L140 98 L100 118 Z" stroke={stroke} strokeWidth="1.4" />
        {/* Incoming docs */}
        <path d="M78 48 L100 36 L122 48 L100 60 Z" stroke={strokeSoft} strokeWidth="1.4" />
        <path d="M78 48 L78 58 L100 70 L100 60 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M100 60 L122 48 L122 58 L100 70 Z" stroke={stroke} strokeWidth="1.2" />
        <path d="M88 52 L100 46 L112 52" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M90 58 L106 50" stroke={strokeSoft} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        {/* Capture arrow */}
        <path d="M100 34 V24" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M94 30 L100 36 L106 30" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (step === 1) {
    // Control access — isometric lock + key cards
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Lock body */}
        <path d="M78 70 L100 58 L122 70 L100 84 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M78 70 L78 94 L100 108 L100 84 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 84 L122 70 L122 94 L100 108 Z" stroke={stroke} strokeWidth="1.4" />
        <circle cx="100" cy="82" r="5" stroke={strokeSoft} strokeWidth="1.4" />
        <path d="M100 87 V96" stroke={strokeSoft} strokeWidth="1.5" strokeLinecap="round" />
        {/* Shackle */}
        <path
          d="M86 62 C86 48 114 48 114 62"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Access cards */}
        <path d="M136 48 L158 36 L170 44 L148 56 Z" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M136 48 L136 58 L148 66 L148 56 Z" stroke={strokeMid} strokeWidth="1.1" />
        <path d="M148 56 L170 44 L170 54 L148 66 Z" stroke={stroke} strokeWidth="1.1" />
        <circle cx="154" cy="52" r="3" stroke={strokeSoft} strokeWidth="1.1" />
        <path d="M40 56 L62 44 L74 52 L52 64 Z" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M40 56 L40 66 L52 74 L52 64 Z" stroke={strokeMid} strokeWidth="1.1" />
        <path d="M52 64 L74 52 L74 62 L52 74 Z" stroke={stroke} strokeWidth="1.1" />
      </svg>
    );
  }

  if (step === 2) {
    // Academic trail — isometric timeline / linked records
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Trail spine */}
        <path d="M52 88 L148 48" stroke={strokeSoft} strokeWidth="1.4" strokeDasharray="4 3" />
        {/* Node 1 */}
        <path d="M40 78 L58 68 L72 76 L54 86 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M40 78 L40 90 L54 100 L54 86 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M54 86 L72 76 L72 88 L54 100 Z" stroke={stroke} strokeWidth="1.2" />
        {/* Node 2 */}
        <path d="M84 62 L102 52 L116 60 L98 70 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M84 62 L84 74 L98 84 L98 70 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M98 70 L116 60 L116 72 L98 84 Z" stroke={stroke} strokeWidth="1.2" />
        {/* Node 3 */}
        <path d="M128 46 L146 36 L160 44 L142 54 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M128 46 L128 58 L142 68 L142 54 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M142 54 L160 44 L160 56 L142 68 Z" stroke={stroke} strokeWidth="1.2" />
        <circle cx="56" cy="84" r="3" stroke={strokeSoft} strokeWidth="1.2" />
        <circle cx="100" cy="68" r="3" stroke={strokeSoft} strokeWidth="1.2" />
        <circle cx="144" cy="52" r="3" stroke={strokeSoft} strokeWidth="1.2" />
      </svg>
    );
  }

  // Export and report — isometric export tray / report sheet
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
      {/* Report sheet */}
      <path d="M70 52 L110 32 L140 50 L100 70 Z" stroke={stroke} strokeWidth="1.6" />
      <path d="M70 52 L70 88 L100 108 L100 70 Z" stroke={strokeMid} strokeWidth="1.4" />
      <path d="M100 70 L140 50 L140 86 L100 108 Z" stroke={stroke} strokeWidth="1.4" />
      <path d="M82 58 L108 44" stroke={strokeSoft} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M84 66 L114 50" stroke={strokeSoft} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M86 74 L112 58" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
      {/* Export arrow block */}
      <path d="M142 64 L162 54 L174 62 L154 72 Z" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M142 64 L142 74 L154 84 L154 72 Z" stroke={strokeMid} strokeWidth="1.1" />
      <path d="M154 72 L174 62 L174 72 L154 84 Z" stroke={stroke} strokeWidth="1.1" />
      <path d="M156 58 V78" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M150 72 L156 80 L162 72"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function secureAcademicHowStep(index: number): SecureRecordsHowStep {
  return (index % 4) as SecureRecordsHowStep;
}
