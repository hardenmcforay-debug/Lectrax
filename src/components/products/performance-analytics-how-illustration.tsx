type PerformanceHowStep = 0 | 1 | 2 | 3;

type PerformanceAnalyticsHowIllustrationProps = {
  step: PerformanceHowStep;
  className?: string;
};

/** Technical isometric line art for Performance Analytics how-it-works cards. */
export function PerformanceAnalyticsHowIllustration({
  step,
  className,
}: PerformanceAnalyticsHowIllustrationProps) {
  const stroke = "#0B3D91";
  const strokeSoft = "#60A5FA";
  const strokeMid = "#1455C4";

  if (step === 0) {
    // Collect academic activity data — isometric data streams into cube
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Data cube */}
        <path d="M78 72 L100 58 L122 72 L100 86 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M78 72 L78 96 L100 112 L100 86 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 86 L122 72 L122 96 L100 112 Z" stroke={stroke} strokeWidth="1.4" />
        <path d="M88 78 L100 70 L112 78" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M90 86 L108 76" stroke={strokeSoft} strokeWidth="1.1" opacity="0.7" />
        {/* Incoming streams */}
        <path d="M44 48 L70 62" stroke={strokeSoft} strokeWidth="1.3" strokeDasharray="3 2" />
        <path d="M52 36 L76 56" stroke={strokeSoft} strokeWidth="1.2" strokeDasharray="3 2" />
        <path d="M156 48 L130 62" stroke={strokeSoft} strokeWidth="1.3" strokeDasharray="3 2" />
        <path d="M148 36 L124 56" stroke={strokeSoft} strokeWidth="1.2" strokeDasharray="3 2" />
        <circle cx="44" cy="48" r="4" stroke={stroke} strokeWidth="1.2" />
        <circle cx="52" cy="36" r="3.5" stroke={strokeMid} strokeWidth="1.1" />
        <circle cx="156" cy="48" r="4" stroke={stroke} strokeWidth="1.2" />
        <circle cx="148" cy="36" r="3.5" stroke={strokeMid} strokeWidth="1.1" />
      </svg>
    );
  }

  if (step === 1) {
    // Explore analytics dashboard — isometric dashboard panel
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Panel */}
        <path d="M48 70 L100 42 L152 70 L100 98 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M48 70 L48 90 L100 118 L100 98 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 98 L152 70 L152 90 L100 118 Z" stroke={stroke} strokeWidth="1.4" />
        {/* Chart bars on top face */}
        <path d="M72 72 L72 62 L82 56 L82 66 Z" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M88 78 L88 58 L98 52 L98 72 Z" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M104 74 L104 54 L114 48 L114 68 Z" stroke={strokeSoft} strokeWidth="1.2" />
        <path d="M120 70 L120 50 L130 44 L130 64 Z" stroke={strokeSoft} strokeWidth="1.2" />
        {/* Trend line */}
        <path d="M70 70 L90 60 L110 64 L130 50" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="70" cy="70" r="2.5" stroke={strokeMid} strokeWidth="1.1" />
        <circle cx="130" cy="50" r="2.5" stroke={strokeMid} strokeWidth="1.1" />
      </svg>
    );
  }

  if (step === 2) {
    // Drill into student progress — isometric funnel / profile focus
    return (
      <svg
        viewBox="0 0 200 140"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
        {/* Wide board */}
        <path d="M52 52 L100 28 L148 52 L100 76 Z" stroke={strokeSoft} strokeWidth="1.4" />
        <path d="M52 52 L52 64 L100 88 L100 76 Z" stroke={strokeMid} strokeWidth="1.2" />
        <path d="M100 76 L148 52 L148 64 L100 88 Z" stroke={stroke} strokeWidth="1.2" />
        {/* Focus card */}
        <path d="M78 70 L100 58 L122 70 L100 82 Z" stroke={stroke} strokeWidth="1.6" />
        <path d="M78 70 L78 92 L100 106 L100 82 Z" stroke={strokeMid} strokeWidth="1.4" />
        <path d="M100 82 L122 70 L122 92 L100 106 Z" stroke={stroke} strokeWidth="1.4" />
        <circle cx="100" cy="78" r="7" stroke={strokeSoft} strokeWidth="1.3" />
        <path d="M90 92 C90 86 110 86 110 92" stroke={strokeSoft} strokeWidth="1.3" strokeLinecap="round" />
        {/* Magnify ring */}
        <circle cx="138" cy="42" r="12" stroke={stroke} strokeWidth="1.5" />
        <path d="M147 51 L156 60" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  // Act on insights — isometric action / decision node
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="100" cy="124" rx="64" ry="8" stroke={strokeSoft} strokeWidth="1.2" opacity="0.35" />
      {/* Decision hub */}
      <path d="M84 62 L100 52 L116 62 L100 72 Z" stroke={stroke} strokeWidth="1.6" />
      <path d="M84 62 L84 80 L100 92 L100 72 Z" stroke={strokeMid} strokeWidth="1.4" />
      <path d="M100 72 L116 62 L116 80 L100 92 Z" stroke={stroke} strokeWidth="1.4" />
      <path
        d="M92 70 L98 76 L110 62"
        stroke={strokeSoft}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Action branches */}
      <path d="M116 66 L146 50" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M116 76 L146 90" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M84 66 L54 50" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M136 42 L156 42 L156 58 L136 58 Z" stroke={stroke} strokeWidth="1.3" transform="skewX(-20)" />
      <path d="M136 42 L146 36 L166 36 L156 42" stroke={strokeMid} strokeWidth="1.2" />
      <path d="M42 48 L58 40 L70 48 L54 56 Z" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M42 48 L42 58 L54 66 L54 56 Z" stroke={strokeMid} strokeWidth="1.1" />
      <path d="M54 56 L70 48 L70 58 L54 66 Z" stroke={stroke} strokeWidth="1.1" />
      <path d="M136 84 L152 76 L164 84 L148 92 Z" stroke={strokeSoft} strokeWidth="1.3" />
      <path d="M136 84 L136 94 L148 102 L148 92 Z" stroke={strokeMid} strokeWidth="1.1" />
      <path d="M148 92 L164 84 L164 94 L148 102 Z" stroke={stroke} strokeWidth="1.1" />
    </svg>
  );
}

export function performanceAnalyticsHowStep(index: number): PerformanceHowStep {
  return (index % 4) as PerformanceHowStep;
}
