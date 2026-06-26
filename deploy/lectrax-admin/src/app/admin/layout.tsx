import { redirect } from "next/navigation";
import { requireRoleLayout } from "@/lib/auth/require-role-layout";
import { ServiceUnavailablePage } from "@/components/errors/service-unavailable-page";
import { ProtectedSessionGuard } from "@/components/auth/protected-session-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireRoleLayout("platform_admin");

  if (guard.status === "service_unavailable") {
    return <ServiceUnavailablePage role="platform_admin" />;
  }

  if (guard.status === "redirect") {
    redirect(guard.href);
  }

  return (
    <>
      <ProtectedSessionGuard />
      {children}
    </>
  );
}
