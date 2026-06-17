import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="auth-route-root min-h-dvh bg-white">{children}</div>;
}
