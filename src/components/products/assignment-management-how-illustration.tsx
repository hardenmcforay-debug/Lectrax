type AssignmentHowStep = 0 | 1 | 2 | 3;

type AssignmentManagementHowIllustrationProps = {
  step: AssignmentHowStep;
  className?: string;
};

/** Technical isometric line art for Assignment Management how-it-works cards. */
export function AssignmentManagementHowIllustration({
  step,
  className,
}: AssignmentManagementHowIllustrationProps) {
  const stroke = "#0B3D91";
  const strokeSoft = "#60A5FA";
  const strokeMid = "#1455C4";

  if (step === 0) {
    // Create the assignment — isometric document + pen
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M64 56 L108 32 L140 52 L96 76 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M64 56 L64 94 L96 118 L96 76 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M96 76 L140 52 L140 90 L96 118 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M78 60 L112 42" stroke={strokeSoft} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M80 68 L118 48" stroke={strokeSoft} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M82 76 L114 56" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
        {/* Pen */}
        <path d="M132 36 L158 22" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M152 24 L160 28 L156 34" stroke={strokeMid} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M128 40 L136 36" stroke={strokeSoft} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (step === 1) {
    // Share with the class — isometric publish / broadcast
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M70 70 L100 52 L130 70 L100 88 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M70 70 L70 92 L100 112 L100 88 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 88 L130 70 L130 92 L100 112 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M86 74 L100 66 L114 74" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M88 82 L112 68" stroke={strokeSoft} strokeWidth="1.2" opacity="0.7" />
        {/* Broadcast arcs */}
        <path d="M140 48 C150 58 150 78 140 88" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M150 40 C164 54 164 82 150 96" stroke={strokeSoft} strokeWidth="1.2" opacity="0.7" />
        <path d="M60 48 C50 58 50 78 60 88" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M50 40 C36 54 36 82 50 96" stroke={strokeSoft} strokeWidth="1.2" opacity="0.7" />
        <circle cx="100" cy="42" r="6" stroke={stroke} strokeWidth="1.4" />
        <path d="M100 36 V48" stroke={strokeMid} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  if (step === 2) {
    // Collect submissions — isometric inbox / stack
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Tray */}
        <path d="M52 86 L100 62 L148 86 L100 110 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M52 86 L52 100 L100 124 L100 110 Z" stroke={strokeMid} strokeWidth="1.3" />
        <path d="M100 110 L148 86 L148 100 L100 124 Z" stroke={stroke} strokeWidth="1.3" />
        {/* Incoming papers */}
        <path d="M78 48 L100 36 L122 48 L100 60 Z" stroke={strokeSoft} strokeWidth="1.4" />
        <path d="M78 48 L78 58 L100 70 L100 60 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M100 60 L122 48 L122 58 L100 70 Z" stroke={stroke} strokeWidth="1.2" />
        <path d="M88 52 L108 42" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M100 36 V24" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M94 30 L100 36 L106 30"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M60 56 L78 66" stroke={strokeSoft} strokeWidth="1.2" strokeDasharray="3 2" />
        <path d="M140 56 L122 66" stroke={strokeSoft} strokeWidth="1.2" strokeDasharray="3 2" />
      </svg>
    );
  }

  // Review and grade — isometric review desk / check mark
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
      <path d="M60 70 L100 48 L140 70 L100 92 Z" stroke={stroke} strokeWidth="1.6" />
      <path d="M60 70 L60 92 L100 116 L100 92 Z" stroke={strokeMid} strokeWidth="1.4" />
      <path d="M100 92 L140 70 L140 92 L100 116 Z" stroke={stroke} strokeWidth="1.4" />
      <path
        d="M82 78 L96 88 L122 66"
        stroke={strokeSoft}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Grade chip */}
      <path d="M138 42 L158 32 L170 40 L150 50 Z" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M138 42 L138 52 L150 60 L150 50 Z" stroke={strokeMid} strokeWidth="1.1" />
      <path d="M150 50 L170 40 L170 50 L150 60 Z" stroke={stroke} strokeWidth="1.1" />
      <path d="M146 46 L158 40" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function assignmentManagementHowStep(index: number): AssignmentHowStep {
  return (index % 4) as AssignmentHowStep;
}
