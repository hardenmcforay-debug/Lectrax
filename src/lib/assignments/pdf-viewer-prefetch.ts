"use client";

import { appFetch } from "@/lib/api/client-fetch";

type PdfJsModule = typeof import("pdfjs-dist");

export type PrefetchedSubmissionPdf = {
  signedUrl: string;
  data: ArrayBuffer;
  fileName?: string | null;
};

const WORKER_SRC = "/pdf.worker.min.mjs";

let pdfjsModulePromise: Promise<PdfJsModule> | null = null;
let workerWarmPromise: Promise<void> | null = null;
const submissionPrefetch = new Map<string, Promise<PrefetchedSubmissionPdf>>();

function configurePdfWorker(pdfjs: PdfJsModule) {
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
}

/** Warm the PDF.js worker HTTP cache so the first open does not wait on it. */
function warmPdfWorker(): Promise<void> {
  if (!workerWarmPromise) {
    workerWarmPromise = fetch(WORKER_SRC, {
      method: "GET",
      credentials: "same-origin",
      cache: "force-cache",
    })
      .then(() => undefined)
      .catch(() => {
        workerWarmPromise = null;
      });
  }
  return workerWarmPromise;
}

/** Load PDF.js (and warm its worker) once; safe to call early on assignment pages. */
export function prefetchPdfEngine(): Promise<PdfJsModule> {
  void warmPdfWorker();

  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist")
      .then((pdfjs) => {
        configurePdfWorker(pdfjs);
        return pdfjs;
      })
      .catch((error) => {
        pdfjsModulePromise = null;
        throw error;
      });
  }

  return pdfjsModulePromise;
}

export function getPdfJsModule(): Promise<PdfJsModule> {
  return prefetchPdfEngine();
}

/**
 * Prefetch signed URL + PDF bytes for a submission viewer API route.
 * Dedupes in-flight requests so hover + open share one download.
 */
export function prefetchSubmissionPdf(viewApiUrl: string): Promise<PrefetchedSubmissionPdf> {
  const existing = submissionPrefetch.get(viewApiUrl);
  if (existing) return existing;

  const task = (async () => {
    const [, response] = await Promise.all([prefetchPdfEngine(), appFetch(viewApiUrl)]);

    if (!response.ok) {
      throw new Error("Could not resolve submission PDF.");
    }

    const payload = (await response.json()) as { url?: string; fileName?: string | null };
    if (!payload.url) {
      throw new Error("Missing submission PDF URL.");
    }

    const pdfResponse = await fetch(payload.url, {
      method: "GET",
      cache: "force-cache",
    });

    if (!pdfResponse.ok) {
      throw new Error("Could not download submission PDF.");
    }

    const data = await pdfResponse.arrayBuffer();
    return {
      signedUrl: payload.url,
      data,
      fileName: payload.fileName ?? null,
    };
  })().catch((error) => {
    submissionPrefetch.delete(viewApiUrl);
    throw error;
  });

  submissionPrefetch.set(viewApiUrl, task);
  return task;
}

export function getPrefetchedSubmissionPdf(
  viewApiUrl: string
): Promise<PrefetchedSubmissionPdf> | null {
  return submissionPrefetch.get(viewApiUrl) ?? null;
}

/** Drop a cached PDF (e.g. after a new upload replaces the file). */
export function clearPrefetchedSubmissionPdf(viewApiUrl: string) {
  submissionPrefetch.delete(viewApiUrl);
}

/** Idle-friendly prefetch that yields to more important work. */
export function prefetchSubmissionPdfWhenIdle(viewApiUrl: string) {
  if (typeof window === "undefined") return;

  const run = () => {
    void prefetchSubmissionPdf(viewApiUrl);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 250);
  }
}
