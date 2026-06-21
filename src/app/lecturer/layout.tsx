import { redirect } from "next/navigation";
import { requireRoleLayout } from "@/lib/auth/require-role-layout";
import { ServiceUnavailablePage } from "@/components/errors/service-unavailable-page";
import { PortalOnboardingGate } from "@/components/auth/portal-onboarding-gate";

export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireRoleLayout("lecturer");

  if (guard.status === "service_unavailable") {
    return <ServiceUnavailablePage role="lecturer" />;
  }

  if (guard.status === "redirect") {
    redirect(guard.href);
  }

  return (
    <>
      <PortalOnboardingGate user={guard.user} role="lecturer" />
      {children}
    </>
  );
}
