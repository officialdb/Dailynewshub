"use client";

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

  useEffect(() => { fetchArticles(page); }, [page, fetchArticles]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await articlesApi.delete(id);
      setArticles(prev => prev.filter(a => a.id !== id));
      setTotal(t => t - 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-max-width mx-auto p-margin w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface">Articles</h1>
            <p className="font-body-md text-body-md text-secondary">{total} articles total</p>
          </div>
          <Link
            href="/articles/new"
            className="flex items-center gap-2 px-stack-md py-[10px] bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Article
          </Link>
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
                  <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Title</th>
                  <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Author</th>
                  <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Views</th>
                  <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Published</th>
                  <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-stack-md py-4"><div className="h-4 w-64 bg-outline-variant rounded"></div></td>
                      <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                      <td className="px-stack-md py-4"><div className="h-4 w-12 bg-outline-variant rounded"></div></td>
                      <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                      <td></td>
                    </tr>
                  ))
                ) : articles.length === 0 ? (
                  <tr><td colSpan={5} className="px-stack-md py-12 text-center text-secondary">No articles found. <Link href="/articles/new" className="text-primary hover:underline">Create one.</Link></td></tr>
                ) : (
                  articles.map(article => (
                    <tr key={article.id} className="hover:bg-surface-container/40 transition-colors group">
                      <td className="px-stack-md py-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          {article.is_trending && <span className="material-symbols-outlined text-[14px] text-amber-500" title="Trending">trending_up</span>}
                          {article.is_featured && <span className="material-symbols-outlined text-[14px] text-primary" title="Featured">star</span>}
                          <p className="font-medium text-on-surface text-sm truncate">{article.title}</p>
                        </div>
                        {article.source_name && <p className="text-xs text-secondary truncate">{article.source_name}</p>}
                      </td>
                      <td className="px-stack-md py-4 text-sm text-secondary">{article.author ?? "—"}</td>
                      <td className="px-stack-md py-4 text-sm text-on-surface">{article.view_count.toLocaleString()}</td>
                      <td className="px-stack-md py-4 text-sm text-secondary">
                        {article.published_at ? new Date(article.published_at).toLocaleDateString() : "Draft"}
                      </td>
                      <td className="px-stack-md py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/articles/edit/${article.id}`}
                            className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </Link>
                          <button
                            onClick={() => handleDelete(article.id, article.title)}
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

          {/* Pagination */}
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
    </AuthGuard>
  );
}
