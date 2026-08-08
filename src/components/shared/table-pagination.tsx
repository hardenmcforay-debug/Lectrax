import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TablePagination({
  basePath,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
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

  const prevHref = page > 1 ? `${basePath}?page=${page - 1}` : null;
  const nextHref = page < totalPages ? `${basePath}?page=${page + 1}` : null;

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
