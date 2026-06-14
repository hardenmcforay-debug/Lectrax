"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminTableScroll } from "@/components/admin/admin-table-scroll";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminSubscriptionActions } from "@/components/admin/admin-subscription-actions";
import { formatDate } from "@/lib/utils";
import {
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionLifecycleStatus,
} from "@/lib/subscription/constants";

export type AdminSubscriptionLecturer = {
  id: string;
  full_name: string;
  email: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_end_date: string | null;
  grace_period_end_date: string | null;
};

export function AdminSubscriptionsTable({ lecturers }: { lecturers: AdminSubscriptionLecturer[] }) {
  const [emailQuery, setEmailQuery] = useState("");

  const filteredLecturers = useMemo(() => {
    const query = emailQuery.trim().toLowerCase();
    if (!query) return lecturers;
    return lecturers.filter((l) => l.email.toLowerCase().includes(query));
  }, [emailQuery, lecturers]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={emailQuery}
          onChange={(event) => setEmailQuery(event.target.value)}
          placeholder="Search by email"
          className="pl-9"
          aria-label="Search lecturers by email"
        />
      </div>

      {emailQuery.trim() && (
        <p className="text-sm text-muted-foreground">
          {filteredLecturers.length} of {lecturers.length} lecturers
        </p>
      )}

      <AdminTableScroll aria-label="Subscriptions table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lecturer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Grace Ends</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLecturers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {emailQuery.trim()
                    ? "No lecturers match that email."
                    : "No lecturers found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredLecturers.map((l) => {
                const statusLabel =
                  SUBSCRIPTION_STATUS_LABELS[l.subscription_status as SubscriptionLifecycleStatus] ??
                  l.subscription_status;

                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.full_name}</p>
                      <p className="text-xs text-muted-foreground">{l.email}</p>
                    </TableCell>
                    <TableCell className="capitalize">{l.subscription_plan}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          l.subscription_status === "expired"
                            ? "destructive"
                            : l.subscription_status === "grace_period"
                              ? "secondary"
                              : "accent"
                        }
                      >
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {l.subscription_end_date ? formatDate(l.subscription_end_date) : "—"}
                    </TableCell>
                    <TableCell>
                      {l.grace_period_end_date ? formatDate(l.grace_period_end_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <AdminSubscriptionActions
                        lecturerId={l.id}
                        plan={l.subscription_plan}
                        subscriptionStatus={l.subscription_status}
                        subscriptionEndDate={l.subscription_end_date}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </AdminTableScroll>
    </div>
  );
}
