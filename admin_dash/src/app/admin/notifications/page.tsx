"use client";

import { useEffect, useState, useCallback } from "react";
import { notificationsApi } from "@/lib/api";
import type { Notification } from "@/lib/types";

type Tab = "history" | "send" | "schedule";

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("history");

  return (
    <div className="max-w-max-width mx-auto p-4 lg:p-margin w-full">
      <div className="mb-stack-lg">
        <h1 className="font-display-lg text-display-lg text-on-surface">Notifications</h1>
        <p className="font-body-md text-body-md text-secondary">Send, schedule, and manage push notifications</p>
      </div>

      <div className="flex gap-1 mb-6 bg-surface-container-low rounded-xl p-1 w-fit">
        {([["history", "notifications", "History"], ["send", "send", "Send Now"], ["schedule", "schedule", "Schedule"]] as const).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === key ? "bg-surface-container-lowest text-primary shadow-sm" : "text-secondary hover:text-on-surface"}`}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === "history" && <HistoryTab />}
      {tab === "send" && <SendTab />}
      {tab === "schedule" && <ScheduleTab />}
    </div>
  );
}

function HistoryTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.list(p, 10);
      setNotifications(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(page); }, [page, fetchNotifications]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this notification?")) return;
    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(t => t - 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Title</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Body</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Status</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Date</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-stack-md py-4"><div className="h-4 w-32 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-48 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-16 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : notifications.length === 0 ? (
                <tr><td colSpan={5} className="px-stack-md py-12 text-center text-secondary">No notifications sent yet.</td></tr>
              ) : (
                notifications.map(n => (
                  <tr key={n.id} className="hover:bg-surface-container/40 transition-colors group">
                    <td className="px-stack-md py-4">
                      <p className="font-medium text-on-surface text-sm">{n.title}</p>
                      {n.article_title && <p className="text-xs text-secondary truncate">{n.article_title}</p>}
                    </td>
                    <td className="px-stack-md py-4 text-sm text-secondary max-w-xs truncate">{n.body}</td>
                    <td className="px-stack-md py-4">
                      {n.is_sent ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-50 text-emerald-600">Sent</span>
                      ) : n.scheduled_at ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-50 text-amber-600">Scheduled</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-surface-container-high text-on-surface-variant">Draft</span>
                      )}
                    </td>
                    <td className="px-stack-md py-4 text-sm text-secondary">
                      {n.sent_at
                        ? new Date(n.sent_at).toLocaleString()
                        : n.scheduled_at
                          ? `Scheduled: ${new Date(n.scheduled_at).toLocaleString()}`
                          : new Date(n.created_at).toLocaleString()
                      }
                    </td>
                    <td className="px-stack-md py-4 text-right">
                      <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded-lg hover:bg-error-container/20 text-outline hover:text-error transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-stack-md py-stack-md border-t border-outline-variant flex items-center justify-between bg-surface-container-low/30">
          <p className="text-label-md text-secondary">
            Page <span className="font-bold text-on-surface">{page}</span> of <span className="font-bold text-on-surface">{pages}</span> · {total} total
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-outline hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold cursor-pointer transition-colors ${p === page ? "bg-primary text-on-primary" : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-outline hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SendTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [articleId, setArticleId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const payload: { title: string; body: string; article_id?: string } = { title, body };
      if (articleId.trim()) payload.article_id = articleId.trim();
      const res = await notificationsApi.send(payload);
      setResult({ success: true, message: `Notification sent to ${res.data.sent_count} devices.` });
      setTitle("");
      setBody("");
      setArticleId("");
    } catch (err: unknown) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Send Push Notification</h3>
        {result && (
          <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-error-container/20 border border-error/30 text-error"}`}>
            <span className="material-symbols-outlined text-[18px]">{result.success ? "check_circle" : "error"}</span>
            {result.message}
          </div>
        )}
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">Title</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Notification title" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">Body</label>
            <textarea required value={body} onChange={e => setBody(e.target.value)} rows={3} className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder="Notification message..." />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">Article ID (optional)</label>
            <input type="text" value={articleId} onChange={e => setArticleId(e.target.value)} className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Link to article UUID" />
          </div>
          <button type="submit" disabled={sending} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">send</span>
            {sending ? "Sending..." : "Send to All Users"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ScheduleTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [articleId, setArticleId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const payload: { title: string; body: string; scheduled_at: string; article_id?: string } = {
        title,
        body,
        scheduled_at: new Date(scheduledAt).toISOString(),
      };
      if (articleId.trim()) payload.article_id = articleId.trim();
      const res = await notificationsApi.schedule(payload);
      setResult({ success: true, message: `Notification scheduled for ${new Date(res.data.scheduled_at).toLocaleString()}.` });
      setTitle("");
      setBody("");
      setArticleId("");
      setScheduledAt("");
    } catch (err: unknown) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Schedule failed" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Schedule Push Notification</h3>
        {result && (
          <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-error-container/20 border border-error/30 text-error"}`}>
            <span className="material-symbols-outlined text-[18px]">{result.success ? "check_circle" : "error"}</span>
            {result.message}
          </div>
        )}
        <form onSubmit={handleSchedule} className="space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">Title</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Notification title" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">Body</label>
            <textarea required value={body} onChange={e => setBody(e.target.value)} rows={3} className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder="Notification message..." />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">Schedule Date & Time</label>
            <input type="datetime-local" required value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">Article ID (optional)</label>
            <input type="text" value={articleId} onChange={e => setArticleId(e.target.value)} className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Link to article UUID" />
          </div>
          <button type="submit" disabled={sending} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            {sending ? "Scheduling..." : "Schedule Notification"}
          </button>
        </form>
      </div>
    </div>
  );
}
