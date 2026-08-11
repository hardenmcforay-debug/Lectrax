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
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { appFetch } from "@/lib/api/client-fetch";
import {
  getPdfJsModule,
  getPrefetchedSubmissionPdf,
  prefetchPdfEngine,
  prefetchSubmissionPdf,
} from "@/lib/assignments/pdf-viewer-prefetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/hooks/use-hydrated";

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
  assignmentTitle: string;
  submittedAt: string | null;
  fileName: string | null;
  viewUrl: string;
  viewerTitle?: string;
  studentName?: string;
  studentId?: string | null;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;
/** Large desktop fallback before the document/container can be measured */
const DEFAULT_SCALE_DESKTOP = 1.5;
/** Phones / tablets / iPads: open at 100% by default */
const DEFAULT_SCALE_SMALL = 1;
const FIT_WIDTH_MAX_WIDTH = 1180;
const VIEWER_PAGE_GUTTER_PX = 16;
const MAX_RENDER_DPR = 2;
const LAZY_PAGE_ROOT_MARGIN = "320px 0px";

function prefersSmallScreenScale(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${FIT_WIDTH_MAX_WIDTH}px)`).matches;
}

function getFallbackPdfScale(): number {
  return prefersSmallScreenScale() ? DEFAULT_SCALE_SMALL : DEFAULT_SCALE_DESKTOP;
}

function computeFitWidthScale(pageWidthAtScale1: number, containerWidth: number): number {
  if (pageWidthAtScale1 <= 0 || containerWidth <= 0) return getFallbackPdfScale();
  const available = Math.max(120, containerWidth - VIEWER_PAGE_GUTTER_PX);
  const fit = available / pageWidthAtScale1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(fit.toFixed(3))));
}

function formatSubmittedAt(value: string | null): string {
  if (!value) return "Not available";
  try {
    return format(new Date(value), "d MMMM yyyy • h:mm a");
  } catch {
    return "Not available";
  }
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

      const outputScale = Math.min(window.devicePixelRatio || 1, MAX_RENDER_DPR);
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
      className="mx-auto block h-auto max-w-full rounded-sm bg-white shadow-sm"
      aria-label={`Page ${pageNumber}`}
    />
  );
}

function LazyPdfPage({
  pdf,
  pageNumber,
  scale,
  scrollRootRef,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(pageNumber === 1);

  useEffect(() => {
    if (shouldRender) return;

    const root = scrollRootRef.current;
    const target = containerRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      {
        root,
        rootMargin: LAZY_PAGE_ROOT_MARGIN,
        threshold: 0.01,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [pageNumber, scrollRootRef, shouldRender]);

  return (
    <div
      ref={containerRef}
      className="flex w-full min-h-[min(70vw,420px)] justify-center sm:min-h-[420px]"
    >
      {shouldRender ? (
        <PdfPageCanvas pdf={pdf} pageNumber={pageNumber} scale={scale} />
      ) : (
        <div
          className="mx-auto aspect-[8.5/11] w-full max-w-full animate-pulse rounded-sm bg-white/90 shadow-sm"
          aria-hidden
        />
      )}
    </div>
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
  const hydrated = useHydrated();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const userZoomedRef = useRef(false);
  const pageWidthRef = useRef<number | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfSourceUrl, setPdfSourceUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(getFallbackPdfScale);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  const activeViewUrl = open && data?.viewUrl ? data.viewUrl : null;
  const [prevActiveViewUrl, setPrevActiveViewUrl] = useState<string | null>(null);

  if (activeViewUrl !== prevActiveViewUrl) {
    setPrevActiveViewUrl(activeViewUrl);
    if (activeViewUrl === null) {
      setPageCount(0);
      setCurrentPage(1);
      setScale(getFallbackPdfScale());
      setLoading(false);
      setLoadProgress(null);
      setLoadError(false);
      setPdfSourceUrl(null);
      if (pdfDoc !== null) {
        setPdfDoc((prev) => {
          void prev?.cleanup();
          return null;
        });
      }
    } else {
      setScale(getFallbackPdfScale());
    }
  }

  useEffect(() => {
    userZoomedRef.current = false;
    pageWidthRef.current = null;
  }, [activeViewUrl]);

  const readPageWidth = useCallback(async (doc: PDFDocumentProxy) => {
    if (pageWidthRef.current !== null) return pageWidthRef.current;
    try {
      const page = await doc.getPage(1);
      const pageWidth = page.getViewport({ scale: 1 }).width;
      pageWidthRef.current = pageWidth;
      return pageWidth;
    } catch {
      return null;
    }
  }, []);

  const applyDefaultScale = useCallback(async (doc: PDFDocumentProxy) => {
    const root = scrollRef.current;
    if (!root) return;

    // Small screens: always open at 100%. Desktop: comfortable default, capped to fit.
    if (prefersSmallScreenScale()) {
      setScale((prev) => (Math.abs(prev - DEFAULT_SCALE_SMALL) < 0.01 ? prev : DEFAULT_SCALE_SMALL));
      return;
    }

    const pageWidth = await readPageWidth(doc);
    if (pageWidth === null) return;

    const fitScale = computeFitWidthScale(pageWidth, root.clientWidth);
    const nextScale = Math.min(DEFAULT_SCALE_DESKTOP, fitScale);
    setScale((prev) => (Math.abs(prev - nextScale) < 0.01 ? prev : nextScale));
  }, [readPageWidth]);

  const applyFitWidthScale = useCallback(async (doc: PDFDocumentProxy) => {
    const root = scrollRef.current;
    if (!root) return;

    const pageWidth = await readPageWidth(doc);
    if (pageWidth === null) return;

    const nextScale = computeFitWidthScale(pageWidth, root.clientWidth);
    setScale((prev) => (Math.abs(prev - nextScale) < 0.01 ? prev : nextScale));
  }, [readPageWidth]);

  const loadDocument = useCallback(async (fetchUrl: string) => {
    setLoading(true);
    setLoadError(false);
    setLoadProgress(null);
    setPdfSourceUrl(null);
    setPdfDoc((prev) => {
      void prev?.cleanup();
      return null;
    });
    setPageCount(0);
    setCurrentPage(1);

    try {
      const prefetchedPromise =
        getPrefetchedSubmissionPdf(fetchUrl) ?? prefetchSubmissionPdf(fetchUrl);

      // If bytes are already (or almost) ready, skip indeterminate progress.
      setLoadProgress(35);

      const [pdfjs, prefetched] = await Promise.all([
        getPdfJsModule(),
        prefetchedPromise,
      ]);

      setPdfSourceUrl(prefetched.signedUrl);
      setLoadProgress(70);

      // Copy buffer so PDF.js can transfer/own its own ArrayBuffer safely.
      const dataCopy = prefetched.data.slice(0);
      const loadingTask = pdfjs.getDocument({
        data: dataCopy,
        disableAutoFetch: true,
        disableStream: true,
      });

      const doc = await loadingTask.promise;

      setPdfDoc(doc);
      setPageCount(doc.numPages);
      setLoadProgress(100);
    } catch {
      // Fallback path if prefetch failed mid-flight: try classic URL stream once.
      try {
        const [pdfjs, response] = await Promise.all([
          getPdfJsModule(),
          appFetch(fetchUrl),
        ]);

        if (!response.ok) throw new Error("Could not resolve submission PDF.");

        const payload = (await response.json()) as { url?: string };
        if (!payload.url) throw new Error("Missing submission PDF URL.");

        setPdfSourceUrl(payload.url);

        const loadingTask = pdfjs.getDocument({
          url: payload.url,
          disableAutoFetch: false,
          disableStream: false,
        });

        loadingTask.onProgress = ({
          loaded,
          total,
        }: {
          loaded: number;
          total: number;
        }) => {
          if (total > 0) {
            setLoadProgress(Math.min(99, Math.round((loaded / total) * 100)));
          }
        };

        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setLoadProgress(100);
      } catch {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void prefetchPdfEngine();
  }, []);

  useEffect(() => {
    if (activeViewUrl !== null) return;
    pageRefs.current.clear();
  }, [activeViewUrl]);

  useEffect(() => {
    if (!activeViewUrl) return;
    const viewUrl = activeViewUrl;
    const frame = window.requestAnimationFrame(() => {
      void loadDocument(viewUrl);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeViewUrl, loadDocument]);

  useEffect(() => {
    if (!open || !pdfDoc || loading || loadError) return;
    if (userZoomedRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      void applyDefaultScale(pdfDoc);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, pdfDoc, loading, loadError, applyDefaultScale]);

  useEffect(() => {
    if (!open || !pdfDoc || loading || loadError) return;

    const root = scrollRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (userZoomedRef.current) return;
      void applyDefaultScale(pdfDoc);
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, [open, pdfDoc, loading, loadError, applyDefaultScale]);

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
    userZoomedRef.current = true;
    setScale((prev) => Math.min(MAX_SCALE, Number((prev + SCALE_STEP).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    userZoomedRef.current = true;
    setScale((prev) => Math.max(MIN_SCALE, Number((prev - SCALE_STEP).toFixed(2))));
  }, []);

  const fitToWidth = useCallback(() => {
    if (!pdfDoc) return;
    // Treat as a manual zoom choice so resize does not reset back to 100%.
    userZoomedRef.current = true;
    void applyFitWidthScale(pdfDoc);
  }, [pdfDoc, applyFitWidthScale]);

  const handleDownload = useCallback(async () => {
    if (!data) return;

    const fileName = data.fileName ?? "assignment-submission.pdf";

    if (pdfSourceUrl) {
      const response = await fetch(pdfSourceUrl);
      if (!response.ok) return;

      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      return;
    }

    if (!pdfDoc) return;
    const bytes = await pdfDoc.getData();
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [data, pdfDoc, pdfSourceUrl]);

  const handleRetry = useCallback(() => {
    if (!data?.viewUrl) return;
    void loadDocument(data.viewUrl);
  }, [data, loadDocument]);

  if (!hydrated) return null;

  const showStudentInfo = Boolean(data?.studentName?.trim());
  const headerTitle = data?.viewerTitle ?? (showStudentInfo ? "Student Assignment" : "Your Submission");
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
            className="relative z-[201] flex h-[100dvh] w-full max-w-[1400px] flex-col overflow-hidden border border-border/60 bg-background shadow-2xl max-md:pb-[env(safe-area-inset-bottom)] md:h-[calc(100dvh-2rem)] md:rounded-xl"
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="sticky top-0 z-10 shrink-0 border-b bg-background/95 pt-[max(0.875rem,env(safe-area-inset-top,0px))] backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-1 sm:gap-4 sm:px-5 sm:pb-3.5 md:px-6 md:pb-4 md:pt-2">
                <div className="min-w-0 flex-1 space-y-2 pr-2">
                  <p id={titleId} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                    {headerTitle}
                  </p>
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-5 md:gap-8">
                    {showStudentInfo ? (
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="truncate">
                          <span className="font-medium text-foreground">Student Name:</span>{" "}
                          <span className="text-muted-foreground">{data.studentName}</span>
                        </p>
                        <p className="truncate">
                          <span className="font-medium text-foreground">Student ID:</span>{" "}
                          <span className="text-muted-foreground">{studentIdLabel}</span>
                        </p>
                      </div>
                    ) : null}
                    <div className="min-w-0 space-y-1 text-xs sm:text-sm">
                      <p className="line-clamp-2 break-words">
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
                            loading={grading.saving}
                            disabled={grading.disabled || !grading.isDirty}
                            onClick={grading.onSave}
                          >
                            {grading.saving ? "Saving..." : "Save Grade"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-start justify-end gap-1.5 pt-0.5 sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 sm:px-3"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Close</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 sm:px-3"
                    onClick={() => handleDownload()}
                    disabled={!pdfDoc || loading || loadError}
                  >
                    <Download className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>

              {!loading && !loadError && pdfDoc && pageCount > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 sm:px-5 md:px-6">
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
                    <span className="min-w-[72px] text-center text-[11px] text-muted-foreground sm:min-w-[88px] sm:text-xs">
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
                    <button
                      type="button"
                      className="min-w-[48px] rounded-md px-1 py-1 text-center text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:min-w-[52px] sm:text-xs"
                      onClick={fitToWidth}
                      aria-label="Fit PDF to screen width"
                      title="Fit to width"
                    >
                      {Math.round(scale * 100)}%
                    </button>
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
                "min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain bg-muted/30 [-webkit-overflow-scrolling:touch]",
                loading || loadError ? "flex items-center justify-center" : "p-2 sm:p-3 md:p-6",
              )}
            >
              {loading ? (
                <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Loading Assignment...</p>
                    <p className="text-sm text-muted-foreground">
                      {loadProgress !== null
                        ? `Preparing document… ${loadProgress}%`
                        : "Please wait while we prepare the document."}
                    </p>
                  </div>
                  {loadProgress !== null ? (
                    <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-200"
                        style={{ width: `${loadProgress}%` }}
                      />
                    </div>
                  ) : null}
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
                <div className="mx-auto flex w-full max-w-full flex-col gap-3 sm:gap-4 md:max-w-5xl md:gap-6">
                  {Array.from({ length: pageCount }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <div
                        key={`${data.enrollmentId}-page-${pageNumber}`}
                        data-page={pageNumber}
                        className="w-full max-w-full"
                        ref={(node) => {
                          if (node) pageRefs.current.set(pageNumber, node);
                          else pageRefs.current.delete(pageNumber);
                        }}
                      >
                        <LazyPdfPage
                          pdf={pdfDoc}
                          pageNumber={pageNumber}
                          scale={scale}
                          scrollRootRef={scrollRef}
                        />
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
