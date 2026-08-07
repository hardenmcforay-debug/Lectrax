import { createClient } from "@/lib/supabase/server";
import { getDataPageSize } from "@/lib/low-data/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { TablePagination } from "@/components/shared/table-pagination";
import { AdminContactTable } from "@/components/admin/admin-contact-table";
import { Mail, MessageSquare, CircleCheckBig, Inbox } from "@/components/lucide-icons";
import type { ContactInquiry } from "@/types/database";

export default async function AdminContactPage({
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

  const [
    { data: inquiries, count },
    { count: newCount },
    { count: inProgressCount },
    { count: closedCount },
  ] = await Promise.all([
    supabase
      .from("contact_inquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("contact_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("contact_inquiries")
      .select("id", { count: "exact", head: true })
      .in("status", ["contacted", "resolved"]),
    supabase
      .from("contact_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "closed"),
  ]);

  const pageRows = (inquiries ?? []) as ContactInquiry[];
  const total = count ?? 0;

  return (
    <DashboardShell
      role="platform_admin"
      title="Contact Messages"
      description="Review and respond to general contact inquiries from the public contact page"
    >
      <div className="mb-6 admin-stat-grid admin-stat-grid--cols-4">
        <StatCard title="Total Messages" value={total} icon={Inbox} />
        <StatCard title="New" value={newCount ?? 0} icon={Mail} />
        <StatCard title="In Progress" value={inProgressCount ?? 0} icon={MessageSquare} />
        <StatCard title="Closed" value={closedCount ?? 0} icon={CircleCheckBig} />
      </div>

      <div className="mb-4">
        <TablePagination basePath="/admin/contact" page={page} pageSize={pageSize} total={total} />
      </div>

      <AdminContactTable inquiries={pageRows} />
    </DashboardShell>
  );
}
