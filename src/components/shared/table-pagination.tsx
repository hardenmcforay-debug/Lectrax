import Link from "next/link";
import { Button } from "@/components/ui/button";

function buildPageHref(
  basePath: string,
  page: number,
  pageParam: string,
  preserveParams?: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  if (preserveParams) {
    for (const [key, value] of Object.entries(preserveParams)) {
      if (value != null && value !== "" && key !== pageParam) {
        params.set(key, value);
      }
    }
  }
  params.set(pageParam, String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function TablePagination({
  basePath,
  page,
  pageSize,
  total,
  pageParam = "page",
  preserveParams,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  /** Query param name for the page number (default: `page`). */
  pageParam?: string;
  /** Extra query params preserved across page links (e.g. `tab`). */
  preserveParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        Showing {total} {total === 1 ? "record" : "records"}
      </p>
    );
  }

  const prevHref =
    page > 1 ? buildPageHref(basePath, page - 1, pageParam, preserveParams) : null;
  const nextHref =
    page < totalPages ? buildPageHref(basePath, page + 1, pageParam, preserveParams) : null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!prevHref} asChild={!!prevHref}>
          {prevHref ? <Link href={prevHref}>Previous</Link> : <span>Previous</span>}
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={!nextHref} asChild={!!nextHref}>
          {nextHref ? <Link href={nextHref}>Next</Link> : <span>Next</span>}
        </Button>
      </div>
    </div>
  );
}
