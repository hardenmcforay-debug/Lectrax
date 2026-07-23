type ContinuousAssessmentHowStep = 0 | 1 | 2 | 3;

type ContinuousAssessmentHowIllustrationProps = {
  step: ContinuousAssessmentHowStep;
  className?: string;
};

/** Technical isometric line art for Continuous Assessment how-it-works cards. */
export function ContinuousAssessmentHowIllustration({
  step,
  className,
}: ContinuousAssessmentHowIllustrationProps) {
  const stroke = "#0B3D91";
  const strokeSoft = "#60A5FA";
  const strokeMid = "#1455C4";

  if (step === 0) {
    // Record assessments — isometric score sheet / entry pad
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M68 52 L110 30 L142 50 L100 72 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M68 52 L68 90 L100 112 L100 72 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 72 L142 50 L142 88 L100 112 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M82 56 L112 40" stroke={strokeSoft} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M84 64 L118 46" stroke={strokeSoft} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M86 72 L116 54" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
        <circle cx="150" cy="40" r="10" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M150 34 V46 M144 40 H156" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (step === 1) {
    // Organize by academic activity — isometric sorted trays
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M40 72 L66 58 L86 70 L60 86 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M40 72 L40 88 L60 104 L60 86 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M60 86 L86 70 L86 86 L60 104 Z" stroke={stroke} strokeWidth="1.2" />
        <path d="M50 76 L70 66" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" />

        <path d="M84 60 L110 46 L130 58 L104 74 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M84 60 L84 76 L104 92 L104 74 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M104 74 L130 58 L130 74 L104 92 Z" stroke={stroke} strokeWidth="1.2" />
        <path d="M94 64 L114 54" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" />

        <path d="M128 78 L154 64 L174 76 L148 92 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M128 78 L128 94 L148 110 L148 92 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M148 92 L174 76 L174 92 L148 110 Z" stroke={stroke} strokeWidth="1.2" />
        <path d="M138 82 L158 72" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" />

        <path d="M70 68 L84 62" stroke={strokeSoft} strokeWidth="1.1" strokeDasharray="3 2" />
        <path d="M114 70 L128 76" stroke={strokeSoft} strokeWidth="1.1" strokeDasharray="3 2" />
      </svg>
    );
  }

  if (step === 2) {
    // Calculate CA automatically — isometric calculator / formula cube
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M74 58 L100 44 L126 58 L100 72 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M74 58 L74 92 L100 110 L100 72 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 72 L126 58 L126 92 L100 110 Z" stroke={stroke} strokeWidth="1.4" />
        {/* Display */}
        <path d="M84 62 L100 54 L116 62 L100 70 Z" stroke={strokeSoft} strokeWidth="1.3" />
        {/* Keypad dots */}
        <circle cx="90" cy="80" r="3" stroke={strokeSoft} strokeWidth="1.1" />
        <circle cx="100" cy="86" r="3" stroke={strokeSoft} strokeWidth="1.1" />
        <circle cx="110" cy="80" r="3" stroke={strokeSoft} strokeWidth="1.1" />
        <circle cx="90" cy="92" r="3" stroke={strokeSoft} strokeWidth="1.1" />
        <circle cx="100" cy="98" r="3" stroke={strokeSoft} strokeWidth="1.1" />
        <circle cx="110" cy="92" r="3" stroke={strokeSoft} strokeWidth="1.1" />
        {/* Auto spark */}
        <path d="M140 40 L148 48 L140 56 L146 48 Z" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M148 34 V42 M144 38 H152" stroke={strokeSoft} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  // Monitor progress over time — isometric progress track / timeline chart
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
      <path d="M48 86 L152 40" stroke={strokeSoft} strokeWidth="1.4" strokeDasharray="4 3" />
      <path d="M52 90 L70 78 L70 94 L52 106 Z" stroke={stroke} strokeWidth="1.3" />
      <path d="M70 78 L88 68 L88 84 L70 94 Z" stroke={strokeMid} strokeWidth="1.2" />
      <path d="M88 68 L106 58 L106 74 L88 84 Z" stroke={stroke} strokeWidth="1.3" />
      <path d="M106 58 L124 48 L124 64 L106 74 Z" stroke={strokeMid} strokeWidth="1.2" />
      <path d="M124 48 L142 38 L142 54 L124 64 Z" stroke={stroke} strokeWidth="1.3" />
      <path d="M56 82 L140 44" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="56" cy="82" r="3" stroke={strokeSoft} strokeWidth="1.2" />
      <circle cx="98" cy="62" r="3" stroke={strokeSoft} strokeWidth="1.2" />
      <circle cx="140" cy="44" r="3" stroke={strokeSoft} strokeWidth="1.2" />
    </svg>
  );
}

export function continuousAssessmentHowStep(index: number): ContinuousAssessmentHowStep {
  return (index % 4) as ContinuousAssessmentHowStep;
}
