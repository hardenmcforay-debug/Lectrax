"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminTableScroll } from "@/components/admin/admin-table-scroll";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { UniversityPartnershipPayment } from "@/types/database";

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "pending":
      return "accent" as const;
    case "failed":
    case "cancelled":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function AdminPartnershipPaymentsTable({
  payments,
}: {
  payments: UniversityPartnershipPayment[];
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
        No university partnership payments yet.
      </div>
    );
  }

  return (
    <AdminTableScroll aria-label="Partnership payments table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>University</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{payment.university_name}</p>
                  <p className="text-xs text-muted-foreground">{payment.department_name}</p>
                  <p className="text-xs text-muted-foreground">{payment.country}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{payment.contact_person}</p>
                  <p className="text-xs text-muted-foreground">{payment.email}</p>
                  <p className="text-xs text-muted-foreground">{payment.phone_number}</p>
                </div>
              </TableCell>
              <TableCell>{payment.package_name}</TableCell>
              <TableCell>
                ${Number(payment.display_amount_usd).toLocaleString("en-US")}/yr
              </TableCell>
              <TableCell>
                {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminTableScroll>
  );
}
