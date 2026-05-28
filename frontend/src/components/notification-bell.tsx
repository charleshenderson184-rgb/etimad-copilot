"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  NotificationResponse,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";

const POLL_MS = 30_000;

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const data = await listNotifications({ limit: 20 });
      setItems(data);
    } catch {
      /* swallow */
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  const handleClick = async (n: NotificationResponse) => {
    if (!n.read_at) {
      await markNotificationRead(n.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
        )
      );
    }
    setOpen(false);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 rounded-lg flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-stone-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
              Notifications
            </h4>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-stone-500">
                No notifications yet.
              </li>
            ) : (
              items.map((n) => {
                const content = (
                  <div
                    className={`px-4 py-3 flex gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition ${
                      !n.read_at ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                    }`}
                  >
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${n.read_at ? "ml-5" : ""}`}>
                      <div className="text-sm font-medium text-stone-950 dark:text-stone-50">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-0.5">
                          {n.body}
                        </div>
                      )}
                      <div className="text-xs text-stone-400 mt-1">
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="border-b border-stone-100 dark:border-stone-800/60 last:border-0">
                    {n.link_url ? (
                      <Link href={n.link_url} onClick={() => handleClick(n)}>
                        {content}
                      </Link>
                    ) : (
                      <button onClick={() => handleClick(n)} className="w-full text-left">
                        {content}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
