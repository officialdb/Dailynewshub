"use client";

import { useEffect, useState, useCallback } from "react";
import { reelsApi } from "@/lib/api";
import type { Reel } from "@/lib/types";

function formatDuration(seconds: number): string {
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
    if (!confirm(`Delete reel "${title}"? This cannot be undone.`)) return;
    try {
      await reelsApi.delete(id);
      setReels(prev => prev.filter(r => r.id !== id));
      setTotal(t => t - 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="max-w-max-width mx-auto p-4 lg:p-margin w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Reels</h1>
          <p className="font-body-md text-body-md text-secondary">{total} reels total</p>
        </div>
      </div>

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
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Reel</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Channel</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Views</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Likes</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Comments</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Duration</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Published</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-stack-md py-4"><div className="flex gap-3"><div className="h-12 w-20 bg-outline-variant rounded"></div><div className="h-4 w-40 bg-outline-variant rounded mt-2"></div></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-12 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-8 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-8 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-10 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : reels.length === 0 ? (
                <tr><td colSpan={8} className="px-stack-md py-12 text-center text-secondary">No reels found.</td></tr>
              ) : (
                reels.map(reel => (
                  <tr key={reel.id} className="hover:bg-surface-container/40 transition-colors group">
                    <td className="px-stack-md py-4 max-w-sm">
                      <div className="flex items-center gap-3">
                        {reel.thumbnail_url ? (
                          <img src={reel.thumbnail_url} alt="" className="w-20 h-12 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-20 h-12 bg-surface-container-high rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-outline text-[20px]">movie</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-on-surface text-sm truncate">{reel.title}</p>
                          <p className="text-xs text-secondary truncate">{reel.youtube_video_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-stack-md py-4 text-sm text-secondary">{reel.channel_name}</td>
                    <td className="px-stack-md py-4 text-sm text-on-surface">{reel.view_count.toLocaleString()}</td>
                    <td className="px-stack-md py-4 text-sm text-on-surface">{reel.like_count.toLocaleString()}</td>
                    <td className="px-stack-md py-4 text-sm text-on-surface">{reel.comment_count.toLocaleString()}</td>
                    <td className="px-stack-md py-4 text-sm text-secondary">{formatDuration(reel.duration_seconds)}</td>
                    <td className="px-stack-md py-4 text-sm text-secondary">
                      {reel.published_at ? new Date(reel.published_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-stack-md py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`https://youtube.com/watch?v=${reel.youtube_video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors"
                          title="View on YouTube"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                        <button
                          onClick={() => handleDelete(reel.id, reel.title)}
                          className="p-1.5 rounded-lg hover:bg-error-container/20 text-outline hover:text-error transition-colors cursor-pointer"
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
