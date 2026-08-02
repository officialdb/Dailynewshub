"use client";

import { useEffect, useState, useCallback } from "react";
import { v2ArticlesApi, v2WorkflowApi, v2CategoriesApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { V2Article, V2Category, V2Revision } from "@/lib/types";
import ArticleForm from "@/components/ArticleForm";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-indigo-100 text-indigo-700",
  fact_checking: "bg-amber-100 text-amber-700",
  validation: "bg-purple-100 text-purple-700",
  editorial_review: "bg-violet-100 text-violet-700",
  approved: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  published: "bg-green-100 text-green-800",
  archived: "bg-stone-100 text-stone-600",
  rejected: "bg-red-100 text-red-700",
  revision_requested: "bg-orange-100 text-orange-700",
};

const STATUS_OPTIONS = [
  "", "draft", "submitted", "under_review", "fact_checking", "validation",
  "editorial_review", "approved", "scheduled", "published", "archived", "rejected", "revision_requested",
];

export default function EditorialArticlesPage() {
  const { v2User } = useAuth();
  const [articles, setArticles] = useState<V2Article[]>([]);
  const [categories, setCategories] = useState<V2Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<V2Article | null>(null);
  const [availableTransitions, setAvailableTransitions] = useState<string[]>([]);
  const [history, setHistory] = useState<V2Revision[]>([]);
  const [transitionComment, setTransitionComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Article form state
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<V2Article | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v2ArticlesApi.list({ page, limit: 15, status: statusFilter || undefined, search: search || undefined });
      setArticles(res.data.items);
      setTotal(res.data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  useEffect(() => {
    v2CategoriesApi.list().then(res => setCategories(res.data)).catch(console.error);
  }, []);

  async function selectArticle(article: V2Article) {
    setSelectedArticle(article);
    setHistory([]);
    setTransitionComment("");
    try {
      const [transRes, histRes] = await Promise.all([
        v2WorkflowApi.availableTransitions(article.id),
        v2WorkflowApi.history(article.id),
      ]);
      setAvailableTransitions(transRes.data.available);
      setHistory(histRes.data);
    } catch (e) { console.error(e); }
  }

  async function doTransition(toStatus: string) {
    if (!selectedArticle) return;
    setActionLoading(true);
    try {
      await v2WorkflowApi.transition(selectedArticle.id, toStatus, transitionComment || undefined);
      await loadArticles();
      await selectArticle({ ...selectedArticle, status: toStatus });
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  }

  function openNewArticle() {
    setEditingArticle(null);
    setShowForm(true);
  }

  function openEditArticle(article: V2Article) {
    setEditingArticle(article);
    setShowForm(true);
  }

  async function handleFormSubmit(data: any, tagIds: string[]) {
    setFormSubmitting(true);
    try {
      let articleId = editingArticle?.id;
      if (articleId) {
        await v2ArticlesApi.update(articleId, data);
      } else {
        const res = await v2ArticlesApi.create(data);
        articleId = res.data.id;
      }
      
      // Save tags
      if (articleId) {
        await v2ArticlesApi.setTags(articleId, tagIds);
      }

      setShowForm(false);
      setEditingArticle(null);
      await loadArticles();
    } catch (e: any) {
      alert("Failed to save article: " + (e.message ?? "Unknown error"));
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteArticle(article: V2Article) {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    try {
      await v2ArticlesApi.delete(article.id);
      setSelectedArticle(null);
      await loadArticles();
    } catch (e: any) {
      alert("Failed to delete: " + (e.message ?? "Unknown error"));
    }
  }

  // Check if the current user owns this article (for delete/edit)
  function isOwnArticle(article: V2Article) {
    return article.reporter_id === v2User?.id;
  }

  // Deletable = own + draft or revision_requested
  function canDelete(article: V2Article) {
    return isOwnArticle(article) && (article.status === "draft" || article.status === "revision_requested");
  }

  const pages = Math.ceil(total / 15);

  // --- Truly Full-screen Article Editor (covers sidebar + topnav) ---
  if (showForm) {
    return (
      <div className="fixed inset-0 z-[200] bg-surface flex flex-col">
        <ArticleForm
          initialData={editingArticle}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingArticle(null); }}
          submitting={formSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-md font-headline-md text-on-surface">Editorial Articles</h1>
        <button
          onClick={openNewArticle}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
        >
          <span className="material-symbols-outlined text-[20px]">edit_note</span>
          New Article
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Article List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 animate-pulse">
                  <div className="h-4 w-3/4 bg-outline-variant rounded mb-2" />
                  <div className="h-3 w-1/2 bg-outline-variant rounded" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 block">article</span>
              <p className="text-on-surface font-medium mb-1">No articles yet</p>
              <p className="text-secondary text-sm mb-6">Get started by writing your first article.</p>
              <button
                onClick={openNewArticle}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                Write Article
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {articles.map(article => (
                <button
                  key={article.id}
                  onClick={() => selectArticle(article)}
                  className={`w-full text-left bg-surface-container-lowest border rounded-xl p-4 transition-all cursor-pointer hover:border-primary/40 ${
                    selectedArticle?.id === article.id ? "border-primary ring-1 ring-primary/20" : "border-outline-variant"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-on-surface text-sm truncate">{article.title}</p>
                      <p className="text-xs text-secondary mt-0.5">
                        {article.reporter?.name ?? "Unknown"} · {article.category?.name ?? "—"} · {new Date(article.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[article.status] || "bg-gray-100 text-gray-700"}`}>
                      {article.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </button>
              ))}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-secondary">{total} articles</p>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded text-sm border border-outline-variant disabled:opacity-40">Prev</button>
                    <span className="px-3 py-1 text-sm text-secondary">{page}/{pages}</span>
                    <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1 rounded text-sm border border-outline-variant disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedArticle ? (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-4 sticky top-4">
              <div>
                <h3 className="font-semibold text-on-surface text-sm">{selectedArticle.title}</h3>
                <p className="text-xs text-secondary mt-1">
                  by {selectedArticle.reporter?.name ?? "Unknown"} · {selectedArticle.category?.name ?? "—"}
                </p>
              </div>

              {/* Edit / Delete actions */}
              {(selectedArticle.status === "draft" || selectedArticle.status === "revision_requested") && isOwnArticle(selectedArticle) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditArticle(selectedArticle)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit
                  </button>
                  {canDelete(selectedArticle) && (
                    <button
                      onClick={() => handleDeleteArticle(selectedArticle)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete article"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Delete
                    </button>
                  )}
                </div>
              )}


              {/* Transitions */}
              {availableTransitions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-secondary mb-2">Available actions</p>
                  <div className="flex flex-wrap gap-2">
                    {availableTransitions.map(t => (
                      <button
                        key={t}
                        onClick={() => doTransition(t)}
                        disabled={actionLoading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 ${
                          t === "rejected" || t === "revision_requested"
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : t === "published" || t === "approved"
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {t.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Comment (optional)..."
                    value={transitionComment}
                    onChange={e => setTransitionComment(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              {/* History */}
              <div>
                <p className="text-xs font-medium text-secondary mb-2">History</p>
                {history.length === 0 ? (
                  <p className="text-xs text-secondary">No transitions yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {history.map(rev => (
                      <div key={rev.id} className="text-xs border-l-2 border-outline-variant pl-3 py-1">
                        <p className="font-medium text-on-surface">
                          {rev.from_status.replace(/_/g, " ")} → {rev.to_status.replace(/_/g, " ")}
                        </p>
                        {rev.comments && <p className="text-secondary mt-0.5">{rev.comments}</p>}
                        <p className="text-secondary/60 mt-0.5">{new Date(rev.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-secondary text-sm">
              Select an article to view details and workflow actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
