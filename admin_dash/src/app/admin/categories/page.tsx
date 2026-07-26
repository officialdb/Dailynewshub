"use client";

import { useEffect, useState, useCallback } from "react";
import { categoriesApi } from "@/lib/api";
import type { Category, CategoryCreate } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; slug: string; icon: string }>({ name: "", slug: "", icon: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await categoriesApi.list();
      setCategories(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", slug: "", icon: "" });
    setShowForm(true);
  }

  function openEdit(cat: Category) {
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
      const payload: CategoryCreate = { name: formData.name, slug: formData.slug || generateSlug(formData.name) };
      if (formData.icon) payload.icon = formData.icon;

      if (editingId) {
        await categoriesApi.update(editingId, payload);
      } else {
        await categoriesApi.create(payload);
      }
      setShowForm(false);
      await fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Articles in this category will become uncategorized.`)) return;
    try {
      await categoriesApi.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="max-w-max-width mx-auto p-4 lg:p-margin w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Categories</h1>
          <p className="font-body-md text-body-md text-secondary">{categories.length} categories</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-stack-md py-[10px] bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Category
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? "Edit Category" : "New Category"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value, slug: d.slug || generateSlug(e.target.value) }))}
                className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="e.g. Technology"
              />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData(d => ({ ...d, slug: e.target.value }))}
                className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="e.g. technology"
              />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Icon (Material Symbol name)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={e => setFormData(d => ({ ...d, icon: e.target.value }))}
                className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="e.g. computer"
              />
            </div>
            <div className="sm:col-span-3 flex items-center gap-3">
              <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-outline rounded-lg font-label-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Category</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Slug</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Articles</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Created</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-stack-md py-4"><div className="h-4 w-32 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-8 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-24 bg-outline-variant rounded"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr><td colSpan={5} className="px-stack-md py-12 text-center text-secondary">No categories found. <button onClick={openCreate} className="text-primary hover:underline cursor-pointer">Create one.</button></td></tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-surface-container/40 transition-colors group">
                    <td className="px-stack-md py-4">
                      <div className="flex items-center gap-2">
                        {cat.icon && <span className="material-symbols-outlined text-[20px] text-primary">{cat.icon}</span>}
                        <span className="font-medium text-on-surface text-sm">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-stack-md py-4 text-sm text-secondary font-mono">{cat.slug}</td>
                    <td className="px-stack-md py-4">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">{cat.article_count}</span>
                    </td>
                    <td className="px-stack-md py-4 text-sm text-secondary">{new Date(cat.created_at).toLocaleDateString()}</td>
                    <td className="px-stack-md py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors cursor-pointer">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 rounded-lg hover:bg-error-container/20 text-outline hover:text-error transition-colors cursor-pointer">
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
