"use client";

import { appFetch } from "@/lib/api/client-fetch";
import { deferNonCriticalTask } from "@/lib/low-data/defer-non-critical";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isStandaloneMode } from "@/lib/pwa/detect";
import {
  EMPTY_STUDENT_NOTIFICATION_COUNTS,
  NOTIFICATION_DESTINATION,
  type StudentNotificationCounts,
  type StudentNotificationType,
} from "@/lib/student/notifications";

type StudentNotificationsContextValue = {
  counts: StudentNotificationCounts;
  refreshCounts: () => Promise<void>;
};

const StudentNotificationsContext = createContext<StudentNotificationsContextValue | null>(null);

const PATH_TO_NOTIFICATION_TYPE: Record<string, StudentNotificationType> = {
  "/student/assignments": "assignment",
  "/student/academic-overview": "grade",
  "/student/scan": "attendance",
};

function showBrowserNotification(title: string, body: string, type: StudentNotificationType) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  const destination = NOTIFICATION_DESTINATION[type];
  const notification = new Notification(title, {
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: `lectrax-${type}`,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = destination;
    notification.close();
  };
}

async function fetchNotificationCounts(): Promise<StudentNotificationCounts> {
  const response = await appFetch("/api/student/notifications/counts", {
    cache: "no-store",
  });

  if (!response.ok) {
    return EMPTY_STUDENT_NOTIFICATION_COUNTS;
  }

  const payload = (await response.json()) as { counts?: StudentNotificationCounts };
  return payload.counts ?? EMPTY_STUDENT_NOTIFICATION_COUNTS;
}

async function markNotificationTypeRead(type: StudentNotificationType): Promise<void> {
  await appFetch("/api/student/notifications/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
}

export function StudentNotificationsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<StudentNotificationCounts>(EMPTY_STUDENT_NOTIFICATION_COUNTS);
  const permissionRequested = useRef(false);

  const refreshCounts = useCallback(async () => {
    const nextCounts = await fetchNotificationCounts();
    setCounts(nextCounts);
  }, []);

  useEffect(() => {
    deferNonCriticalTask(() => refreshCounts());
  }, [refreshCounts]);

  useEffect(() => {
    if (permissionRequested.current) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (!isStandaloneMode()) return;

    permissionRequested.current = true;
    void Notification.requestPermission();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      channel = supabase
        .channel(`student-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "student_notifications",
            filter: `student_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as {
              type?: StudentNotificationType;
              title?: string;
              message?: string;
            };

            if (row.type) {
              setCounts((current) => ({
                ...current,
                [row.type as StudentNotificationType]: current[row.type as StudentNotificationType] + 1,
              }));
            } else {
              void refreshCounts();
            }

            if (row.title && row.message && row.type) {
              showBrowserNotification(row.title, row.message, row.type);
            }
          }
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [refreshCounts]);

  useEffect(() => {
    const matchedType = Object.entries(PATH_TO_NOTIFICATION_TYPE).find(([href]) =>
      pathname === href || pathname.startsWith(`${href}/`)
    )?.[1];

    if (!matchedType) return;

    void (async () => {
      await markNotificationTypeRead(matchedType);
      setCounts((current) => ({
        ...current,
        [matchedType]: 0,
      }));
    })();
  }, [pathname]);

  const value = useMemo(
    () => ({
      counts,
      refreshCounts,
    }),
    [counts, refreshCounts]
  );

  return (
    <StudentNotificationsContext.Provider value={value}>
      {children}
    </StudentNotificationsContext.Provider>
  );
}

export function useStudentNotifications() {
  const context = useContext(StudentNotificationsContext);
  if (!context) {
    return {
      counts: EMPTY_STUDENT_NOTIFICATION_COUNTS,
      refreshCounts: async () => {},
    };
  }
  return context;
}
