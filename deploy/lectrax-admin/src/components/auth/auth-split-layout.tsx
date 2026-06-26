import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthBrandingPanel } from "@/components/auth/auth-branding-panel";



function AuthFormPanelDecorations() {
  return (
    <div className="auth-form-decorations pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/90 to-blue-50/40" />
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#10B981]/8 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#0B3D91]/5 blur-3xl" />
      <svg
        className="absolute bottom-0 left-0 w-full opacity-[0.04]"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="#0B3D91"
          d="M0,160L60,170.7C120,181,240,203,360,197.3C480,192,600,160,720,154.7C840,149,960,171,1080,181.3C1200,192,1320,192,1380,192L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
        />
      </svg>
      <svg
        className="absolute right-0 top-0 h-full w-1/2 opacity-[0.06]"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMaxYMid slice"
      >
        <path d="M350 0 Q200 200 280 400 T350 800" stroke="#0B3D91" strokeWidth="2" fill="none" />
        <path d="M380 50 Q220 250 300 450 T380 750" stroke="#10B981" strokeWidth="1.5" fill="none" />
        <path
          d="M320 100 Q180 300 240 500 T320 700"
          stroke="#0B3D91"
          strokeWidth="1"
          fill="none"
          strokeDasharray="6 8"
        />
      </svg>
      <div className="absolute right-[15%] top-[18%] h-3 w-3 rounded-full bg-[#10B981]/25" />
      <div className="absolute right-[25%] top-[35%] h-5 w-5 rounded-full border border-[#0B3D91]/10" />
      <div className="absolute bottom-[22%] left-[12%] h-4 w-4 rounded-full bg-[#0B3D91]/8" />
      <div className="absolute bottom-[35%] right-[8%] h-8 w-8 rounded-full border border-[#10B981]/15 bg-[#10B981]/5" />
    </div>
  );
}

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page-enter auth-shell flex flex-col md:flex-row">
      <AuthBrandingPanel />

      <div className="auth-form-panel auth-shell-panel relative flex flex-1 flex-col bg-transparent md:bg-white">
        <AuthFormPanelDecorations />

        <div className="auth-pwa-form-inner relative z-10 flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8 md:px-12 lg:px-16 xl:px-20">
          <Link
            href="/"
            aria-label="Back to home"
            className="auth-back-link inline-flex w-fit shrink-0 items-center justify-center rounded-xl p-2 text-primary transition-colors hover:bg-primary/5 hover:text-primary md:p-2.5"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>

          <div className="flex flex-1 items-center justify-center py-2 md:py-0">
            <div className="auth-form-content mx-auto w-full min-w-0 max-w-md lg:max-w-lg">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

