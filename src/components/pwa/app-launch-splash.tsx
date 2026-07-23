import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { pwaIconUrl } from "@/lib/pwa/config";

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
      <div className="relative h-24 w-24 overflow-hidden rounded-[1.35rem] shadow-md sm:h-28 sm:w-28">
        <Image
          src={pwaIconUrl("/icons/icon-512x512.png")}
          alt={`${APP_NAME} logo`}
          fill
          priority
          unoptimized
          className="object-contain"
          sizes="112px"
        />
      </div>
      <p className="mt-5 text-2xl font-bold text-primary">{APP_NAME}</p>
      <p className="mt-3 text-sm font-medium text-primary">Loading your workspace...</p>
      <p className="mt-2 text-xs text-muted-foreground">Restoring your {APP_NAME} session</p>
    </div>
  );
}
