"use client";

import { useState, useEffect } from "react";
import { notificationsApi, articlesApi } from "@/lib/api";
import type { Article } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"instant" | "schedule">("instant");

  // Form inputs
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [articleId, setArticleId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Article selection list
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // Status
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setLoadingArticles(true);
    articlesApi
      .list(1, 20)
      .then(res => setArticles(res.data.items))
      .catch(() => {})
      .finally(() => setLoadingArticles(false));
  }, []);

  const handleSendInstant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    setFeedback(null);

    try {
      const res = await notificationsApi.send({
        title: title.trim(),
        body: body.trim(),
        article_id: articleId.trim() || null,
      });

      setFeedback({
        type: "success",
        message: `Notification dispatched successfully! (Sent to ${res.data.sent_count ?? 0} registered devices)`,
      });

      setTitle("");
      setBody("");
      setArticleId("");
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to dispatch notification.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleScheduleNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !scheduledAt) return;

    setSending(true);
    setFeedback(null);

    try {
      const scheduledIso = new Date(scheduledAt).toISOString();
      await notificationsApi.schedule({
        title: title.trim(),
        body: body.trim(),
        article_id: articleId.trim() || null,
        scheduled_at: scheduledIso,
      });

      setFeedback({
        type: "success",
        message: `Notification scheduled for ${new Date(scheduledAt).toLocaleString()}.`,
      });

      setTitle("");
      setBody("");
      setArticleId("");
      setScheduledAt("");
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to schedule notification.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Push Notifications Hub</h2>
          <p className="text-slate-700 text-sm font-medium mt-1">
            Dispatch instant push notifications to device tokens or schedule breaking news alerts for future delivery.
          </p>

          {/* Mode Switch Tabs */}
          <div className="flex items-center gap-3 mt-6 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab("instant")}
              className={`pb-3 font-bold text-sm transition-all border-b-2 ${
                activeTab === "instant"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Instant Dispatch
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`pb-3 font-bold text-sm transition-all border-b-2 ${
                activeTab === "schedule"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Schedule Notification
            </button>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between border ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-red-50 text-red-900 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                {feedback.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-xs font-bold underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Dispatch / Schedule Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <form onSubmit={activeTab === "instant" ? handleSendInstant : handleScheduleNotification} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Notification Title</label>
              <input
                type="text"
                placeholder="e.g. Breaking News: Global Summit Announced"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Notification Body / Alert Content</label>
              <textarea
                rows={3}
                placeholder="Enter message text that will be shown on mobile lock screens..."
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            {/* Optional Article Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Attach Target Article (Optional)</label>
              <select
                value={articleId}
                onChange={e => setArticleId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- No Article Link (General Notification) --</option>
                {loadingArticles ? (
                  <option disabled>Loading published articles...</option>
                ) : (
                  articles.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.title.slice(0, 60)}...
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Scheduled Date/Time picker for Schedule tab */}
            {activeTab === "schedule" && (
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Delivery Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
            )}

            {/* Device Preview Card */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider">
                <span>Lock Screen Notification Preview</span>
                <span>DailyNewsHub</span>
              </div>
              <p className="font-bold text-sm text-white">{title || "Notification Title Preview"}</p>
              <p className="text-xs text-slate-300 font-medium">{body || "Notification body message will appear here..."}</p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {activeTab === "instant" ? "send" : "alarm_on"}
                </span>
                <span>{sending ? "Processing..." : activeTab === "instant" ? "Dispatch Notification Now" : "Schedule Push Alert"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
