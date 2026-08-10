"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthBrandingPanel } from "@/components/auth/auth-branding-panel";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { isRunningAsInstalledPwa } from "@/lib/pwa/detect";

function AuthFormPanelDecorations() {
  return (
    <div className="auth-form-decorations pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-100 to-blue-50/50" />
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#10B981]/6 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#0B3D91]/4 blur-3xl" />
    </div>
  );
}

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const hideBackLink = hydrated && isRunningAsInstalledPwa();

  return (
    <div className="auth-page-enter auth-shell flex flex-col md:flex-row">
      <AuthBrandingPanel />

      <div className="auth-form-panel auth-shell-panel relative flex flex-1 flex-col bg-slate-100 md:bg-slate-100">
        <AuthFormPanelDecorations />

        <div className="auth-pwa-form-inner relative z-10 flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8 md:px-12 lg:px-16 xl:px-20">
          {!hideBackLink && (
            <Link
              href="/"
              aria-label="Back to home"
              className="auth-back-link inline-flex w-fit shrink-0 items-center justify-center rounded-xl p-2 text-primary transition-colors hover:bg-primary/5 hover:text-primary md:p-2.5"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          )}

          <div className="flex flex-1 items-center justify-center py-2 md:py-0">
            <div className="auth-form-content mx-auto w-full min-w-0 max-w-md lg:max-w-lg">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

