import { redirect } from "next/navigation";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { articlesApi } from "@/lib/api";
import type { Article } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchArticles = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await articlesApi.list(p, 10);
      setArticles(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(page);
  }, [page, fetchArticles]);

  async function handleTogglePin(article: Article) {
    try {
      const res = await articlesApi.pin(article.id);
      const updatedPinState = res.data.is_pinned;
      setArticles(prev => prev.map(a => (a.id === article.id ? { ...a, is_pinned: updatedPinState } : a)));
      setActionMessage(`Article "${article.title.slice(0, 35)}..." was ${updatedPinState ? "Pinned to Top" : "Unpinned"}.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to pin article");
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete article "${title}"? This cannot be undone.`)) return;
    try {
      await articlesApi.delete(id);
      setArticles(prev => prev.filter(a => a.id !== id));
      setTotal(t => t - 1);
      setActionMessage(`Article deleted successfully.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Article Management</h1>
            <p className="text-slate-700 text-sm font-medium mt-1">
              Create, edit, pin breaking news, and remove published articles across all channels.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl border border-blue-200">
              Total: {total} articles
            </span>
            <Link
              href="/articles/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              New Article
            </Link>
          </div>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              {actionMessage}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-bold text-sm">
            Error loading articles: {error}
          </div>
        )}

        {/* Articles Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-4 px-6">Article Details</th>
                  <th className="py-4 px-6">Author</th>
                  <th className="py-4 px-6">Views</th>
                  <th className="py-4 px-6">Status / Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-600 font-semibold">
                      <span className="material-symbols-outlined animate-spin text-3xl text-blue-600 mb-2">progress_activity</span>
                      <p>Loading published articles...</p>
                    </td>
                  </tr>
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-600 font-semibold">
                      No articles found.{" "}
                      <Link href="/articles/new" className="text-blue-600 font-bold underline">
                        Create your first article.
                      </Link>
                    </td>
                  </tr>
                ) : (
                  articles.map(article => (
                    <tr key={article.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title & Tags */}
                      <td className="py-4 px-6 max-w-md">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {article.is_pinned && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black rounded-md flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">push_pin</span>
                                PINNED
                              </span>
                            )}
                            {article.is_featured && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 text-[11px] font-black rounded-md">
                                FEATURED
                              </span>
                            )}
                            {article.is_trending && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 text-[11px] font-black rounded-md">
                                TRENDING
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 leading-snug line-clamp-2">{article.title}</p>
                          {article.source_name && <p className="text-xs font-semibold text-slate-600">{article.source_name}</p>}
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-4 px-6 text-slate-700 font-semibold">{article.author ?? "Editorial Team"}</td>

                      {/* View Count */}
                      <td className="py-4 px-6 font-bold text-slate-900">{article.view_count.toLocaleString()}</td>

                      {/* Date */}
                      <td className="py-4 px-6 text-xs font-semibold text-slate-700">
                        {article.published_at ? new Date(article.published_at).toLocaleDateString() : "Draft"}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Pin / Unpin Button */}
                          <button
                            onClick={() => handleTogglePin(article)}
                            title={article.is_pinned ? "Unpin Article" : "Pin Article to Top"}
                            className={`p-2 rounded-xl border transition-all ${
                              article.is_pinned
                                ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">push_pin</span>
                          </button>

                          {/* Edit button */}
                          <Link
                            href={`/articles/edit/${article.id}`}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-all border border-blue-200"
                            title="Edit Article"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </Link>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(article.id, article.title)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-all border border-red-200"
                            title="Delete Article"
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
                Page {page} of {pages} ({total} articles)
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-40"
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
