export function AcademicIllustration() {
  return (
    <svg
      viewBox="0 0 400 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="max-w-sm"
      aria-hidden
    >
      {/* Dashboard card */}
      <rect x="40" y="30" width="200" height="140" rx="16" fill="white" fillOpacity="0.12" />
      <rect x="40" y="30" width="200" height="140" rx="16" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" />

      {/* Header bar */}
      <rect x="56" y="46" width="80" height="8" rx="4" fill="white" fillOpacity="0.5" />
      <rect x="56" y="62" width="120" height="6" rx="3" fill="white" fillOpacity="0.25" />

      {/* Attendance chart bars */}
      <rect x="56" y="120" width="16" height="34" rx="4" fill="#10B981" fillOpacity="0.9" />
      <rect x="80" y="108" width="16" height="46" rx="4" fill="#10B981" fillOpacity="0.7" />
      <rect x="104" y="98" width="16" height="56" rx="4" fill="#10B981" fillOpacity="0.85" />
      <rect x="128" y="112" width="16" height="42" rx="4" fill="#10B981" fillOpacity="0.6" />
      <rect x="152" y="90" width="16" height="64" rx="4" fill="#10B981" fillOpacity="0.95" />
      <rect x="176" y="104" width="16" height="50" rx="4" fill="#10B981" fillOpacity="0.75" />

      {/* Chart label */}
      <rect x="56" y="86" width="60" height="6" rx="3" fill="white" fillOpacity="0.3" />

      {/* Floating student card */}
      <rect x="260" y="50" width="110" height="72" rx="14" fill="white" fillOpacity="0.15" />
      <rect x="260" y="50" width="110" height="72" rx="14" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
      <circle cx="290" cy="78" r="14" fill="#10B981" fillOpacity="0.8" />
      <rect x="312" y="70" width="44" height="6" rx="3" fill="white" fillOpacity="0.5" />
      <rect x="312" y="82" width="32" height="5" rx="2.5" fill="white" fillOpacity="0.3" />
      <rect x="274" y="102" width="82" height="6" rx="3" fill="#10B981" fillOpacity="0.5" />

      {/* Attendance badge */}
      <rect x="270" y="140" width="100" height="36" rx="10" fill="#10B981" fillOpacity="0.25" />
      <rect x="270" y="140" width="100" height="36" rx="10" stroke="#10B981" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="288" cy="158" r="6" fill="#10B981" />
      <rect x="300" y="153" width="56" height="5" rx="2.5" fill="white" fillOpacity="0.7" />
      <rect x="300" y="162" width="40" height="4" rx="2" fill="white" fillOpacity="0.4" />

      {/* Lecturer figure */}
      <circle cx="70" cy="200" r="18" fill="white" fillOpacity="0.2" />
      <circle cx="70" cy="192" r="10" fill="white" fillOpacity="0.6" />
      <path
        d="M55 210 Q70 198 85 210"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Student figures */}
      <circle cx="180" cy="200" r="14" fill="white" fillOpacity="0.15" />
      <circle cx="180" cy="194" r="8" fill="white" fillOpacity="0.5" />
      <circle cx="210" cy="200" r="14" fill="white" fillOpacity="0.15" />
      <circle cx="210" cy="194" r="8" fill="#10B981" fillOpacity="0.7" />
      <circle cx="240" cy="200" r="14" fill="white" fillOpacity="0.15" />
      <circle cx="240" cy="194" r="8" fill="white" fillOpacity="0.5" />

      {/* Decorative dots */}
      <circle cx="350" cy="30" r="4" fill="#10B981" fillOpacity="0.6" />
      <circle cx="20" cy="60" r="3" fill="white" fillOpacity="0.3" />
      <circle cx="380" cy="180" r="5" fill="white" fillOpacity="0.2" />
    </svg>
  );
}
