"use client";

import { useEffect, useState, useCallback } from "react";
import { v2NotificationsApi } from "@/lib/api";
import type { V2EditorialNotification } from "@/lib/types";

const EVENT_ICONS: Record<string, string> = {
  "article:submitted": "send",
  "article:assigned": "person_add",
  "article:approved": "check_circle",
  "article:rejected": "cancel",
  "article:revision_requested": "edit_note",
  "article:published": "publish",
  "article:fact_check_complete": "fact_check",
};

export default function EditorialNotificationsPage() {
  const [notifications, setNotifications] = useState<V2EditorialNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v2NotificationsApi.list({ page, limit: 20, unread_only: unreadOnly });
      setNotifications(res.data.items);
      setTotal(res.data.total);
      setUnreadCount(res.data.unread_count);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, unreadOnly]);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    try {
      await v2NotificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  }

  const pages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={unreadOnly} onChange={e => { setUnreadOnly(e.target.checked); setPage(1); }} className="rounded" />
            Unread only
          </label>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="px-2 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse border">
              <div className="h-4 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs border">
          {unreadOnly ? "No unread notifications." : "No notifications yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`rounded-xl p-4 flex items-start gap-3 border ${
                n.is_read ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950" : "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900"
              }`}
            >
              <span className="material-symbols-outlined text-[20px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {EVENT_ICONS[n.event_type] || "notifications"}
              </span>
              <div className="flex-1 min-w-0">
                <p className={n.is_read ? "text-xs text-zinc-500 dark:text-zinc-400" : "text-xs font-semibold text-zinc-900 dark:text-white"}>
                  {n.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{n.message}</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  {n.actor_name && `by ${n.actor_name} · `}{new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white flex-shrink-0 mt-2" />}
            </div>
          ))}

          {pages > 1 && (
            <div className="px-4 py-3 flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded border border-zinc-300 dark:border-zinc-800 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer">Prev</button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="rounded border border-zinc-300 dark:border-zinc-800 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
