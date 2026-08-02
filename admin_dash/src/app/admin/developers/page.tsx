"use client";

import { useEffect, useState, useCallback } from "react";
import { v2DevelopersAdminApi } from "@/lib/api";
import type { DeveloperAdmin } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

// ── Detail / Edit Modal ────────────────────────────────────────────────────────

const TIERS = ["free", "basic", "pro", "enterprise"];

function DeveloperModal({
  developer,
  onClose,
  onSaved,
  onDeleted,
}: {
  developer: DeveloperAdmin;
  onClose: () => void;
  onSaved: (updated: DeveloperAdmin) => void;
  onDeleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: developer.name,
    email: developer.email,
    company_name: developer.company_name ?? "",
    website: developer.website ?? "",
    what_are_you_building: developer.what_are_you_building ?? "",
    tier: developer.tier,
    is_active: developer.is_active,
    is_email_verified: developer.is_email_verified,
  });

  function field(key: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await v2DevelopersAdminApi.update(developer.id, {
        name: form.name,
        email: form.email,
        company_name: form.company_name || null,
        website: form.website || null,
        what_are_you_building: form.what_are_you_building || null,
        tier: form.tier as DeveloperAdmin["tier"],
        is_active: form.is_active,
        is_email_verified: form.is_email_verified,
      } as Partial<DeveloperAdmin>);
      toast("Developer updated", "success");
      onSaved(res.data);
      setEditing(false);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Permanently delete ${developer.email}? All their apps and API keys will also be deleted.`
      )
    )
      return;
    setDeleting(true);
    try {
      await v2DevelopersAdminApi.delete(developer.id);
      toast("Developer deleted", "success");
      onDeleted(developer.id);
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-base flex-shrink-0">
              {developer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                {developer.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {developer.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {editing ? (
            /* ── Edit Form ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => field("name", e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => field("email", e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Company
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => field("company_name", e.target.value)}
                  placeholder="None"
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Website
                </label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => field("website", e.target.value)}
                  placeholder="https://..."
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Tier
                </label>
                <select
                  value={form.tier}
                  onChange={(e) => field("tier", e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">
                  What are they building?
                </label>
                <textarea
                  value={form.what_are_you_building}
                  onChange={(e) => field("what_are_you_building", e.target.value)}
                  rows={3}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors resize-none"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => field("is_active", e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                  />
                  <span className="text-xs text-zinc-900 dark:text-white font-medium">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_email_verified}
                    onChange={(e) => field("is_email_verified", e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                  />
                  <span className="text-xs text-zinc-900 dark:text-white font-medium">
                    Email Verified
                  </span>
                </label>
              </div>
            </div>
          ) : (
            /* ── Read-only Detail View ── */
            <div className="space-y-5">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    developer.is_active
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${developer.is_active ? "bg-emerald-500" : "bg-zinc-400"}`}
                  />
                  {developer.is_active ? "Active" : "Suspended"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    developer.is_email_verified
                      ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800"
                      : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {developer.is_email_verified ? "mark_email_read" : "mail"}
                  </span>
                  {developer.is_email_verified ? "Email Verified" : "Email Unverified"}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 uppercase tracking-wide">
                  {developer.tier}
                </span>
              </div>

              {/* Details grid */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {[
                  { label: "Full Name", value: developer.name },
                  { label: "Email", value: developer.email },
                  {
                    label: "Company",
                    value: developer.company_name ?? "—",
                  },
                  {
                    label: "Website",
                    value: developer.website ? (
                      <a
                        href={developer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {developer.website}
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    label: "Joined",
                    value: new Date(developer.created_at).toLocaleString(),
                  },
                  {
                    label: "Last Updated",
                    value: new Date(developer.updated_at).toLocaleString(),
                  },
                ].map(({ label, value }, i) => (
                  <div
                    key={label}
                    className={`flex gap-4 px-4 py-3 ${
                      i % 2 === 0
                        ? "bg-zinc-50 dark:bg-zinc-900/40"
                        : "bg-white dark:bg-zinc-950"
                    }`}
                  >
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-32 flex-shrink-0">
                      {label}
                    </span>
                    <span className="text-xs text-zinc-900 dark:text-white break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {developer.what_are_you_building && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                    What they&apos;re building
                  </p>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-4 py-3 text-xs text-zinc-900 dark:text-white leading-relaxed">
                    {developer.what_are_you_building}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {editing && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Table Row ─────────────────────────────────────────────────────────────────

function DeveloperRow({
  developer,
  onView,
  onToggleActive,
  onDelete,
}: {
  developer: DeveloperAdmin;
  onView: (developer: DeveloperAdmin) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-sm flex-shrink-0">
            {developer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              {developer.name}
              {developer.tier !== "free" && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase">
                  {developer.tier}
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {developer.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        {developer.company_name ? (
          <div className="text-xs font-semibold text-zinc-900 dark:text-white">
            {developer.company_name}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 dark:text-zinc-600 italic">—</div>
        )}
        {developer.website && (
          <div
            className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]"
            title={developer.website}
          >
            {developer.website}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5">
          {developer.is_active ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Active
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Suspended
              </span>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span
            className={`material-symbols-outlined text-[15px] ${
              developer.is_email_verified
                ? "text-emerald-500"
                : "text-zinc-400 dark:text-zinc-600"
            }`}
          >
            {developer.is_email_verified ? "mark_email_read" : "mail"}
          </span>
          {developer.is_email_verified ? "Verified" : "Unverified"}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(developer.created_at).toLocaleDateString()}
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onView(developer)}
            title="View / Edit"
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>
          <button
            onClick={() => onToggleActive(developer.id, !developer.is_active)}
            title={developer.is_active ? "Suspend" : "Activate"}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {developer.is_active ? "block" : "check_circle"}
            </span>
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  `Permanently delete ${developer.email}? All apps and API keys will also be deleted.`
                )
              ) {
                onDelete(developer.id);
              }
            }}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminDevelopersPage() {
  const { toast } = useToast();
  const [developers, setDevelopers] = useState<DeveloperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedDev, setSelectedDev] = useState<DeveloperAdmin | null>(null);
  const limit = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v2DevelopersAdminApi.list({ page, limit, search });
      setDevelopers(res.data.items);
      setTotalPages(res.data.pages);
      setTotalItems(res.data.total);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load developers", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleActive(id: string, is_active: boolean) {
    try {
      await v2DevelopersAdminApi.updateStatus(id, { is_active });
      setDevelopers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active } : d))
      );
      toast(`Developer ${is_active ? "activated" : "suspended"}`, "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await v2DevelopersAdminApi.delete(id);
      toast("Developer deleted permanently", "success");
      setDevelopers((prev) => prev.filter((d) => d.id !== id));
      setTotalItems((t) => t - 1);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  function handleSaved(updated: DeveloperAdmin) {
    setDevelopers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDev(updated);
  }

  return (
    <div className="space-y-6">
      {/* Detail / Edit Modal */}
      {selectedDev && (
        <DeveloperModal
          developer={selectedDev}
          onClose={() => setSelectedDev(null)}
          onSaved={handleSaved}
          onDeleted={(id) => {
            setDevelopers((prev) => prev.filter((d) => d.id !== id));
            setTotalItems((t) => t - 1);
          }}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Developer Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage external API developer accounts and their access.
          </p>
        </div>
      </div>

      {/* Search / Stats bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full max-w-sm">
          <span className="material-symbols-outlined text-[18px] text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name, email or company…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {totalItems} total developers
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Developer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="animate-pulse flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/4" />
                          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : developers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    No developers found.
                  </td>
                </tr>
              ) : (
                developers.map((dev) => (
                  <DeveloperRow
                    key={dev.id}
                    developer={dev}
                    onView={setSelectedDev}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/30">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
