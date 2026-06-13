import { createClient } from "@/lib/supabase/server";
import { getDataPageSize } from "@/lib/low-data/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { TablePagination } from "@/components/shared/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminStudentsPage({
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
  const { data: students, count } = await supabase
    .from("profiles")
    .select("id, full_name, email, college_id, created_at, is_active", { count: "exact" })
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .range(from, to);

  const total = count ?? 0;

  return (
    <DashboardShell
      role="platform_admin"
      title="Students"
      description="Monitor registered students across the platform"
    >
      <div className="mb-6 max-w-xs">
        <StatCard title="Total students" value={total} icon={GraduationCap} />
      </div>

      <div className="mb-4">
        <TablePagination basePath="/admin/students" page={page} pageSize={pageSize} total={total} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>College ID</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(students ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.college_id ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(s.created_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? "accent" : "secondary"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardShell>
  );
}
