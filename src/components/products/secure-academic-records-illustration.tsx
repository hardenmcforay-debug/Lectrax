"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Isometric hero illustration for Secure Academic Records —
 * vault, protected documents, and role-based access.
 */
export function SecureAcademicRecordsIllustration() {
  const reducedMotion = useReducedMotion();
  const uid = "sar";

  return (
    <motion.div
      className="relative aspect-[16/10] w-full"
      aria-hidden
      animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
      transition={
        reducedMotion
          ? undefined
          : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <motion.div
        className="absolute inset-0"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <svg
          viewBox="0 0 640 400"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id={`${uid}-vault`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1455C4" />
              <stop offset="100%" stopColor="#0B3D91" />
            </linearGradient>
            <linearGradient id={`${uid}-vault-side`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0B3D91" />
              <stop offset="100%" stopColor="#082A66" />
            </linearGradient>
            <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1E6DFF" />
              <stop offset="100%" stopColor="#1455C4" />
            </linearGradient>
            <linearGradient id={`${uid}-doc`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E8EEF8" />
            </linearGradient>
            <linearGradient id={`${uid}-shield`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#0B3D91" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Soft ground ellipse */}
          <ellipse cx="320" cy="348" rx="210" ry="28" fill="#0B3D91" fillOpacity="0.08" />

          {/* Isometric vault body */}
          <g filter={`url(#${uid}-soft)`}>
            {/* Left face */}
            <path
              d="M220 150 L220 278 L320 328 L320 200 Z"
              fill={`url(#${uid}-vault-side)`}
            />
            {/* Right face */}
            <path
              d="M320 200 L320 328 L420 278 L420 150 Z"
              fill={`url(#${uid}-vault)`}
            />
            {/* Top face */}
            <path
              d="M220 150 L320 120 L420 150 L320 200 Z"
              fill={`url(#${uid}-top)`}
            />

            {/* Door panel on right face */}
            <path
              d="M338 210 L338 300 L398 270 L398 186 Z"
              fill="#082A66"
              fillOpacity="0.55"
            />
            <circle cx="388" cy="238" r="7" fill="#60A5FA" />
            <circle cx="388" cy="238" r="3.5" fill="#FFFFFF" />

            {/* Lock on left face */}
            <path
              d="M255 210 C255 198 268 190 280 198 C292 206 292 222 280 230 C268 238 255 230 255 218 Z"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <rect x="250" y="224" width="36" height="28" rx="5" fill="#60A5FA" />
            <circle cx="268" cy="236" r="4" fill="#0B3D91" />
            <path d="M268 240 V246" stroke="#0B3D91" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Document stack (left) */}
          <g filter={`url(#${uid}-soft)`}>
            <path d="M120 210 L180 180 L230 205 L170 238 Z" fill="#CBD5E1" />
            <path d="M120 210 L170 238 L170 278 L120 248 Z" fill="#94A3B8" />
            <path d="M170 238 L230 205 L230 245 L170 278 Z" fill={`url(#${uid}-doc)`} />
            <path d="M182 250 L212 234" stroke="#0B3D91" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
            <path d="M182 260 L206 246" stroke="#0B3D91" strokeWidth="3" strokeLinecap="round" opacity="0.25" />

            <path d="M132 198 L192 168 L242 193 L182 226 Z" fill="#E2E8F0" />
            <path d="M132 198 L182 226 L182 266 L132 236 Z" fill="#A8B4C4" />
            <path d="M182 226 L242 193 L242 233 L182 266 Z" fill={`url(#${uid}-doc)`} />
            <path d="M194 238 L224 222" stroke="#10B981" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <path d="M194 248 L218 234" stroke="#10B981" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          </g>

          {/* Floating access cards (right) */}
          <g filter={`url(#${uid}-soft)`}>
            <path d="M450 165 L520 135 L560 160 L490 192 Z" fill="#FFFFFF" />
            <path d="M450 165 L490 192 L490 222 L450 194 Z" fill="#D0DAEA" />
            <path d="M490 192 L560 160 L560 190 L490 222 Z" fill="#EEF4FF" />
            <circle cx="508" cy="188" r="8" fill="#0B3D91" />
            <path d="M520 186 L542 174" stroke="#0B3D91" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
            <path d="M520 196 L536 186" stroke="#0B3D91" strokeWidth="3" strokeLinecap="round" opacity="0.3" />

            <path d="M470 210 L540 180 L580 205 L510 237 Z" fill="#FFFFFF" />
            <path d="M470 210 L510 237 L510 267 L470 239 Z" fill="#C5D0E0" />
            <path d="M510 237 L580 205 L580 235 L510 267 Z" fill="#F0FDF4" />
            <circle cx="528" cy="233" r="8" fill="#10B981" />
            <path d="M540 231 L562 219" stroke="#059669" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
            <path d="M540 241 L556 231" stroke="#059669" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
          </g>

          {/* Shield badge above vault */}
          <g filter={`url(#${uid}-soft)`}>
            <path
              d="M320 78 L358 92 L358 128 C358 148 340 162 320 170 C300 162 282 148 282 128 L282 92 Z"
              fill={`url(#${uid}-shield)`}
            />
            <path
              d="M306 122 L316 132 L336 110"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Floating status chips */}
          <g>
            <rect x="148" y="118" width="88" height="28" rx="14" fill="#0B3D91" fillOpacity="0.92" />
            <circle cx="166" cy="132" r="5" fill="#34D399" />
            <rect x="178" y="126" width="44" height="6" rx="3" fill="white" fillOpacity="0.85" />
            <rect x="178" y="136" width="28" height="5" rx="2.5" fill="white" fillOpacity="0.45" />

            <rect x="448" y="98" width="96" height="28" rx="14" fill="#10B981" fillOpacity="0.95" />
            <rect x="464" y="110" width="64" height="6" rx="3" fill="white" fillOpacity="0.9" />
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
