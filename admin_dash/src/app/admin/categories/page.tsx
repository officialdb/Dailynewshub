"use client";

import { useEffect, useState, useCallback } from "react";
import { v2CategoriesApi } from "@/lib/api";
import type { V2Category } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

export default function CategoriesPage() {
  const { toast, confirm } = useToast();
  const [categories, setCategories] = useState<V2Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; slug: string; icon: string }>({ name: "", slug: "", icon: "" });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await v2CategoriesApi.list();
      setCategories(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  // v2 categories don't have article_count — treat all as non-empty for now
  const zeroArticleCats: V2Category[] = [];

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  }

  function selectEmpty() {
    setSelected(new Set(zeroArticleCats.filter(c => filtered.some(f => f.id === c.id)).map(c => c.id)));
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", slug: "", icon: "" });
    setShowForm(true);
  }

  function openEdit(cat: V2Category) {
    setEditingId(cat.id);
    setFormData({ name: cat.name, slug: cat.slug, icon: cat.icon ?? "" });
    setShowForm(true);
  }

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { name: formData.name, slug: formData.slug || generateSlug(formData.name), icon: formData.icon || undefined };

      if (editingId) {
        await v2CategoriesApi.update(editingId, payload);
      } else {
        await v2CategoriesApi.create(payload);
      }
      setShowForm(false);
      await fetchCategories();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!await confirm(`Delete category "${name}"? Articles in this category will become uncategorized.`)) return;
    try {
      await v2CategoriesApi.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    const names = ids.map(id => categories.find(c => c.id === id)?.name ?? "unknown");
    if (!await confirm(`Delete ${ids.length} categories?\n\n${names.join(", ")}\n\nArticles in these categories will become uncategorized.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(ids.map(id => v2CategoriesApi.delete(id)));
      setCategories(prev => prev.filter(c => !selected.has(c.id)));
      setSelected(new Set());
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Bulk delete failed", "error");
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Categories</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{categories.length} categories · {zeroArticleCats.length} empty</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Category
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">{editingId ? "Edit Category" : "New Category"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value, slug: d.slug || generateSlug(e.target.value) }))}
                className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                placeholder="e.g. Technology"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData(d => ({ ...d, slug: e.target.value }))}
                className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                placeholder="e.g. technology"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Icon (Material Symbol name)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={e => setFormData(d => ({ ...d, icon: e.target.value }))}
                className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                placeholder="e.g. computer"
              />
            </div>
            <div className="sm:col-span-3 flex items-center gap-3">
              <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer">
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Bulk Actions Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined text-[18px] text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2">search</span>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(new Set()); }}
            placeholder="Search categories..."
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 w-full pl-10 pr-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectEmpty}
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Select empty ({zeroArticleCats.filter(c => filtered.some(f => f.id === c.id)).length})
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              {bulkDeleting ? "Deleting..." : `Delete ${selected.size}`}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Articles</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-4 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  {search ? "No categories match your search." : <>No categories found. <button onClick={openCreate} className="text-zinc-600 dark:text-zinc-400 hover:underline cursor-pointer">Create one.</button></>}
                </td></tr>
              ) : (
                filtered.map(cat => (
                  <tr key={cat.id} className={`transition-colors group ${selected.has(cat.id) ? "bg-zinc-50 dark:bg-zinc-900" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(cat.id)}
                        onChange={() => toggleSelect(cat.id)}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {cat.icon && <span className="material-symbols-outlined text-[20px] text-zinc-700 dark:text-zinc-300">{cat.icon}</span>}
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{cat.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${(cat.article_count ?? 0) > 0 ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"}`}>
                        {cat.article_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{new Date(cat.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer">
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
      </div>
    </div>
  );
}
