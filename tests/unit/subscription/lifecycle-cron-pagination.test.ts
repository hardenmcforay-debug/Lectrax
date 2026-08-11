import { describe, expect, it, vi } from "vitest";
import { SUBSCRIPTION_CRON_PAGE_SIZE } from "@/lib/subscription/constants";
import { refreshAllPremiumSubscriptionLifecycles } from "@/lib/subscription/lifecycle";

function buildPagedService(pages: Array<Array<{ id: string; subscription_status: string }>>) {
  let pageIndex = 0;
  const gtCalls: Array<string | null> = [];

  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gt: vi.fn((column: string, value: string) => {
      expect(column).toBe("id");
      gtCalls.push(value);
      return query;
    }),
    then: undefined as undefined,
  };

  // Make the builder thenable so `await query` resolves like Supabase.
  Object.assign(query, {
    then(
      resolve: (value: { data: unknown; error: null }) => unknown,
      reject?: (reason: unknown) => unknown
    ) {
      try {
        const data = pages[pageIndex] ?? [];
        pageIndex += 1;
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      } catch (error) {
        return Promise.reject(error).then(resolve, reject);
      }
    },
  });

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const single = vi.fn();

  const service = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          ...query,
          select: vi.fn((columns: string) => {
            if (columns.includes("subscription_start_date")) {
              // getLecturerSubscription path inside refreshSubscriptionLifecycle
              return {
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "lecturer-1",
                    subscription_plan: "premium",
                    subscription_status: "active",
                    subscription_start_date: "2026-01-01T00:00:00.000Z",
                    subscription_end_date: "2099-01-01T00:00:00.000Z",
                    grace_period_end_date: null,
                  },
                  error: null,
                }),
              };
            }
            return query;
          }),
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single };
    }),
  };

  return { service, gtCalls, getPageIndex: () => pageIndex };
}

describe("subscription lifecycle cron pagination", () => {
  it("exposes a bounded cron page size", () => {
    expect(SUBSCRIPTION_CRON_PAGE_SIZE).toBe(100);
  });

  it("walks premium lecturers with keyset pages and no unbounded load", async () => {
    const firstPage = Array.from({ length: SUBSCRIPTION_CRON_PAGE_SIZE }, (_, i) => ({
      id: `id-${String(i).padStart(3, "0")}`,
      subscription_status: "active",
    }));
    const secondPage = [
      { id: "id-100", subscription_status: "active" },
      { id: "id-101", subscription_status: "grace_period" },
    ];

    const { service, gtCalls } = buildPagedService([firstPage, secondPage]);

    const result = await refreshAllPremiumSubscriptionLifecycles(
      service as never
    );

    expect(result.pagesProcessed).toBe(2);
    expect(result.processedLecturers).toBe(SUBSCRIPTION_CRON_PAGE_SIZE + 2);
    expect(result.lifecycleFailures).toBe(0);
    expect(gtCalls).toEqual([firstPage[firstPage.length - 1]!.id]);
  });
});
