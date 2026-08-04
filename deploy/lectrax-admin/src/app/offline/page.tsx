import Link from "next/link";
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
        <svg
          className="h-8 w-8 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 20h.01" />
          <path d="M8.5 16.429a5 5 0 0 1 7 0" />
          <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
          <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
          <path d="M2 8.82a15 15 0 0 1 4.177-2.318" />
          <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
          <path d="m2 2 20 20" />
        </svg>
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
