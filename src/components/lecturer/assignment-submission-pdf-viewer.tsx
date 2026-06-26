"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { appFetch } from "@/lib/api/client-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AssignmentSubmissionViewerGrading = {
  value: string;
  savedGrade: number | null;
  maxScore: number;
  isDirty: boolean;
  saving: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
};

export type AssignmentSubmissionViewerData = {
  enrollmentId: string;
  studentName: string;
  studentId: string | null;
  assignmentTitle: string;
  submittedAt: string | null;
  fileName: string | null;
  viewUrl: string;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;
const DEFAULT_SCALE = 1.75;

function formatSubmittedAt(value: string | null): string {
  if (!value) return "Not available";
  try {
    return format(new Date(value), "d MMMM yyyy • h:mm a");
  } catch {
    return "Not available";
  }
}

function configurePdfWorker(pdfjs: typeof import("pdfjs-dist")) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  scale,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    void (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      const task = page.render({
        canvasContext: context,
        viewport,
        canvas,
      });
      renderTask = task;
      await task.promise;
    })().catch(() => {
      /* Rendering cancelled or failed for a single page. */
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, scale]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto block max-w-full rounded-sm bg-white shadow-sm"
      aria-label={`Page ${pageNumber}`}
    />
  );
}

export function AssignmentSubmissionPdfViewer({
  open,
  data,
  grading,
  onClose,
}: {
  open: boolean;
  data: AssignmentSubmissionViewerData | null;
  grading?: AssignmentSubmissionViewerGrading | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mounted, setMounted] = useState(false);

  const resetViewer = useCallback(() => {
    setPdfDoc((prev) => {
      void prev?.cleanup();
      return null;
    });
    setPageCount(0);
    setCurrentPage(1);
    setScale(DEFAULT_SCALE);
    setLoading(false);
    setLoadError(false);
    setBlob(null);
    pageRefs.current.clear();
  }, []);

  const loadDocument = useCallback(async (viewUrl: string) => {
    setLoading(true);
    setLoadError(false);
    setPdfDoc((prev) => {
      void prev?.cleanup();
      return null;
    });
    setBlob(null);
    setPageCount(0);
    setCurrentPage(1);

    try {
      const res = await appFetch(viewUrl, { dedupe: false, timeoutMs: 60_000 });
      if (!res.ok) {
        throw new Error("load_failed");
      }

      const fileBlob = await res.blob();
      const pdfjs = await import("pdfjs-dist");
      configurePdfWorker(pdfjs);

      const buffer = await fileBlob.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buffer }).promise;

      setBlob(fileBlob);
      setPdfDoc(doc);
      setPageCount(doc.numPages);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !data?.viewUrl) {
      resetViewer();
      return;
    }

    void loadDocument(data.viewUrl);
  }, [open, data?.viewUrl, loadDocument, resetViewer]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!open || !pdfDoc || pageCount === 0 || loading) return;

    const root = scrollRef.current;
    if (!root) return;

    const frame = window.requestAnimationFrame(() => {
      observerRef.current?.disconnect();

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

          const top = visible[0]?.target.getAttribute("data-page");
          if (top) {
            const page = Number(top);
            if (!Number.isNaN(page)) {
              setCurrentPage(page);
            }
          }
        },
        {
          root,
          threshold: [0.35, 0.55, 0.75],
        },
      );

      observerRef.current = observer;

      for (const node of pageRefs.current.values()) {
        observer.observe(node);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [open, pdfDoc, pageCount, scale, loading]);

  const scrollToPage = useCallback((page: number) => {
    const target = pageRefs.current.get(page);
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setCurrentPage(page);
  }, [reduceMotion]);

  const goToPreviousPage = useCallback(() => {
    scrollToPage(Math.max(1, currentPage - 1));
  }, [currentPage, scrollToPage]);

  const goToNextPage = useCallback(() => {
    scrollToPage(Math.min(pageCount, currentPage + 1));
  }, [currentPage, pageCount, scrollToPage]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, Number((prev + SCALE_STEP).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, Number((prev - SCALE_STEP).toFixed(2))));
  }, []);

  const handleDownload = useCallback(() => {
    if (!blob || !data) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = data.fileName ?? "assignment-submission.pdf";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [blob, data]);

  const handleOpenInBrowser = useCallback(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, [blob]);

  const handleRetry = useCallback(() => {
    if (!data?.viewUrl) return;
    void loadDocument(data.viewUrl);
  }, [data?.viewUrl, loadDocument]);

  if (!mounted) return null;

  const studentIdLabel = data?.studentId?.trim() ? data.studentId : "Not Provided";
  const gradeStatus =
    grading?.savedGrade !== null && grading?.savedGrade !== undefined
      ? "Graded"
      : "Submitted";

  return createPortal(
    <AnimatePresence>
      {open && data ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-stretch justify-center p-0 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close assignment viewer"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          />

          <motion.div
            className="relative z-[201] flex h-[100dvh] w-full max-w-[1400px] flex-col overflow-hidden border border-border/60 bg-background shadow-2xl md:h-[calc(100dvh-2rem)] md:rounded-xl"
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex items-start justify-between gap-3 px-4 py-2 md:px-6 md:py-3">
                <div className="min-w-0 space-y-1 pr-2">
                  <p id={titleId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Student Assignment
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-5 md:gap-8">
                    <div className="space-y-0.5 text-sm">
                      <p>
                        <span className="font-medium text-foreground">Student Name:</span>{" "}
                        <span className="text-muted-foreground">{data.studentName}</span>
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Student ID:</span>{" "}
                        <span className="text-muted-foreground">{studentIdLabel}</span>
                      </p>
                    </div>
                    <div className="space-y-0.5 text-sm">
                      <p>
                        <span className="font-medium text-foreground">Assignment:</span>{" "}
                        <span className="text-muted-foreground">{data.assignmentTitle}</span>
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Submitted:</span>{" "}
                        <span className="text-muted-foreground">
                          {formatSubmittedAt(data.submittedAt)}
                        </span>
                      </p>
                    </div>
                    {grading ? (
                      <div className="flex flex-col gap-2 border-border sm:border-l sm:pl-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {gradeStatus === "Graded" ? (
                            <Badge variant="accent">{gradeStatus}</Badge>
                          ) : (
                            <Badge variant="secondary">{gradeStatus}</Badge>
                          )}
                          {grading.isDirty ? (
                            <span className="text-xs font-medium text-amber-700">Unsaved</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="viewer-grade-input" className="text-xs">
                              Grade
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="viewer-grade-input"
                                type="number"
                                min={0}
                                max={grading.maxScore}
                                className="h-9 w-24"
                                placeholder={`0–${grading.maxScore}`}
                                value={grading.value}
                                onChange={(e) => grading.onChange(e.target.value)}
                                disabled={grading.disabled || grading.saving}
                              />
                              <span className="text-xs text-muted-foreground">
                                / {grading.maxScore}
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="accent"
                            size="sm"
                            className="h-9"
                            disabled={grading.disabled || grading.saving || !grading.isDirty}
                            onClick={grading.onSave}
                          >
                            {grading.saving ? "Saving..." : "Save Grade"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={onClose}>
                    <X className="mr-1.5 h-4 w-4" />
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={!blob || loading || loadError}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenInBrowser}
                    disabled={!blob || loading || loadError}
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Open in Browser
                  </Button>
                </div>
              </div>

              {!loading && !loadError && pdfDoc && pageCount > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 md:px-6">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={goToPreviousPage}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[88px] text-center text-xs text-muted-foreground">
                      Page {currentPage} of {pageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={goToNextPage}
                      disabled={currentPage >= pageCount}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={zoomOut}
                      disabled={scale <= MIN_SCALE}
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[52px] text-center text-xs text-muted-foreground">
                      {Math.round(scale * 100)}%
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={zoomIn}
                      disabled={scale >= MAX_SCALE}
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </header>

            <div
              ref={scrollRef}
              className={cn(
                "min-h-0 flex-1 overflow-y-auto bg-muted/30",
                loading || loadError ? "flex items-center justify-center" : "p-3 md:p-6",
              )}
            >
              {loading ? (
                <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Loading Assignment...</p>
                    <p className="text-sm text-muted-foreground">
                      Please wait while we prepare the document.
                    </p>
                  </div>
                </div>
              ) : null}

              {loadError ? (
                <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-foreground">
                      Unable to Open Assignment
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The assignment could not be loaded at this time. Please try again.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button type="button" variant="accent" size="sm" onClick={handleRetry}>
                      Retry
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : null}

              {!loading && !loadError && pdfDoc && pageCount > 0 ? (
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6">
                  {Array.from({ length: pageCount }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <div
                        key={`${data.enrollmentId}-page-${pageNumber}-${scale}`}
                        data-page={pageNumber}
                        ref={(node) => {
                          if (node) pageRefs.current.set(pageNumber, node);
                          else pageRefs.current.delete(pageNumber);
                        }}
                        className="flex justify-center"
                      >
                        <PdfPageCanvas pdf={pdfDoc} pageNumber={pageNumber} scale={scale} />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
