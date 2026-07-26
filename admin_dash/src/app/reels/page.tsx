"use client";

import { useEffect, useState, useCallback } from "react";
import { reelsApi } from "@/lib/api";
import type { Reel } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchReels = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reelsApi.list(p, 10);
      setReels(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reels.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReels(page); }, [page, fetchReels]);

  const handleDelete = async (reel: Reel) => {
    if (!confirm(`Delete reel "${reel.title.slice(0, 50)}..."? This cannot be undone.`)) return;
    try {
      await reelsApi.delete(reel.id);
      setReels(prev => prev.filter(r => r.id !== reel.id));
      setTotal(t => t - 1);
      setActionMessage(`Reel "${reel.title.slice(0, 40)}..." deleted.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Reels Management</h2>
            <p className="text-slate-700 text-sm font-medium mt-1">
              View and moderate all short-form video reels sourced from YouTube news channels.
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-purple-50 text-purple-800 text-xs font-bold rounded-xl border border-purple-200">
            Total: {total} reels
          </span>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              {actionMessage}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline">Dismiss</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-bold text-sm">{error}</div>
        )}

        {/* Reels Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-4 px-4">Thumbnail</th>
                  <th className="py-4 px-4">Title & Channel</th>
                  <th className="py-4 px-4">Duration</th>
                  <th className="py-4 px-4">Views</th>
                  <th className="py-4 px-4">Likes</th>
                  <th className="py-4 px-4">Comments</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-600 font-semibold">
                      <span className="material-symbols-outlined animate-spin text-3xl text-purple-600 mb-2">progress_activity</span>
                      <p>Loading reels...</p>
                    </td>
                  </tr>
                ) : reels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-semibold">
                      No reels found in the database.
                    </td>
                  </tr>
                ) : (
                  reels.map(reel => (
                    <tr key={reel.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-20 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                          {reel.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={reel.thumbnail_url} alt={reel.title} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-400 text-[20px]">play_circle</span>
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Title & Channel */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 line-clamp-2 leading-snug">{reel.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="material-symbols-outlined text-[14px] text-slate-500">smart_display</span>
                          <p className="text-xs font-semibold text-slate-600">{reel.channel_name}</p>
                        </div>
                        <a
                          href={`https://www.youtube.com/watch?v=${reel.youtube_video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 font-bold hover:underline"
                        >
                          {reel.youtube_video_id} ↗
                        </a>
                      </td>
                      {/* Duration */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-black rounded-lg border border-slate-200">
                          {formatDuration(reel.duration_seconds)}
                        </span>
                      </td>
                      {/* Views */}
                      <td className="py-3 px-4 font-bold text-slate-900">{reel.view_count.toLocaleString()}</td>
                      {/* Likes */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-rose-600 font-bold">
                          <span className="material-symbols-outlined text-[14px]">favorite</span>
                          {reel.like_count.toLocaleString()}
                        </span>
                      </td>
                      {/* Comments */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-slate-600 font-bold">
                          <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                          {reel.comment_count.toLocaleString()}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`https://www.youtube.com/watch?v=${reel.youtube_video_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all border border-slate-200"
                            title="Open on YouTube"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </a>
                          <button
                            onClick={() => handleDelete(reel)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-all border border-red-200"
                            title="Delete Reel"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-700">
                Page {page} of {pages} ({total} reels)
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-40 hover:bg-slate-100 transition-all"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-40 hover:bg-slate-100 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
