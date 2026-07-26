"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { articlesApi, categoriesApi } from "@/lib/api";
import type { ArticleUpdate } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [catsRes, artRes] = await Promise.allSettled([
        categoriesApi.list(),
        articlesApi.get(id),
      ]);

      if (catsRes.status === "fulfilled") {
        setCategories(catsRes.value.data);
      }
      // If categories failed, keep empty array — user can still see/edit other fields

      if (artRes.status === "rejected") {
        throw artRes.reason;
      }

      const art = artRes.value.data;
      setTitle(art.title);
      setDescription(art.description ?? "");
      setContent(art.content ?? "");
      setImageUrl(art.image_url ?? "");
      setSourceName(art.source_name ?? "");
      setSourceUrl(art.source_url ?? "");
      setAuthor(art.author ?? "");
      setCategoryId(art.category_id);
      setIsFeatured(art.is_featured);
      setIsTrending(art.is_trending);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load article details.");
    } finally {
      setLoading(false);
    }
  }, [id]);


  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sourceUrl.trim() || !categoryId) {
      setError("Title, Source URL, and Category are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: ArticleUpdate = {
      title: title.trim(),
      description: description.trim() || undefined,
      content: content.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      source_name: sourceName.trim() || undefined,
      source_url: sourceUrl.trim(),
      author: author.trim() || undefined,
      category_id: categoryId,
      is_featured: isFeatured,
      is_trending: isTrending,
    };
    try {
      await articlesApi.update(id, payload);
      router.push("/articles");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update article.");
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Edit Article</h2>
            <p className="text-slate-700 text-sm font-medium mt-1">Modify details and publish changes immediately.</p>
          </div>
          <Link href="/articles" className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
            ← Back to Articles
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 font-bold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-blue-600">progress_activity</span>
            <p className="text-slate-700 font-semibold mt-2">Loading article...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Article Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter a clear, descriptive title..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Category *</label>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all" required>
                    <option value="">-- Select Category --</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Author</label>
                  <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. Associated Press" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Source Name</label>
                  <input type="text" value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="e.g. Reuters" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Source URL *</label>
                  <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://example.com/article-slug" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Description / Summary</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief summary of this article..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">Full Content</label>
                <textarea rows={10} value={content} onChange={e => setContent(e.target.value)} placeholder="Full article content..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all" />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Featured Image</h4>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Image URL</label>
                  <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 transition-all" />
                </div>
                {imageUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Preview" className="object-cover w-full h-full" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Flags & Promotion</h4>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Featured Article</p>
                    <p className="text-[10px] text-slate-500">Shown in main featured feeds</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={isTrending} onChange={e => setIsTrending(e.target.checked)} className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Trending Story</p>
                    <p className="text-[10px] text-slate-500">Listed under trending sections</p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-medium text-blue-800">Changes publish immediately to all app users.</p>
                <button type="submit" disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">{saving ? "progress_activity" : "save"}</span>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </AuthGuard>
  );
}
