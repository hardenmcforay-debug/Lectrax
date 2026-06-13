type StudentDashboardHeroProps = {
  displayName: string;
  collegeId: string | null;
};

export function StudentDashboardHero({ displayName, collegeId }: StudentDashboardHeroProps) {
  return (
    <section
      aria-label="Dashboard welcome"
      className="relative mb-6 w-full overflow-hidden rounded-2xl shadow-[0_12px_36px_-10px_rgba(11,61,145,0.4)]"
      style={{ background: "linear-gradient(135deg, #062a66 0%, #0b3d91 42%, #0a3580 100%)" }}
    >
      {/* Decorative background layer */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Soft ambient glow */}
        <div className="student-hero-glow absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#10b981]/20 blur-3xl" />
        <div className="student-hero-glow absolute -bottom-12 right-1/4 h-40 w-40 rounded-full bg-[#1d6fd4]/25 blur-3xl" />
        <div className="student-hero-float absolute right-[-2rem] top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[#10b981]/15 blur-2xl" />
        <div className="student-hero-shimmer pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Floating spheres */}
        <div className="student-hero-float absolute left-[18%] top-[22%] h-3 w-3 rounded-full bg-white/25 shadow-[0_0_20px_rgba(255,255,255,0.35)]" />
        <div className="absolute bottom-[28%] left-[42%] h-2 w-2 rounded-full bg-[#10b981]/60" />
        <div className="absolute right-[38%] top-[18%] h-4 w-4 rounded-full border border-white/20 bg-white/10" />
        <div className="student-hero-float-delayed absolute bottom-[20%] right-[12%] h-5 w-5 rounded-full bg-[#10b981]/30 blur-[1px]" />

        {/* Ribbon wave structures */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1200 280"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ribbon-a" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0b3d91" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="ribbon-b" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="ribbon-c" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#1d6fd4" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#062a66" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M-40 220 C 180 120, 320 300, 520 200 S 880 80, 1240 180 L 1240 320 L -40 320 Z"
            fill="url(#ribbon-a)"
          />
          <path
            d="M-20 260 C 220 180, 400 40, 640 140 S 960 280, 1220 120 L 1220 320 L -20 320 Z"
            fill="url(#ribbon-b)"
            opacity="0.7"
          />
          <path
            d="M200 -20 C 380 80, 520 40, 720 100 S 1000 200, 1200 60 L 1200 -20 Z"
            fill="url(#ribbon-c)"
          />
          <ellipse cx="920" cy="90" rx="140" ry="50" fill="#10b981" opacity="0.08" />
          <ellipse cx="280" cy="200" rx="180" ry="60" fill="#ffffff" opacity="0.04" />
        </svg>

        {/* Curved accent line */}
        <svg
          className="absolute right-0 top-0 h-full w-2/3 opacity-60"
          viewBox="0 0 800 280"
          preserveAspectRatio="xMaxYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M520 0 C 620 80, 680 180, 640 280 M600 20 C 700 100, 740 200, 700 280 M680 40 C 780 120, 800 200, 760 280"
            stroke="#10b981"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[7.5rem] flex-col justify-center gap-5 px-5 py-5 sm:min-h-[8rem] sm:px-7 sm:py-6 md:flex-row md:items-center md:justify-between md:gap-8 lg:px-8">
        {/* Left — greeting */}
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
            Welcome, {displayName}
          </h1>
          <p className="mt-1 text-sm text-white/70 sm:text-base">
            Track your academic progress through Lectrax
          </p>
        </div>

        {/* Right — College ID */}
        <div className="shrink-0 md:text-right">
          <div className="inline-flex w-full flex-col rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-sm sm:w-auto sm:min-w-[11rem] md:items-end">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[#10b981]">
              College ID
            </p>
            <p className="mt-1 font-mono text-xl font-bold tracking-wide text-white sm:text-2xl">
              {collegeId ?? "Not set"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
