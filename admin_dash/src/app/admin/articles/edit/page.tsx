"use client";

import { useEffect, useState, useCallback, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { articlesApi, categoriesApi } from "@/lib/api";
import type { Category, ArticleCreate } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

interface FormState {
  title: string;
  description: string;
  content: string;
  image_url: string;
  source_name: string;
  source_url: string;
  author: string;
  category_id: string;
  is_featured: boolean;
  is_trending: boolean;
  published_at: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  content: "",
  image_url: "",
  source_name: "",
  source_url: "",
  author: "",
  category_id: "",
  is_featured: false,
  is_trending: false,
  published_at: "",
};

export default function ArticleEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-max-width mx-auto p-4 lg:p-margin w-full">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-outline-variant rounded" />
            <div className="grid grid-cols-12 gap-gutter">
              <div className="col-span-12 lg:col-span-8 space-y-4">
                <div className="h-64 bg-outline-variant rounded-xl" />
                <div className="h-96 bg-outline-variant rounded-xl" />
              </div>
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="h-48 bg-outline-variant rounded-xl" />
                <div className="h-48 bg-outline-variant rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ArticleEditorInner />
    </Suspense>
  );
}

function ArticleEditorInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const articleId = searchParams.get("id");
  const isEditing = Boolean(articleId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const catRes = await categoriesApi.list();
        if (cancelled) return;
        setCategories(catRes.data);

        if (articleId) {
          const artRes = await articlesApi.get(articleId);
          if (cancelled) return;
          const a = artRes.data;
          setForm({
            title: a.title ?? "",
            description: a.description ?? "",
            content: a.content ?? "",
            image_url: a.image_url ?? "",
            source_name: a.source_name ?? "",
            source_url: a.source_url ?? "",
            author: a.author ?? "",
            category_id: a.category_id ?? "",
            is_featured: a.is_featured ?? false,
            is_trending: a.is_trending ?? false,
            published_at: a.published_at ? a.published_at.slice(0, 16) : "",
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          toast(err instanceof Error ? err.message : "Failed to load data", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const handleChange = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) { toast("Title is required", "error"); return; }
    if (!form.source_url.trim()) { toast("Source URL is required", "error"); return; }
    if (!form.category_id) { toast("Please select a category", "error"); return; }

    setSaving(true);
    try {
      const payload: ArticleCreate = {
        title: form.title,
        description: form.description || undefined,
        content: form.content || undefined,
        image_url: form.image_url || undefined,
        source_name: form.source_name || undefined,
        source_url: form.source_url,
        author: form.author || undefined,
        category_id: form.category_id,
        is_featured: form.is_featured,
        is_trending: form.is_trending,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : undefined,
      };

      if (isEditing && articleId) {
        await articlesApi.update(articleId, payload);
        toast("Article updated successfully", "success");
      } else {
        const res = await articlesApi.create(payload);
        toast("Article created successfully", "success");
        router.replace(`/admin/articles/edit?id=${res.data.id}`);
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to save article", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-max-width mx-auto p-4 lg:p-margin w-full">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-outline-variant rounded" />
          <div className="grid grid-cols-12 gap-gutter">
            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="h-64 bg-outline-variant rounded-xl" />
              <div className="h-96 bg-outline-variant rounded-xl" />
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="h-48 bg-outline-variant rounded-xl" />
              <div className="h-48 bg-outline-variant rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all";
  const labelCls = "block text-label-md text-on-surface-variant mb-2";
  const smallLabelCls = "block text-label-sm text-on-surface-variant mb-1.5";
  const cardCls = "bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow";

  return (
    <div className="max-w-max-width mx-auto p-4 lg:p-margin w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-stack-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/articles"
            className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            title="Back to Articles"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              {isEditing ? "Edit Article" : "New Article"}
            </h1>
            <p className="text-body-md text-secondary">
              {isEditing ? "Update article details below" : "Fill in the details to create a new article"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/articles"
            className="px-6 py-2.5 rounded-xl border border-outline text-on-surface font-label-md hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">
              {saving ? "hourglass_empty" : "save"}
            </span>
            {saving ? "Saving..." : "Save Article"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-gutter">
        {/* ── Main Column (8 cols) ───────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-8 space-y-gutter">

          {/* Title & Category Card */}
          <div className={cardCls}>
            <div className="space-y-5">
              <div>
                <label className={labelCls}>
                  Article Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => handleChange("title", e.target.value)}
                  className="w-full text-headline-md font-headline-md border border-outline-variant rounded-xl p-4 focus:border-primary focus:ring-1 focus:ring-primary bg-surface-bright outline-none transition-all"
                  placeholder="Enter article title..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Category <span className="text-error">*</span>
                  </label>
                  <select
                    value={form.category_id}
                    onChange={e => handleChange("category_id", e.target.value)}
                    className={inputCls}
                    required
                  >
                    <option value="">Select a category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Author</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={e => handleChange("author", e.target.value)}
                    className={inputCls}
                    placeholder="Author name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description Card */}
          <div className={cardCls}>
            <label className={labelCls}>Description / Summary</label>
            <textarea
              value={form.description}
              onChange={e => handleChange("description", e.target.value)}
              rows={3}
              className={`${inputCls} resize-y`}
              placeholder="Brief summary for article listings and search engines..."
            />
          </div>

          {/* Content Card */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + " mb-0"}>Content</label>
              {form.content && (
                <span className="text-xs text-secondary">
                  {form.content.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                </span>
              )}
            </div>
            <textarea
              value={form.content}
              onChange={e => handleChange("content", e.target.value)}
              rows={20}
              className={`${inputCls} resize-y font-mono leading-relaxed`}
              placeholder="Write your article content here..."
            />
          </div>
        </div>

        {/* ── Sidebar (4 cols) ──────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 space-y-gutter">

          {/* Source Card */}
          <div className={cardCls}>
            <h3 className="text-label-md font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">link</span>
              Source
            </h3>
            <div className="space-y-4">
              <div>
                <label className={smallLabelCls}>
                  Source URL <span className="text-error">*</span>
                </label>
                <input
                  type="url"
                  value={form.source_url}
                  onChange={e => handleChange("source_url", e.target.value)}
                  className={inputCls}
                  placeholder="https://..."
                  required
                />
              </div>
              <div>
                <label className={smallLabelCls}>Source Name</label>
                <input
                  type="text"
                  value={form.source_name}
                  onChange={e => handleChange("source_name", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. TechCrunch, Reuters"
                />
              </div>
            </div>
          </div>

          {/* Featured Image Card */}
          <div className={cardCls}>
            <h3 className="text-label-md font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">image</span>
              Featured Image
            </h3>
            <div className="space-y-3">
              <input
                type="url"
                value={form.image_url}
                onChange={e => handleChange("image_url", e.target.value)}
                className={inputCls}
                placeholder="https://example.com/image.jpg"
              />
              {form.image_url && (
                <div className="relative aspect-video bg-surface-container rounded-xl overflow-hidden border border-outline-variant">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <p className="text-[11px] text-secondary text-center">Recommended: 1200×630px (PNG or JPG)</p>
            </div>
          </div>

          {/* Status & Flags Card */}
          <div className={cardCls}>
            <h3 className="text-label-md font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
              Status & Flags
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">star</span>
                  <span className="text-body-md text-on-surface">Featured</span>
                </div>
                <Toggle checked={form.is_featured} onChange={v => handleChange("is_featured", v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">trending_up</span>
                  <span className="text-body-md text-on-surface">Trending</span>
                </div>
                <Toggle checked={form.is_trending} onChange={v => handleChange("is_trending", v)} />
              </div>

              <div className="pt-4 border-t border-outline-variant">
                <label className={smallLabelCls + " flex items-center gap-1.5"}>
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={e => handleChange("published_at", e.target.value)}
                  className={inputCls}
                />
                <p className="text-[11px] text-secondary mt-1.5">Leave empty to keep as draft</p>
              </div>
            </div>
          </div>

          {/* Mobile Save Button */}
          <div className="sm:hidden">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[18px]">
                {saving ? "hourglass_empty" : "save"}
              </span>
              {saving ? "Saving..." : "Save Article"}
            </button>
          </div>

          {/* Back link (mobile) */}
          <Link
            href="/admin/articles"
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-outline text-on-surface font-label-md hover:bg-surface-container-high transition-colors sm:hidden"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Articles
          </Link>
        </div>
      </form>
    </div>
  );
}

// ── Toggle switch component ──────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer ${
        checked ? "bg-primary-container" : "bg-outline-variant"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
