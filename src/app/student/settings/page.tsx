import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { buildProfileSettingsInitial } from "@/lib/settings/profile-settings-initial";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProfileSettings } from "@/components/settings/profile-settings";

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage() {
  const user = await requireAuthenticatedUser();

  const profile = await getProfileByUserId(user.id);

  return (
    <DashboardShell role="student" title="Settings">
      <ProfileSettings
        role="student"
        initialProfile={buildProfileSettingsInitial(user, "student", profile)}
      />
    </DashboardShell>
  );
}
