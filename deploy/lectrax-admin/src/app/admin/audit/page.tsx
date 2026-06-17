import { createClient } from "@/lib/supabase/server";
import { getDataPageSize } from "@/lib/low-data/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminTableScroll } from "@/components/admin/admin-table-scroll";
import { TablePagination } from "@/components/shared/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function AdminAuditPage({
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
  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, metadata, created_at, profiles(full_name, email)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  const total = count ?? 0;

  return (
    <DashboardShell
      role="platform_admin"
      title="Audit Logs"
      description="Permanent record of platform activity — attendance sessions, admin actions, and system events"
    >
      <div className="mb-4">
        <TablePagination basePath="/admin/audit" page={page} pageSize={pageSize} total={total} />
      </div>

      <AdminTableScroll aria-label="Audit logs table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(logs ?? []).map((l) => {
              const actor = l.profiles as unknown as { full_name: string; email: string } | null;
              const meta = l.metadata as Record<string, unknown> | null;
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {l.action.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{actor?.full_name ?? "System"}</p>
                    {actor?.email && (
                      <p className="text-xs text-muted-foreground">{actor.email}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{l.entity_type}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {meta ? JSON.stringify(meta) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(l.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
            {(logs ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No audit logs yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminTableScroll>
    </DashboardShell>
  );
}
