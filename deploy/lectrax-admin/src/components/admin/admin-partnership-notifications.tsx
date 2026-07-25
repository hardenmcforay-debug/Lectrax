"use client";

import { useMemo, useState } from "react";
import { Bell, CheckCheck, CreditCard, MessageSquare } from "lucide-react";
import { appFetch } from "@/lib/api/client-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { PlatformAdminNotification } from "@/types/database";

const PARTNERSHIP_NOTIFICATION_TYPES = [
  "partnership_inquiry",
  "partnership_payment",
] as const;

function notificationIcon(type: string) {
  if (type === "partnership_payment") {
    return CreditCard;
  }
  if (type === "partnership_inquiry") {
    return MessageSquare;
  }
  return Bell;
}

function notificationLabel(type: string) {
  if (type === "partnership_payment") return "Payment";
  if (type === "partnership_inquiry") return "Inquiry";
  return "Notice";
}

export function AdminPartnershipNotifications({
  notifications: initialNotifications,
}: {
  notifications: PlatformAdminNotification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [marking, setMarking] = useState(false);

  const unread = useMemo(
    () => notifications.filter((notification) => !notification.is_read),
    [notifications]
  );

  async function markAllRead() {
    if (marking || unread.length === 0) return;
    setMarking(true);
    try {
      const response = await appFetch("/api/admin/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: [...PARTNERSHIP_NOTIFICATION_TYPES] }),
      });

      if (!response.ok) {
        alert("Could not mark notifications as read. Please try again.");
        return;
      }

      setNotifications((current) =>
        current.map((notification) =>
          PARTNERSHIP_NOTIFICATION_TYPES.includes(
            notification.type as (typeof PARTNERSHIP_NOTIFICATION_TYPES)[number]
          )
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } finally {
      setMarking(false);
    }
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 rounded-xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Partnership notifications</h2>
            <p className="text-xs text-muted-foreground">
              {unread.length > 0
                ? `${unread.length} unread · includes paid university partnerships`
                : "Recent partnership activity"}
            </p>
          </div>
        </div>
        {unread.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void markAllRead()}
            loading={marking}
            disabled={marking}
          >
            {marking ? null : <CheckCheck className="mr-1.5 h-4 w-4" />}
            Mark all read
          </Button>
        ) : null}
      </div>

      <ul className="divide-y">
        {notifications.map((notification) => {
          const Icon = notificationIcon(notification.type);
          const isPayment = notification.type === "partnership_payment";

          return (
            <li
              key={notification.id}
              className={
                notification.is_read
                  ? "px-4 py-3 sm:px-5"
                  : "bg-sky-50/70 px-4 py-3 sm:px-5"
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={
                    isPayment
                      ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                      : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                  }
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{notification.title}</p>
                    <Badge variant={isPayment ? "default" : "outline"}>
                      {notificationLabel(notification.type)}
                    </Badge>
                    {!notification.is_read ? (
                      <Badge variant="accent">Unread</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
