"use client";

import { useEffect, useState, useCallback } from "react";
import { commentsApi } from "@/lib/api";
import type { Comment } from "@/lib/types";

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await commentsApi.list(p, 10);
      setComments(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComments(page); }, [page, fetchComments]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    try {
      await commentsApi.delete(id);
      setComments(prev => prev.filter(c => c.id !== id));
      setTotal(t => t - 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="max-w-max-width mx-auto p-4 lg:p-margin w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Comments</h1>
          <p className="font-body-md text-body-md text-secondary">{total} comments total · Moderation</p>
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
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Comment</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Article</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">User</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Date</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-stack-md py-4"><div className="h-4 w-64 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-32 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : comments.length === 0 ? (
                <tr><td colSpan={5} className="px-stack-md py-12 text-center text-secondary">No comments found.</td></tr>
              ) : (
                comments.map(c => (
                  <tr key={c.id} className="hover:bg-surface-container/40 transition-colors group">
                    <td className="px-stack-md py-4 max-w-md">
                      <p className="text-sm text-on-surface line-clamp-2">{c.body}</p>
                      {c.parent_id && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-secondary">
                          <span className="material-symbols-outlined text-[12px]">reply</span> Reply
                        </span>
                      )}
                    </td>
                    <td className="px-stack-md py-4 text-sm text-secondary max-w-[200px] truncate">
                      {c.article_title ?? "—"}
                    </td>
                    <td className="px-stack-md py-4">
                      <div className="flex items-center gap-2">
                        {c.user_avatar_url ? (
                          <img src={c.user_avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary-container/20 flex items-center justify-center text-primary text-[11px] font-bold flex-shrink-0">
                            {c.user_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-on-surface">{c.user_name}</span>
                      </div>
                    </td>
                    <td className="px-stack-md py-4 text-sm text-secondary">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-stack-md py-4 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-error-container/20 text-outline hover:text-error transition-colors cursor-pointer"
                        title="Delete comment"
                      >
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
