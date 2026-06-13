import { requireAuthenticatedUser } from "@/lib/auth/require-page-user";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { buildProfileSettingsInitial } from "@/lib/settings/profile-settings-initial";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProfileSettings } from "@/components/settings/profile-settings";

export const dynamic = "force-dynamic";

export default async function LecturerSettingsPage() {
  const user = await requireAuthenticatedUser();

  const profile = await getProfileByUserId(user.id);

  return (
    <DashboardShell
      role="lecturer"
      title="Settings"
      description="Manage your profile, account preferences, security settings, and platform experience from one place."
    >
      <ProfileSettings
        role="lecturer"
        initialProfile={buildProfileSettingsInitial(user, "lecturer", profile)}
      />
    </DashboardShell>
  );
}
