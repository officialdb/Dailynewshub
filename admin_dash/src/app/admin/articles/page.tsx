"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { articlesApi, categoriesApi } from "@/lib/api";
import type { Article, Category } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { exportToCSV } from "@/lib/export";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const { toast, confirm } = useToast();

  const fetchArticles = useCallback(async (p: number, q: string, cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await articlesApi.list(p, 10, { search: q, category_id: cat });
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
    categoriesApi.list().then(res => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchArticles(page, search, categoryFilter); }, [page, search, categoryFilter, fetchArticles]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setPage(1);
        setSearch(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    if (selected.size === articles.length) setSelected(new Set());
    else setSelected(new Set(articles.map(a => a.id)));
  }

  async function handleDelete(id: string, title: string) {
    if (!await confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await articlesApi.delete(id);
      setArticles(prev => prev.filter(a => a.id !== id));
      setTotal(t => t - 1);
      toast("Article deleted", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  async function handleTogglePin(article: Article) {
    try {
      const res = await articlesApi.togglePin(article.id);
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_pinned: res.data.is_pinned } : a));
      toast(res.data.is_pinned ? "Article pinned" : "Article unpinned", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Pin toggle failed", "error");
    }
  }

  async function bulkAction(action: "pin" | "unpin" | "feature" | "unfeature") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!await confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${ids.length} articles?`)) return;
    setBulkLoading(true);
    try {
      if (action === "pin" || action === "unpin") {
        await Promise.all(ids.map(id => articlesApi.togglePin(id)));
      } else {
        const featured = action === "feature";
        await Promise.all(ids.map(id => articlesApi.update(id, { is_featured: featured })));
      }
      toast(`${ids.length} articles updated`, "success");
      setSelected(new Set());
      await fetchArticles(page, search, categoryFilter);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Bulk action failed", "error");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="max-w-max-width mx-auto p-4 lg:p-margin w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Articles</h1>
          <p className="font-body-md text-body-md text-secondary">{total} articles total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              exportToCSV("articles", ["Title", "Author", "Source", "Views", "Published At"],
                articles.map(a => [a.title, a.author ?? "", a.source_name ?? "", a.view_count, a.published_at ?? ""]));
            }}
            className="flex items-center gap-2 px-stack-md py-[10px] border border-outline rounded-lg font-label-md text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <Link
            href="/admin/articles/edit"
            className="flex items-center gap-2 px-stack-md py-[10px] bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Article
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined text-[18px] text-outline absolute left-3 top-1/2 -translate-y-1/2">search</span>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 border border-outline-variant rounded-xl bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-label-md font-bold text-primary">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => bulkAction("pin")} disabled={bulkLoading} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50">Pin</button>
            <button onClick={() => bulkAction("unpin")} disabled={bulkLoading} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50">Unpin</button>
            <button onClick={() => bulkAction("feature")} disabled={bulkLoading} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50">Feature</button>
            <button onClick={() => bulkAction("unfeature")} disabled={bulkLoading} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50">Unfeature</button>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                <th className="px-stack-md py-4 w-10">
                  <input type="checkbox" checked={articles.length > 0 && selected.size === articles.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" />
                </th>
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
                    <td className="px-stack-md py-4"><div className="h-4 w-4 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-64 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-12 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : articles.length === 0 ? (
                <tr><td colSpan={6} className="px-stack-md py-12 text-center text-secondary">No articles found. <Link href="/admin/articles/edit" className="text-primary hover:underline">Create one.</Link></td></tr>
              ) : (
                articles.map(article => (
                  <tr key={article.id} className={`transition-colors group ${selected.has(article.id) ? "bg-primary/5" : "hover:bg-surface-container/40"}`}>
                    <td className="px-stack-md py-4">
                      <input type="checkbox" checked={selected.has(article.id)} onChange={() => toggleSelect(article.id)} className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" />
                    </td>
                    <td className="px-stack-md py-4 max-w-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {article.is_pinned && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 uppercase">Pinned</span>}
                        {article.is_trending && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 uppercase">Trending</span>}
                        {article.is_featured && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">Featured</span>}
                      </div>
                      <p className="font-medium text-on-surface text-sm truncate mt-0.5">{article.title}</p>
                      {article.source_name && <p className="text-xs text-secondary truncate">{article.source_name}</p>}
                    </td>
                    <td className="px-stack-md py-4 text-sm text-secondary">{article.author ?? "—"}</td>
                    <td className="px-stack-md py-4 text-sm text-on-surface">{article.view_count.toLocaleString()}</td>
                    <td className="px-stack-md py-4 text-sm text-secondary">
                      {article.published_at ? new Date(article.published_at).toLocaleDateString() : "Draft"}
                    </td>
                    <td className="px-stack-md py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/articles/edit?id=${article.id}`} className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                        <button onClick={() => handleTogglePin(article)} title={article.is_pinned ? "Unpin" : "Pin"} className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-amber-500 transition-colors cursor-pointer">
                          <span className="material-symbols-outlined text-[18px]">{article.is_pinned ? "push_pin" : "keep"}</span>
                        </button>
                        <button onClick={() => handleDelete(article.id, article.title)} className="p-1.5 rounded-lg hover:bg-error-container/20 text-outline hover:text-error transition-colors cursor-pointer">
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
