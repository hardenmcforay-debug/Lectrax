import { appFetch } from "@/lib/api/client-fetch";
import { PAGINATION, type OffsetPaginationMeta } from "@/lib/pagination";
import type { AttendancePresentStudent } from "@/lib/lecturer/attendance-sessions";

/**
 * Fetch all present students for a session by paging until hasMore is false.
 * Uses pageSize=200 (MAX_PRESENT_PAGE_SIZE) so marking UI stays complete.
 */
export async function fetchAllPresentStudents(
  classSessionId: string,
  attendanceSessionId: string
): Promise<AttendancePresentStudent[] | null> {
  const pageSize = PAGINATION.MAX_PRESENT_PAGE_SIZE;
  let page = 1;
  const all: AttendancePresentStudent[] = [];

  for (;;) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    const res = await appFetch(
      `/api/lecturer/sessions/${classSessionId}/attendance-sessions/${attendanceSessionId}/present?${params}`
    );
    const data = (await res.json()) as {
      students?: AttendancePresentStudent[];
      pagination?: Pick<OffsetPaginationMeta, "hasMore">;
      error?: string;
    };

    if (!res.ok || !data.students) {
      return page === 1 ? null : all;
    }

    all.push(...data.students);
    if (!data.pagination?.hasMore) break;
    page += 1;
  }

  return all;
}
