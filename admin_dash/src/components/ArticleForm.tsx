"use client";

import { useState, useEffect, useRef } from "react";
import RichTextEditor from "./RichTextEditor";
import { v2MediaApi, v2TagsApi } from "@/lib/api";
import { V2Category, V2Tag, V2ArticleCreate, V2ArticleUpdate } from "@/lib/types";

export interface ArticleFormProps {
  initialData?: any;
  categories: V2Category[];
  onSubmit: (data: any, tagIds: string[]) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export default function ArticleForm({
  initialData,
  categories,
  onSubmit,
  onCancel,
  submitting = false,
}: ArticleFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id || (categories.length > 0 ? categories[0].id : ""));
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  const [author, setAuthor] = useState(initialData?.author || "");
  const [sourceName, setSourceName] = useState(initialData?.source_name || "");
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url || "");
  const [isFeatured, setIsFeatured] = useState(initialData?.is_featured || false);
  const [isTrending, setIsTrending] = useState(initialData?.is_trending || false);
  const [location, setLocation] = useState(initialData?.location || "");
  const [locationState, setLocationState] = useState(initialData?.location_state || "");
  const [locationCountry, setLocationCountry] = useState(initialData?.location_country || "");
  
  // --- FIX 3: SEO FIELDS ---
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || "");
  const [metaDescription, setMetaDescription] = useState(initialData?.meta_description || "");
  const [canonicalUrl, setCanonicalUrl] = useState(initialData?.canonical_url || "");
  const [imageAltText, setImageAltText] = useState(initialData?.image_alt_text || "");

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tags
  const [allTags, setAllTags] = useState<V2Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.tags?.map((t: V2Tag) => t.id) ?? []
  );
  const [tagSearch, setTagSearch] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    v2TagsApi.list().then(res => setAllTags(res.data)).catch(console.error);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleTag(id: string) {
    setSelectedTagIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  const filteredTags = allTags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );
  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await v2MediaApi.upload(file);
      setImageUrl(res.data.url);
    } catch (err: any) {
      alert("Upload failed: " + (err.message ?? "Unknown error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      {
        title,
        description,
        content,
        category_id: categoryId,
        image_url: imageUrl,
        author,
        source_name: sourceName,
        source_url: sourceUrl,
        is_featured: isFeatured,
        is_trending: isTrending,
        location: location || undefined,
        location_state: locationState || undefined,
        location_country: locationCountry || undefined,
        // --- FIX 3: SEO FIELDS ---
        slug: slug || undefined,
        seo_title: seoTitle || undefined,
        meta_description: metaDescription || undefined,
        canonical_url: canonicalUrl || undefined,
        image_alt_text: imageAltText || undefined,
      },
      selectedTagIds
    );
  };

  return (
    <div className="bg-surface flex flex-col h-full w-full">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between flex-shrink-0 bg-surface-container-lowest">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
            title="Back"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-lg font-bold text-on-surface leading-tight">
              {initialData ? "Edit Article" : "Write New Article"}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{initialData?.title || "Unsaved article"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg font-medium text-sm text-on-surface border border-outline hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="article-form"
            disabled={submitting || !title || !categoryId}
            className="px-4 py-2 rounded-lg font-medium text-sm text-on-primary bg-primary hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {submitting ? "Saving..." : "Save Article"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form id="article-form" onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Catchy article title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Description / Excerpt</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  placeholder="Short summary of the article..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Category *</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="" disabled>Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Tag Picker */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Tags</label>
                <div className="relative" ref={tagDropdownRef}>
                  {/* Trigger / selected chips display */}
                  <div
                    className="min-h-[42px] w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm cursor-pointer focus-within:ring-2 focus-within:ring-primary/40 flex flex-wrap gap-1.5 items-center"
                    onClick={() => setTagDropdownOpen(v => !v)}
                  >
                    {selectedTags.length === 0 && (
                      <span className="text-on-surface-variant/60 text-sm select-none">Add tags...</span>
                    )}
                    {selectedTags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleTag(tag.id); }}
                          className="ml-0.5 hover:text-primary/60"
                        >
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </span>
                    ))}
                    <span className="ml-auto">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                        {tagDropdownOpen ? "expand_less" : "expand_more"}
                      </span>
                    </span>
                  </div>

                  {/* Dropdown */}
                  {tagDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-30 overflow-hidden">
                      <div className="p-2 border-b border-outline-variant">
                        <input
                          type="text"
                          placeholder="Search tags..."
                          value={tagSearch}
                          onChange={e => setTagSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredTags.length === 0 ? (
                          <p className="text-xs text-secondary text-center py-4">No tags found</p>
                        ) : (
                          filteredTags.map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedTagIds.includes(tag.id)
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-on-surface hover:bg-surface-container-high"
                              }`}
                            >
                              <span className={`material-symbols-outlined text-[16px] ${selectedTagIds.includes(tag.id) ? "text-primary" : "text-on-surface-variant"}`}>
                                {selectedTagIds.includes(tag.id) ? "check_box" : "check_box_outline_blank"}
                              </span>
                              <span className="material-symbols-outlined text-[14px] text-secondary">sell</span>
                              {tag.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Author Name</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Leave blank to use your name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Source Name</label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="e.g. Reuters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Source URL</label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Cover Image</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                    placeholder="Paste URL or click Upload →"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface text-sm font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {uploading
                      ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      : <span className="material-symbols-outlined text-[16px]">upload</span>}
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                {imageUrl && (
                  <div className="mt-2 relative w-full h-28 rounded-lg overflow-hidden border border-outline-variant bg-surface-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Location of News Event */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[16px] text-zinc-500 dark:text-zinc-400">location_on</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Location of News Event</p>
                </div>
                <div className="space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">City / Place</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors"
                      placeholder="e.g. Lagos, Abuja, London"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">State / Region</label>
                      <input
                        type="text"
                        value={locationState}
                        onChange={(e) => setLocationState(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors"
                        placeholder="e.g. Lagos State"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Country</label>
                      <input
                        type="text"
                        value={locationCountry}
                        onChange={(e) => setLocationCountry(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors"
                        placeholder="e.g. Nigeria"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {initialData && (
                <div className="flex gap-4 pt-4 mt-4 border-t border-outline-variant">
                  <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded border-outline-variant text-primary focus:ring-primary"
                    />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTrending}
                      onChange={(e) => setIsTrending(e.target.checked)}
                      className="rounded border-outline-variant text-primary focus:ring-primary"
                    />
                    Trending
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* --- FIX 3: SEO & METADATA SECTION --- */}
          <div className="pt-2 border-t border-outline-variant mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[16px] text-zinc-500 dark:text-zinc-400">search</span>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">SEO & URL Metadata</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Custom Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="leave-blank-to-auto-generate"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">SEO Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="Custom title for search engines (max 70 chars)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Meta Description</label>
                <textarea
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                  placeholder="Summary for search results (max 160 chars)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Canonical URL</label>
                <input
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Image Alt Text</label>
                <input
                  type="text"
                  value={imageAltText}
                  onChange={(e) => setImageAltText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="Description of the cover image"
                />
              </div>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Content</label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing the full article here..."
            />
          </div>
        </form>
      </div>
    </div>
  );
}
