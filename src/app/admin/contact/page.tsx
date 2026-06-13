import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { AdminContactTable } from "@/components/admin/admin-contact-table";
import { Mail, MessageSquare, CheckCircle2, Inbox } from "lucide-react";
import type { ContactInquiry } from "@/types/database";

export default async function AdminContactPage() {
  const supabase = await createClient();

  const { data: inquiries } = await supabase
    .from("contact_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  const all = (inquiries ?? []) as ContactInquiry[];
  const newMessages = all.filter((inquiry) => inquiry.status === "new");
  const inProgress = all.filter(
    (inquiry) => inquiry.status === "contacted" || inquiry.status === "resolved"
  );
  const closed = all.filter((inquiry) => inquiry.status === "closed");

  return (
    <DashboardShell
      role="platform_admin"
      title="Contact Messages"
      description="Review and respond to general contact inquiries from the public contact page"
    >
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard title="Total Messages" value={all.length} icon={Inbox} />
        <StatCard title="New" value={newMessages.length} icon={Mail} />
        <StatCard title="In Progress" value={inProgress.length} icon={MessageSquare} />
        <StatCard title="Closed" value={closed.length} icon={CheckCircle2} />
      </div>

      <AdminContactTable inquiries={all} />
    </DashboardShell>
  );
}
