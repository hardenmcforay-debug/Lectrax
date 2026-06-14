import { createClient } from "@/lib/supabase/server";
import { getDataPageSize } from "@/lib/low-data/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminTableScroll } from "@/components/admin/admin-table-scroll";
import { TablePagination } from "@/components/shared/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { buildSubscriptionDisplay } from "@/lib/subscription";

export default async function AdminLecturersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = await getDataPageSize();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const { data: lecturers, count } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, is_active, subscription_plan, subscription_status, subscription_end_date, grace_period_end_date",
      { count: "exact" }
    )
    .eq("role", "lecturer")
    .order("created_at", { ascending: false })
    .range(from, to);

  const total = count ?? 0;

  return (
    <DashboardShell
      role="platform_admin"
      title="Lecturers"
      description="View lecturer accounts and subscription status"
    >
      <div className="mb-4">
        <TablePagination basePath="/admin/lecturers" page={page} pageSize={pageSize} total={total} />
      </div>

      <AdminTableScroll aria-label="Lecturers table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(lecturers ?? []).map((l) => {
              const display = buildSubscriptionDisplay({
                lecturerId: l.id,
                plan: l.subscription_plan as "free" | "premium",
                status: l.subscription_status as "active" | "grace_period" | "expired",
                subscriptionStartDate: null,
                subscriptionEndDate: l.subscription_end_date,
                gracePeriodEndDate: l.grace_period_end_date,
              });

              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.full_name}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell>
                    <Badge variant={l.is_active ? "accent" : "destructive"}>
                      {l.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{l.subscription_plan}</TableCell>
                  <TableCell>
                    <Badge variant={display.showExpiredBanner ? "destructive" : "secondary"}>
                      {display.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.subscription_end_date ? formatDate(l.subscription_end_date) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </AdminTableScroll>
    </DashboardShell>
  );
}
