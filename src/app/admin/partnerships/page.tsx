import { createServiceClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { AdminPartnershipsTable } from "@/components/admin/admin-partnerships-table";
import { Building2, Bell, CheckCircle2, MessageSquare } from "lucide-react";
import type { UniversityPartnershipInquiry } from "@/types/database";

export default async function AdminPartnershipsPage() {
  const service = await createServiceClient();

  const [{ data: inquiries, error: inquiriesError }, { count: unreadNotifications }] =
    await Promise.all([
      service
        .from("university_partnership_inquiries")
        .select("*")
        .order("created_at", { ascending: false }),
      service
        .from("platform_admin_notifications")
        .select("id", { count: "exact", head: true })
        .eq("type", "partnership_inquiry")
        .eq("is_read", false),
    ]);

  if (inquiriesError) {
    console.error("Failed to load partnership inquiries:", inquiriesError);
  }

  const all = (inquiries ?? []) as UniversityPartnershipInquiry[];
  const newInquiries = all.filter((inquiry) => inquiry.status === "new");
  const inDiscussion = all.filter(
    (inquiry) => inquiry.status === "in_discussion" || inquiry.status === "contacted"
  );
  const approved = all.filter((inquiry) => inquiry.status === "approved");

  return (
    <DashboardShell
      role="platform_admin"
      title="University Partnerships"
      description="Review departmental subscription inquiries and manage partnership onboarding"
    >
      {inquiriesError ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Partnership inquiries could not be loaded. Ensure database migration{" "}
          <code className="rounded bg-amber-100 px-1">032_university_partnership_inquiries.sql</code>{" "}
          has been applied to your Supabase project.
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard title="Total Inquiries" value={all.length} icon={Building2} />
        <StatCard title="New" value={newInquiries.length} icon={Bell} />
        <StatCard title="In Progress" value={inDiscussion.length} icon={MessageSquare} />
        <StatCard
          title="Approved"
          value={approved.length}
          subtitle={
            unreadNotifications ? `${unreadNotifications} unread notifications` : undefined
          }
          icon={CheckCircle2}
        />
      </div>

      <AdminPartnershipsTable inquiries={all} />
    </DashboardShell>
  );
}
