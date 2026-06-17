"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminTableScroll } from "@/components/admin/admin-table-scroll";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PARTNERSHIP_INQUIRY_STATUSES,
  PARTNERSHIP_PACKAGES,
  PARTNERSHIP_STATUS_LABELS,
} from "@/lib/partnerships/constants";
import type { PartnershipInquiryStatus, UniversityPartnershipInquiry } from "@/types/database";
import { formatDate } from "@/lib/utils";

export function AdminPartnershipsTable({
  inquiries: initialInquiries,
}: {
  inquiries: UniversityPartnershipInquiry[];
}) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [emailQuery, setEmailQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredInquiries = useMemo(() => {
    const query = emailQuery.trim().toLowerCase();
    if (!query) return inquiries;
    return inquiries.filter(
      (inquiry) =>
        inquiry.email.toLowerCase().includes(query) ||
        inquiry.university_name.toLowerCase().includes(query) ||
        inquiry.contact_person.toLowerCase().includes(query)
    );
  }, [emailQuery, inquiries]);

  async function updateStatus(id: string, status: PartnershipInquiryStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/partnerships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) return;

      setInquiries((current) =>
        current.map((inquiry) => (inquiry.id === id ? { ...inquiry, status } : inquiry))
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteInquiry(id: string, universityName: string) {
    if (
      !confirm(
        `Delete the partnership inquiry from ${universityName}? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/partnerships/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("Could not delete this inquiry. Please try again.");
        return;
      }

      setInquiries((current) => current.filter((inquiry) => inquiry.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function statusVariant(status: PartnershipInquiryStatus) {
    switch (status) {
      case "new":
        return "accent" as const;
      case "approved":
        return "default" as const;
      case "closed":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={emailQuery}
          onChange={(event) => setEmailQuery(event.target.value)}
          placeholder="Search by university, contact, or email"
          className="pl-9"
          aria-label="Search partnership inquiries"
        />
      </div>

      <AdminTableScroll aria-label="Partnerships table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>University</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Lecturers</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[72px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No partnership inquiries found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInquiries.map((inquiry) => {
                const packageLabel =
                  PARTNERSHIP_PACKAGES.find((pkg) => pkg.id === inquiry.selected_package)?.name ??
                  inquiry.selected_package;

                return (
                  <TableRow key={inquiry.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inquiry.university_name}</p>
                        <p className="text-xs text-muted-foreground">{inquiry.department_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inquiry.contact_person}</p>
                        <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                        <p className="text-xs text-muted-foreground">{inquiry.phone_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>{packageLabel}</TableCell>
                    <TableCell>{inquiry.expected_lecturers}</TableCell>
                    <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex min-w-[180px] flex-col gap-2">
                        <Badge variant={statusVariant(inquiry.status)}>
                          {PARTNERSHIP_STATUS_LABELS[inquiry.status]}
                        </Badge>
                        {mounted ? (
                          <Select
                            value={inquiry.status}
                            onValueChange={(value) =>
                              updateStatus(inquiry.id, value as PartnershipInquiryStatus)
                            }
                            disabled={updatingId === inquiry.id}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PARTNERSHIP_INQUIRY_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {PARTNERSHIP_STATUS_LABELS[status]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex h-9 w-full items-center rounded-md border border-border bg-background px-3 text-sm">
                            {PARTNERSHIP_STATUS_LABELS[inquiry.status]}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteInquiry(inquiry.id, inquiry.university_name)}
                        disabled={updatingId === inquiry.id || deletingId === inquiry.id}
                        aria-label={`Delete inquiry from ${inquiry.university_name}`}
                      >
                        {deletingId === inquiry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
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
