import { createClient } from "@/lib/supabase/server";
import { getDataPageSize } from "@/lib/low-data/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { TablePagination } from "@/components/shared/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { DollarSign, Clock, CheckCircle2 } from "lucide-react";

export default async function AdminPaymentsPage({
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

  const [{ data: payments, count }, { data: revenueRows }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, amount, status, plan, billing_plan, payment_provider, transaction_reference, paid_at, created_at, profiles(full_name, email)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase.from("payments").select("amount").eq("status", "completed"),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  const all = payments ?? [];
  const revenue = (revenueRows ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const completedCount = revenueRows?.length ?? 0;
  const total = count ?? 0;

  return (
    <DashboardShell
      role="platform_admin"
      title="Revenue & Payments"
      description="Track subscription payments, revenue, and payment history"
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard title="Total revenue" value={`$${revenue.toFixed(2)}`} icon={DollarSign} />
        <StatCard title="Completed" value={completedCount} icon={CheckCircle2} />
        <StatCard title="Pending" value={pendingCount ?? 0} icon={Clock} />
      </div>

      <div className="mb-4">
        <TablePagination basePath="/admin/payments" page={page} pageSize={pageSize} total={total} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lecturer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.map((p) => {
              const profile = p.profiles as unknown as { full_name: string; email: string };
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </TableCell>
                  <TableCell>{(p.billing_plan ?? p.plan).toString().replace("_", " ")}</TableCell>
                  <TableCell className="font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === "completed"
                          ? "accent"
                          : p.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.payment_provider ?? "MONIME"}
                    {p.transaction_reference && (
                      <span className="block truncate text-xs">{p.transaction_reference}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(p.paid_at ?? p.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
            {all.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No payments recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DashboardShell>
  );
}
