import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/layout/logo";

export function AppLaunchSplash() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-6 text-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Logo className="justify-center" labelClassName="text-xl font-bold" />
      <p className="mt-6 text-sm font-medium text-primary">Loading your workspace...</p>
      <p className="mt-2 text-xs text-muted-foreground">Restoring your {APP_NAME} session</p>
    </div>
  );
}
