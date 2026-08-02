"use client";

import { useEffect, useState, useCallback } from "react";
import { v2UsersApi, v2RolesApi } from "@/lib/api";
import type { V2User, V2Role } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { exportToCSV } from "@/lib/export";
import { Eye, EyeOff } from "lucide-react";

function RoleBadge({ name, system }: { name: string; system?: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${system ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"}`}>
      {name}
    </span>
  );
}

function RoleAssignModal({
  user,
  roles,
  onClose,
  onAssigned,
}: {
  user: V2User;
  roles: V2Role[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(user.roles.map(r => r.id))
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await v2UsersApi.assignRoles(user.id, Array.from(selected));
      toast("Roles updated", "success");
      onAssigned();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to update roles", "error");
    } finally {
      setSaving(false);
    }
  }

  function toggleRole(roleId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Assign Roles — {user.name}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Select one or more roles for this user</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {roles.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-8">No roles available</p>
          ) : (
            roles.map(role => {
              const isChecked = selected.has(role.id);
              return (
                <label
                  key={role.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleRole(role.id)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white">{role.name}</span>
                      {role.is_system && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase">System</span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{role.description}</p>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Roles"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserForm({
  title,
  initialData,
  onSubmit,
  onCancel,
  submitting,
}: {
  title: string;
  initialData: { name: string; email: string; password: string; is_admin: boolean; is_active: boolean; country?: string | null; state?: string | null };
  // --- SEC FIX SEC-007 ---
  onSubmit: (data: { name: string; email: string; password: string; is_admin: boolean; is_active: boolean; country?: string | null; state?: string | null }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState(initialData);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 mb-6">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">{title}</h3>
      <form
        onSubmit={e => { e.preventDefault(); onSubmit(form); }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(d => ({ ...d, name: e.target.value }))}
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(d => ({ ...d, email: e.target.value }))}
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">
            Password{initialData.password === "" ? "" : " (leave blank to keep current)"}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              minLength={initialData.password === "" ? 8 : undefined}
              required={initialData.password === ""}
              value={form.password}
              onChange={e => setForm(d => ({ ...d, password: e.target.value }))}
              className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-3 pr-10 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
              placeholder={initialData.password === "" ? "Min 8 characters" : "Leave blank to keep"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Country / Nationality</label>
          <input
            type="text"
            value={form.country || ""}
            onChange={e => setForm(d => ({ ...d, country: e.target.value }))}
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">State / Region</label>
          <input
            type="text"
            value={form.state || ""}
            onChange={e => setForm(d => ({ ...d, state: e.target.value }))}
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
        <div className="flex items-end gap-6 pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_admin}
              onChange={e => setForm(d => ({ ...d, is_admin: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
            />
            <span className="text-xs text-zinc-900 dark:text-white">Admin</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(d => ({ ...d, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
            />
            <span className="text-xs text-zinc-900 dark:text-white">Active</span>
          </label>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer">
            {submitting ? "Saving..." : initialData.password === "" ? "Create User" : "Update User"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function UserRow({
  user,
  onEdit,
  onToggleActive,
  onDelete,
  onAssignRoles,
}: {
  user: V2User;
  onEdit: (user: V2User) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onAssignRoles: (user: V2User) => void;
}) {
  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">{user.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-xs text-zinc-500 dark:text-zinc-400">{user.email}</td>
      <td className="px-4 py-4 text-xs text-zinc-500 dark:text-zinc-400">{user.country || "-"}</td>
      <td className="px-4 py-4 text-xs text-zinc-500 dark:text-zinc-400">{user.state || "-"}</td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1">
          {user.roles.length === 0 ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">No roles</span>
          ) : (
            user.roles.map(r => <RoleBadge key={r.id} name={r.name} />)
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`}></span>
          <span className="text-xs text-zinc-900 dark:text-white">{user.is_active ? "Active" : "Inactive"}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onAssignRoles(user)}
            title="Assign roles"
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
          </button>
          <button
            onClick={() => onEdit(user)}
            title="Edit user"
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => onToggleActive(user.id, !user.is_active)}
            title={user.is_active ? "Deactivate" : "Activate"}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">{user.is_active ? "person_off" : "person_check"}</span>
          </button>
          <button
            onClick={() => onDelete(user.id)}
            title="Delete user"
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

const emptyForm = { name: "", email: "", password: "", is_admin: false, is_active: true, country: "", state: "" };

export default function UsersPage() {
  const { toast, confirm } = useToast();
  const [users, setUsers] = useState<V2User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roles, setRoles] = useState<V2Role[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<V2User | null>(null);
  const [assigningUser, setAssigningUser] = useState<V2User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await v2UsersApi.list({ page: p, limit: 10, search: q });
      setUsers(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(page, search); }, [page, search, fetchUsers]);

  useEffect(() => {
    v2RolesApi.list().then(r => setRoles(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setPage(1);
        setSearch(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // --- SEC FIX SEC-007 ---
  async function handleCreate(data: { name: string; email: string; password: string; is_admin: boolean; is_active: boolean; country?: string | null; state?: string | null }) {
    setSubmitting(true);
    try {
      await v2UsersApi.create({
        name: data.name,
        email: data.email,
        password: data.password,
        is_admin: data.is_admin,
        is_active: data.is_active,
        country: data.country,
        state: data.state,
      } as any);
      setShowCreate(false);
      await fetchUsers(page, search);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Create failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // --- SEC FIX SEC-007 ---
  async function handleUpdate(data: { name: string; email: string; password: string; is_admin: boolean; is_active: boolean; country?: string | null; state?: string | null }) {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await v2UsersApi.update(editingUser.id, {
        name: data.name,
        email: data.email,
        is_admin: data.is_admin,
        is_active: data.is_active,
        country: data.country,
        state: data.state,
        ...(data.password ? { password: data.password } : {}),
      } as any);
      setEditingUser(null);
      await fetchUsers(page, search);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    try {
      await v2UsersApi.updateStatus(id, { is_active: active });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: active } : u));
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!await confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      await v2UsersApi.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setTotal(t => t - 1);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Users</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{total} registered accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              exportToCSV("users", ["Name", "Email", "Country", "State", "Roles", "Status", "Created At"],
                users.map(u => [u.name, u.email, u.country || "", u.state || "", u.roles.map(r => r.name).join(", "), u.is_active ? "Active" : "Inactive", u.created_at]));
            }}
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <button
            onClick={() => { setEditingUser(null); setShowCreate(true); }}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            New User
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 mb-4">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      <div className="relative max-w-md">
        <span className="material-symbols-outlined text-[18px] text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2">search</span>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {showCreate && (
        <UserForm
          title="Create New User"
          initialData={emptyForm}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitting={submitting}
        />
      )}

      {editingUser && (
        <UserForm
          title={`Edit User — ${editingUser.name}`}
          initialData={{
            name: editingUser.name,
            email: editingUser.email,
            password: "",
            is_admin: editingUser.is_admin,
            is_active: editingUser.is_active,
            country: editingUser.country,
            state: editingUser.state,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingUser(null)}
          submitting={submitting}
        />
      )}

      {assigningUser && (
        <RoleAssignModal
          user={assigningUser}
          roles={roles}
          onClose={() => setAssigningUser(null)}
          onAssigned={() => fetchUsers(page, search)}
        />
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Country</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">State</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Roles</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded"></div></td>
                    <td className="px-4 py-4"></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400 text-xs">No users found.</td></tr>
              ) : (
                users.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onEdit={u => { setShowCreate(false); setEditingUser(u); }}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                    onAssignRoles={u => setAssigningUser(u)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/30">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Page <span className="font-bold text-zinc-900 dark:text-white">{page}</span> of <span className="font-bold text-zinc-900 dark:text-white">{pages}</span> · {total} total
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={p === page ? "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 cursor-pointer" : "w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
