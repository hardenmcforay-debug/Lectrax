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
  CONTACT_INQUIRY_STATUSES,
  CONTACT_STATUS_LABELS,
} from "@/lib/contact/constants";
import type { ContactInquiry, ContactInquiryStatus } from "@/types/database";
import { formatDate } from "@/lib/utils";

export function AdminContactTable({ inquiries: initialInquiries }: { inquiries: ContactInquiry[] }) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredInquiries = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return inquiries;
    return inquiries.filter(
      (inquiry) =>
        inquiry.email.toLowerCase().includes(search) ||
        inquiry.full_name.toLowerCase().includes(search) ||
        inquiry.subject.toLowerCase().includes(search)
    );
  }, [query, inquiries]);

  async function updateStatus(id: string, status: ContactInquiryStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/contact/${id}`, {
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

  async function deleteInquiry(id: string, fullName: string) {
    if (!confirm(`Delete the contact message from ${fullName}? This cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/contact/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("Could not delete this message. Please try again.");
        return;
      }

      setInquiries((current) => current.filter((inquiry) => inquiry.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, or subject"
          className="pl-9"
          aria-label="Search contact inquiries"
        />
      </div>

      <AdminTableScroll aria-label="Contact messages table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[72px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No contact messages found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInquiries.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{inquiry.full_name}</p>
                      <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">{inquiry.subject}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {inquiry.message}
                  </TableCell>
                  <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex min-w-[160px] flex-col gap-2">
                      <Badge variant={inquiry.status === "new" ? "accent" : "outline"}>
                        {CONTACT_STATUS_LABELS[inquiry.status]}
                      </Badge>
                      {mounted ? (
                        <Select
                          value={inquiry.status}
                          onValueChange={(value) =>
                            updateStatus(inquiry.id, value as ContactInquiryStatus)
                          }
                          disabled={updatingId === inquiry.id}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_INQUIRY_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {CONTACT_STATUS_LABELS[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-9 w-full items-center rounded-md border border-border bg-background px-3 text-sm">
                          {CONTACT_STATUS_LABELS[inquiry.status]}
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
                      onClick={() => deleteInquiry(inquiry.id, inquiry.full_name)}
                      disabled={updatingId === inquiry.id || deletingId === inquiry.id}
                      aria-label={`Delete message from ${inquiry.full_name}`}
                    >
                      {deletingId === inquiry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableScroll>
    </div>
  );
}
