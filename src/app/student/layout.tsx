import { redirect } from "next/navigation";
import { requireRoleLayout } from "@/lib/auth/require-role-layout";
import { ServiceUnavailablePage } from "@/components/errors/service-unavailable-page";
import { AttendanceDeviceRegistrar } from "@/components/student/attendance-device-registrar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireRoleLayout("student");

  if (guard.status === "service_unavailable") {
    return <ServiceUnavailablePage role="student" />;
  }

  if (guard.status === "redirect") {
    redirect(guard.href);
  }

  return (
    <>
      <AttendanceDeviceRegistrar />
      {children}
    </>
  );
}
