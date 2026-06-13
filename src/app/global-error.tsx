"use client";

import { useEffect } from "react";
import { logClientCrash } from "@/lib/errors/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientCrash("GlobalError", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 p-6 font-sans antialiased">
        <div className="mx-auto max-w-lg rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Something Went Wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            An unexpected error occurred. Please refresh the page or try again later.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
