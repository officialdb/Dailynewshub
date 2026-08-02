"use client";

import { useEffect, useState, useCallback } from "react";
import { notificationsApi, v2ArticlesApi } from "@/lib/api";
import type { Notification, V2Article } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

function SendNotificationModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [articleId, setArticleId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [articles, setArticles] = useState<V2Article[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Fetch recent articles to link
    v2ArticlesApi.list({ limit: 50 }).then(res => setArticles(res.data.items)).catch(console.error);
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    try {
      const payload: any = { title, body };
      if (articleId) payload.article_id = articleId;

      if (scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
        await notificationsApi.schedule(payload);
        toast("Push notification scheduled", "success");
      } else {
        await notificationsApi.send(payload);
        toast("Push notification sent to all devices", "success");
      }
      onSent();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to send notification", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Send Push Notification</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Blast a notification to user devices</p>
        </div>
        <form onSubmit={handleSend} className="flex flex-col">
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Title</label>
              <input
                type="text"
                required
                maxLength={100}
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                placeholder="Breaking News..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Body</label>
              <textarea
                required
                maxLength={255}
                rows={3}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                placeholder="What happened?"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Link to Article (Optional)</label>
              <select
                value={articleId}
                onChange={e => setArticleId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
              >
                <option value="">-- No Article --</option>
                {articles.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Schedule for Later (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Leave blank to send immediately</p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={sending} className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">send</span>
              {sending ? "Sending..." : (scheduledAt ? "Schedule" : "Send Now")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PushNotificationsDashboard() {
  const { toast, confirm } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list(page, 20);
      setNotifications(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
      toast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  async function handleDelete(id: string) {
    if (!await confirm("Delete this notification record?")) return;
    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(t => t - 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Push Notifications</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Manage and blast system-wide push notifications to devices</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">campaign</span>
          Send Blast
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Content</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">Loading...</td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">No push notifications found.</td>
                </tr>
              ) : (
                notifications.map(n => (
                  <tr key={n.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white">{n.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-md truncate">{n.body}</p>
                      {n.article_title && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">🔗 {n.article_title}</p>}
                    </td>
                    <td className="px-4 py-4">
                      {n.is_sent ? (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Sent
                        </span>
                      ) : n.scheduled_at ? (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Scheduled
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {n.sent_at ? new Date(n.sent_at).toLocaleString() : (n.scheduled_at ? `For: ${new Date(n.scheduled_at).toLocaleString()}` : "—")}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer" title="Delete record">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <SendNotificationModal onClose={() => setShowModal(false)} onSent={loadNotifications} />}
    </div>
  );
}
