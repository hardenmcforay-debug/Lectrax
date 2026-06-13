import Link from "next/link";
import { WifiOff } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { OFFLINE_MODE_MESSAGE, OFFLINE_MODE_SUBMESSAGE } from "@/lib/errors/messages";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <WifiOff className="h-8 w-8 text-primary" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-primary">{OFFLINE_MODE_MESSAGE}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{OFFLINE_MODE_SUBMESSAGE}</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90"
      >
        Return to {APP_NAME}
      </Link>
    </div>
  );
}
