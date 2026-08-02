"use client";

import { useEffect, useState, useCallback } from "react";
import { reelsApi } from "@/lib/api";
import type { Reel } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getEngagement(reel: Reel): { rate: number; label: string; color: string } {
  if (reel.view_count === 0) return { rate: 0, label: "0.0%", color: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300" };
  const rate = ((reel.like_count + reel.comment_count) / reel.view_count) * 100;
  let color: string;
  if (rate > 5) color = "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300";
  else if (rate >= 2) color = "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300";
  else color = "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300";
  return { rate, label: `${rate.toFixed(1)}%`, color };
}

export default function ReelsPage() {
  const { toast, confirm } = useToast();
  const [reels, setReels] = useState<Reel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReels = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reelsApi.list(p, 10);
      setReels(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReels(page); }, [page, fetchReels]);

  async function handleDelete(id: string, title: string) {
    if (!await confirm(`Delete reel "${title}"? This cannot be undone.`)) return;
    try {
      await reelsApi.delete(id);
      setReels(prev => prev.filter(r => r.id !== id));
      setTotal(t => t - 1);
      toast("Reel deleted", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Reels</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{total} reels total</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Reel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Views</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Likes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Comments</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Engagement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Published</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="flex gap-3"><div className="h-12 w-20 bg-zinc-100 dark:bg-zinc-800 rounded"></div><div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800 rounded mt-2"></div></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-10 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : reels.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">No reels found.</td></tr>
              ) : (
                reels.map(reel => (
                  <tr key={reel.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
                    <td className="px-4 py-3 max-w-sm">
                      <div className="flex items-center gap-3">
                        {reel.thumbnail_url ? (
                          <img src={reel.thumbnail_url} alt="" className="w-20 h-12 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-20 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-zinc-400 dark:text-zinc-500 text-[20px]">movie</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{reel.title}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{reel.youtube_video_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{reel.channel_name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-900 dark:text-white">{reel.view_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-zinc-900 dark:text-white">{reel.like_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-zinc-900 dark:text-white">{reel.comment_count.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const eng = getEngagement(reel);
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${eng.color}`}>
                            {eng.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{formatDuration(reel.duration_seconds)}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {reel.published_at ? new Date(reel.published_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`https://youtube.com/watch?v=${reel.youtube_video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                          title="View on YouTube"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                        <button
                          onClick={() => handleDelete(reel.id, reel.title)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
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

        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/30">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Page <span className="font-bold text-zinc-900 dark:text-white">{page}</span> of <span className="font-bold text-zinc-900 dark:text-white">{pages}</span> · {total} total
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold cursor-pointer transition-colors ${p === page ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950" : "border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
