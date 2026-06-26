"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appFetch } from "@/lib/api/client-fetch";
import { Button } from "@/components/ui/button";

export function SubmissionPdfViewClient({
  viewUrl,
  title,
  backHref,
}: {
  viewUrl: string;
  title: string;
  backHref: string;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void appFetch(viewUrl, { dedupe: false, timeoutMs: 60_000 })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Could not load submission PDF.");
        }
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        window.location.replace(url);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load submission PDF.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [viewUrl]);

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>Back to grading</Link>
        </Button>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Opening {title}…
    </p>
  );
}
