type QrAttendanceHowStep = 0 | 1 | 2 | 3 | 4 | 5;

type QrAttendanceHowIllustrationProps = {
  step: QrAttendanceHowStep;
  className?: string;
};

/** Technical isometric line art for QR Attendance how-it-works cards. */
export function QrAttendanceHowIllustration({
  step,
  className,
}: QrAttendanceHowIllustrationProps) {
  const stroke = "#0B3D91";
  const strokeSoft = "#60A5FA";
  const strokeMid = "#1455C4";

  if (step === 0) {
    // Create and share class session
    return (
      <svg viewBox="0 0 200 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M60 78 L100 54 L140 78 L100 102 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M60 78 L60 96 L100 120 L100 102 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 102 L140 78 L140 96 L100 120 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M80 74 L100 62 L120 74" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M84 84 L116 66" stroke={strokeSoft} strokeWidth="1.2" opacity="0.7" />
        <path d="M148 44 L166 34 L178 42 L160 52 Z" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M148 44 L148 54 L160 62 L160 52 Z" stroke={strokeMid} strokeWidth="1.1" />
        <path d="M160 52 L178 42 L178 52 L160 62 Z" stroke={stroke} strokeWidth="1.1" />
        <path d="M154 48 L168 40 M156 54 L164 48" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (step === 1) {
    // Start attendance / choose window
    return (
      <svg viewBox="0 0 200 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M72 62 L100 46 L128 62 L100 78 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M72 62 L72 90 L100 108 L100 78 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 78 L128 62 L128 90 L100 108 Z" stroke={stroke} strokeWidth="1.4" />
        <circle cx="100" cy="74" r="14" stroke={strokeSoft} strokeWidth="1.4" />
        <path d="M100 66 V74 L108 78" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M148 40 L164 32 L174 40 L158 48 Z" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M52 44 L64 38 L74 44 L62 50 Z" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M148 50 C156 58 156 74 148 82" stroke={strokeSoft} strokeWidth="1.2" />
      </svg>
    );
  }

  if (step === 2) {
    // Display live QR code
    return (
      <svg viewBox="0 0 200 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M68 58 L100 40 L132 58 L100 76 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M68 58 L68 88 L100 108 L100 76 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 76 L132 58 L132 88 L100 108 Z" stroke={stroke} strokeWidth="1.4" />
        {/* QR grid suggestion */}
        <path d="M84 62 L100 54 L116 62 L100 70 Z" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M88 66 H96 M92 62 V70" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M104 66 H112 M108 62 V70" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M94 74 H106" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M100 40 V28" stroke={strokeSoft} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="100" cy="24" r="4" stroke={stroke} strokeWidth="1.3" />
      </svg>
    );
  }

  if (step === 3) {
    // Students scan to check in
    return (
      <svg viewBox="0 0 200 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Phone */}
        <path d="M78 50 L108 34 L124 44 L94 60 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M78 50 L78 96 L94 112 L94 60 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M94 60 L124 44 L124 90 L94 112 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M86 56 L106 46 L114 52 L94 62 Z" stroke={strokeSoft} strokeWidth="1.2" />
        {/* Scan beam */}
        <path d="M124 56 L160 44" stroke={strokeSoft} strokeWidth="1.3" strokeDasharray="3 2" />
        <path d="M124 70 L158 62" stroke={strokeSoft} strokeWidth="1.3" strokeDasharray="3 2" />
        <path d="M152 40 L170 30 L180 38 L162 48 Z" stroke={stroke} strokeWidth="1.3" />
        <path d="M158 36 L168 42 M162 34 L166 44" stroke={strokeSoft} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (step === 4) {
    // Manual attendance
    return (
      <svg viewBox="0 0 200 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        <path d="M58 70 L100 46 L142 70 L100 94 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M58 70 L58 90 L100 114 L100 94 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 94 L142 70 L142 90 L100 114 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M78 74 L96 84 L126 62" stroke={strokeSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M148 42 L166 32 L176 40 L158 50 Z" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M154 40 L164 46" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="52" cy="48" r="8" stroke={stroke} strokeWidth="1.3" />
        <path d="M52 44 V52 M48 48 H56" stroke={strokeMid} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  // End attendance and keep record
  return (
    <svg viewBox="0 0 200 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
      <path d="M70 68 L100 50 L130 68 L100 86 Z" stroke={stroke} strokeWidth="1.6" />
      <path d="M70 68 L70 92 L100 112 L100 86 Z" stroke={strokeMid} strokeWidth="1.4" />
      <path d="M100 86 L130 68 L130 92 L100 112 Z" stroke={stroke} strokeWidth="1.4" />
      <path d="M86 72 L100 64 L114 72" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M88 80 L112 66" stroke={strokeSoft} strokeWidth="1.2" opacity="0.7" />
      {/* Lock / sealed */}
      <path d="M92 54 C92 46 108 46 108 54" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M88 54 L112 54 L112 66 L88 66 Z" stroke={stroke} strokeWidth="1.4" />
      <circle cx="100" cy="60" r="2.5" stroke={strokeSoft} strokeWidth="1.1" />
      <path d="M148 44 L164 36 L174 44 L158 52 Z" stroke={strokeSoft} strokeWidth="1.2" />
      <path d="M154 42 L166 48" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function qrAttendanceHowStep(index: number): QrAttendanceHowStep {
  return (index % 6) as QrAttendanceHowStep;
}
