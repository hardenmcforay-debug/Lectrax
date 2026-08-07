import { describe, expect, it } from "vitest";
import {
  PAGINATION,
  buildOffsetPaginationMeta,
  clampPage,
  clampPageSize,
  parseOffsetPagination,
  toRangeBounds,
} from "@/lib/pagination";

describe("pagination helpers", () => {
  it("clamps page to a positive integer", () => {
    expect(clampPage(undefined)).toBe(PAGINATION.DEFAULT_PAGE);
    expect(clampPage(0)).toBe(PAGINATION.DEFAULT_PAGE);
    expect(clampPage(-3)).toBe(PAGINATION.DEFAULT_PAGE);
    expect(clampPage(2.9)).toBe(2);
    expect(clampPage(4)).toBe(4);
  });

  it("clamps pageSize with default and max ceilings", () => {
    expect(clampPageSize(undefined)).toBe(PAGINATION.DEFAULT_PAGE_SIZE);
    expect(clampPageSize(0)).toBe(PAGINATION.DEFAULT_PAGE_SIZE);
    expect(clampPageSize(999)).toBe(PAGINATION.MAX_PAGE_SIZE);
    expect(clampPageSize(75)).toBe(75);
    expect(
      clampPageSize(500, {
        defaultSize: 100,
        maxSize: PAGINATION.MAX_PRESENT_PAGE_SIZE,
      })
    ).toBe(PAGINATION.MAX_PRESENT_PAGE_SIZE);
    expect(
      clampPageSize(undefined, {
        defaultSize: 100,
        maxSize: PAGINATION.MAX_PRESENT_PAGE_SIZE,
      })
    ).toBe(100);
  });

  it("parses offset pagination from URL search params", () => {
    const parsed = parseOffsetPagination(
      new URLSearchParams("page=3&pageSize=80")
    );
    expect(parsed).toEqual({ page: 3, pageSize: 80 });

    const present = parseOffsetPagination(new URLSearchParams("pageSize=500"), {
      defaultSize: 100,
      maxSize: PAGINATION.MAX_PRESENT_PAGE_SIZE,
    });
    expect(present).toEqual({ page: 1, pageSize: PAGINATION.MAX_PRESENT_PAGE_SIZE });
  });

  it("builds inclusive range bounds and pagination meta", () => {
    expect(toRangeBounds(1, 50)).toEqual({ from: 0, to: 49 });
    expect(toRangeBounds(2, 50)).toEqual({ from: 50, to: 99 });

    const meta = buildOffsetPaginationMeta(2, 50, 120);
    expect(meta).toMatchObject({
      page: 2,
      pageSize: 50,
      total: 120,
      totalPages: 3,
      hasMore: true,
      offset: 50,
    });
    expect(buildOffsetPaginationMeta(3, 50, 120).hasMore).toBe(false);
  });
});
