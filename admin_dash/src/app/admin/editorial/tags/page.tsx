"use client";

import { useEffect, useState } from "react";
import { v2TagsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { V2Tag } from "@/lib/types";

export default function TagsPage() {
  const { isAdmin, hasRole } = useAuth();
  const canManage = isAdmin || hasRole("chief_editor");

  const [tags, setTags] = useState<V2Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    v2TagsApi.list().then(res => setTags(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  function autoSlug(n: string) {
    setSlug(n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function createTag() {
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    try {
      const res = await v2TagsApi.create(name, slug);
      setTags(prev => [res.data, ...prev]);
      setName(""); setSlug("");
    } catch (e: any) { alert(e.message); }
    finally { setCreating(false); }
  }

  async function deleteTag(id: string) {
    if (!confirm("Delete this tag?")) return;
    try {
      await v2TagsApi.delete(id);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Tags</h1>
          {!canManage && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Read-only — use these tags when writing your articles</p>
          )}
        </div>
      </div>

      {/* Create — admin / chief_editor only */}
      {canManage && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <h2 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3">Create Tag</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Tag name"
              value={name}
              onChange={e => { setName(e.target.value); autoSlug(e.target.value); }}
              className="flex-1 min-w-[150px] rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
            />
            <input
              type="text"
              placeholder="slug"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="flex-1 min-w-[150px] rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
            />
            <button
              onClick={createTag}
              disabled={creating || !name.trim() || !slug.trim()}
              className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />)}
        </div>
      ) : tags.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 text-center text-zinc-500 dark:text-zinc-400 text-xs">
          No tags yet.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Created</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tags.map(tag => (
                <tr key={tag.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                      <span className="material-symbols-outlined text-[14px] text-zinc-500 dark:text-zinc-400">sell</span>
                      {tag.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{tag.slug}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{new Date(tag.created_at).toLocaleDateString()}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteTag(tag.id)} className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
