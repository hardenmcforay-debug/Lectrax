/**
 * Shared offset pagination for collection APIs and server list loaders.
 * Prefer offset for in-class tables; use cursors later for append-only time series.
 */

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 50,
  /** Admin-style denser tables */
  ADMIN_PAGE_SIZE: 15,
  /** Hard ceiling for any client-supplied pageSize */
  MAX_PAGE_SIZE: 100,
  /** Present-students sync may request up to this (class size safety net) */
  MAX_PRESENT_PAGE_SIZE: 200,
} as const;

export type OffsetPaginationInput = {
  page: number;
  pageSize: number;
};

export type OffsetPaginationMeta = OffsetPaginationInput & {
  total: number;
  totalPages: number;
  hasMore: boolean;
  offset: number;
};

export type OffsetPageResult<T> = {
  items: T[];
  pagination: OffsetPaginationMeta;
};

export function clampPageSize(
  value: number | undefined,
  options?: { defaultSize?: number; maxSize?: number }
): number {
  const defaultSize = options?.defaultSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const maxSize = options?.maxSize ?? PAGINATION.MAX_PAGE_SIZE;
  if (!Number.isFinite(value) || value == null || value < 1) return defaultSize;
  return Math.min(Math.floor(value), maxSize);
}

export function clampPage(value: number | undefined): number {
  if (!Number.isFinite(value) || value == null || value < 1) return PAGINATION.DEFAULT_PAGE;
  return Math.floor(value);
}

export function parseOffsetPagination(
  searchParams: URLSearchParams,
  options?: { defaultSize?: number; maxSize?: number }
): OffsetPaginationInput {
  const page = clampPage(Number(searchParams.get("page") ?? undefined));
  const pageSize = clampPageSize(Number(searchParams.get("pageSize") ?? undefined), options);
  return { page, pageSize };
}

export function paginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function buildOffsetPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): OffsetPaginationMeta {
  const safeTotal = Math.max(0, total);
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / pageSize);
  const offset = paginationOffset(page, pageSize);
  return {
    page,
    pageSize,
    total: safeTotal,
    totalPages,
    hasMore: page * pageSize < safeTotal,
    offset,
  };
}

export function toOffsetPageResult<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number
): OffsetPageResult<T> {
  return {
    items,
    pagination: buildOffsetPaginationMeta(page, pageSize, total),
  };
}

/** Inclusive PostgREST .range() bounds for a page. */
export function toRangeBounds(page: number, pageSize: number): { from: number; to: number } {
  const from = paginationOffset(page, pageSize);
  return { from, to: from + pageSize - 1 };
}
