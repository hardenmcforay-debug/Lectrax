import type { ReactNode } from "react";
import { AuthBackToLanding } from "@/components/auth/auth-back-to-landing";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-route-root">
      <AuthBackToLanding />
      {children}
    </div>
  );
}
