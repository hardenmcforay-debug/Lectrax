import { Logo } from "@/components/layout/logo";
import { AcademicIllustration } from "@/components/auth/academic-illustration";
import { APP_NAME } from "@/lib/constants";

export function AuthBrandingPanel() {
  return (
    <div className="auth-branding-panel auth-shell-panel relative hidden shrink-0 flex-col overflow-hidden bg-gradient-to-br from-[#0B3D91] via-[#0F4DA8] to-[#0A3580] md:flex md:h-full md:w-[45%] lg:w-[42%]">
      <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#10B981]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-[#10B981]/18 blur-3xl" />
      <div className="pointer-events-none absolute left-1/4 top-1/3 h-40 w-40 rounded-full bg-[#10B981]/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-24 w-24 rounded-full bg-[#10B981]/15 blur-xl" />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
        viewBox="0 0 800 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <path d="M0 450 Q200 300 400 450 T800 450" stroke="white" strokeWidth="1.5" fill="none" />
        <path
          d="M0 550 Q250 400 500 550 T800 550"
          stroke="white"
          strokeWidth="1"
          fill="none"
          strokeDasharray="8 12"
        />
        <path
          d="M100 0 Q300 200 200 400 T100 800"
          stroke="#10B981"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        <path d="M600 100 Q450 350 650 550 T700 850" stroke="white" strokeWidth="1" fill="none" />
      </svg>

      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full opacity-[0.1]"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="white"
          d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>

      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full opacity-[0.06]"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="white"
          d="M0,256L60,245.3C120,235,240,213,360,218.7C480,224,600,256,720,261.3C840,267,960,245,1080,234.7C1200,224,1320,224,1380,224L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
        />
      </svg>

      <svg
        className="pointer-events-none absolute top-0 left-0 w-full opacity-[0.04]"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="white"
          d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
        />
      </svg>

      <div className="pointer-events-none absolute right-10 top-20 h-14 w-14 rotate-12 rounded-2xl border border-white/10 bg-white/5" />
      <div className="pointer-events-none absolute left-12 top-40 h-7 w-7 rounded-full bg-[#10B981]/35" />
      <div className="pointer-events-none absolute right-24 top-1/2 h-10 w-10 rounded-full border border-white/15" />
      <div className="pointer-events-none absolute bottom-40 left-20 h-12 w-12 -rotate-6 rounded-xl border border-[#10B981]/25 bg-[#10B981]/10" />
      <div className="pointer-events-none absolute bottom-24 right-16 h-5 w-5 rounded-full bg-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-16 w-16 rounded-full border border-white/8" />

      <div className="auth-branding-content relative z-10 flex min-h-0 flex-1 flex-col p-6 sm:p-8 md:p-10 lg:p-12">
        <Logo
          variant="light"
          className="auth-fade-in shrink-0 gap-2.5"
          labelClassName="text-xl font-bold tracking-tight lg:text-2xl"
          markClassName="h-9 w-9 lg:h-10 lg:w-10"
          iconClassName="h-8 w-8 shrink-0 text-[#10B981] lg:h-9 lg:w-9"
        />

        <div className="flex min-h-0 flex-1 flex-col justify-center md:py-6">
          <div className="auth-fade-in auth-fade-in-delay-1">
            <h1 className="max-w-md text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl lg:text-3xl">
              Welcome to {APP_NAME}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75 sm:mt-3 lg:text-base">
              Simplify attendance tracking, assessments, assignments, and academic record
              management from one modern platform.
            </p>
          </div>

          <div className="auth-illustration-wrap auth-fade-in auth-fade-in-delay-2 mt-6 hidden min-h-0 md:flex lg:mt-8">
            <AcademicIllustration />
          </div>
        </div>
      </div>
    </div>
  );
}
