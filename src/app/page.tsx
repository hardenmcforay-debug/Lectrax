import { redirect } from "next/navigation";
import { AccountDeletedBanner } from "@/components/auth/account-deleted-banner";
import { LoginFailedBanner } from "@/components/auth/login-failed-banner";
import { LandingPage } from "@/components/landing/landing-page";
import { AuthLaunchGate } from "@/components/pwa/auth-launch-gate";
import { getAuthenticatedHomeRedirect } from "@/lib/auth/resolve-authenticated-home";
import "./landing.css";

export const dynamic = "force-dynamic";

function readParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const accountDeleted = readParam(params.accountDeleted) === "1";

  // After account deletion the session is already cleared; skip auth home redirect
  // so the confirmation banner can show on the landing page.
  if (!accountDeleted) {
    const dashboardPath = await getAuthenticatedHomeRedirect();
    if (dashboardPath) {
      redirect(dashboardPath);
    }
  }

  const showLoginFailed =
    readParam(params.login_failed) === "1" || readParam(params.error) === "auth";

  return (
    <AuthLaunchGate>
      <AccountDeletedBanner show={accountDeleted} />
      <LoginFailedBanner show={showLoginFailed && !accountDeleted} />
      <LandingPage />
    </AuthLaunchGate>
  );
}
