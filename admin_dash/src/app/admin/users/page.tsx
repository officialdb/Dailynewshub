"use client";

import { useEffect, useState, useCallback } from "react";
import { usersApi } from "@/lib/api";
import type { User, UserUpdate } from "@/lib/types";

function UserForm({
  title,
  initialData,
  onSubmit,
  onCancel,
  submitting,
}: {
  title: string;
  initialData: { name: string; email: string; password: string; is_admin: boolean; is_active: boolean };
  onSubmit: (data: { name: string; email: string; password: string; is_admin: boolean; is_active: boolean }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState(initialData);

  return (
    <div className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow">
      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{title}</h3>
      <form
        onSubmit={e => { e.preventDefault(); onSubmit(form); }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-label-md text-on-surface-variant mb-1.5">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(d => ({ ...d, name: e.target.value }))}
            className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-label-md text-on-surface-variant mb-1.5">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(d => ({ ...d, email: e.target.value }))}
            className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-label-md text-on-surface-variant mb-1.5">
            Password{initialData.password === "" ? "" : " (leave blank to keep current)"}
          </label>
          <input
            type="password"
            minLength={initialData.password === "" ? 8 : undefined}
            required={initialData.password === ""}
            value={form.password}
            onChange={e => setForm(d => ({ ...d, password: e.target.value }))}
            className="w-full border border-outline-variant rounded-xl p-3 bg-surface-bright text-body-md focus:ring-primary focus:border-primary outline-none transition-all"
            placeholder={initialData.password === "" ? "Min 8 characters" : "Leave blank to keep"}
          />
        </div>
        <div className="flex items-end gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_admin}
              onChange={e => setForm(d => ({ ...d, is_admin: e.target.checked }))}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="text-body-md text-on-surface">Admin</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(d => ({ ...d, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="text-body-md text-on-surface">Active</span>
          </label>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
            {submitting ? "Saving..." : initialData.password === "" ? "Create User" : "Update User"}
          </button>
          <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-outline rounded-lg font-label-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer">
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
}: {
  user: User;
  onEdit: (user: User) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <tr className="hover:bg-surface-container/40 transition-colors cursor-default group">
      <td className="px-stack-md py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-bold text-on-surface text-sm">{user.name}</p>
            <p className="text-xs text-secondary">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </td>
      <td className="px-stack-md py-4 text-sm text-secondary">{user.email}</td>
      <td className="px-stack-md py-4">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${user.is_admin ? "bg-primary-container/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
          {user.is_admin ? "Admin" : "User"}
        </span>
      </td>
      <td className="px-stack-md py-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-outline"}`}></span>
          <span className="text-sm text-on-surface">{user.is_active ? "Active" : "Inactive"}</span>
        </div>
      </td>
      <td className="px-stack-md py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(user)}
            title="Edit user"
            className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => onToggleActive(user.id, !user.is_active)}
            title={user.is_active ? "Deactivate" : "Activate"}
            className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">{user.is_active ? "person_off" : "person_check"}</span>
          </button>
          <button
            onClick={() => onDelete(user.id)}
            title="Delete user"
            className="p-1.5 rounded-lg hover:bg-error-container/20 text-outline hover:text-error transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

const emptyForm = { name: "", email: "", password: "", is_admin: false, is_active: true };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.list(p, 10);
      setUsers(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(page); }, [page, fetchUsers]);

  async function handleCreate(data: { name: string; email: string; password: string; is_admin: boolean; is_active: boolean }) {
    setSubmitting(true);
    try {
      await usersApi.create({
        name: data.name,
        email: data.email,
        password: data.password,
        is_admin: data.is_admin,
        is_active: data.is_active,
      });
      setShowCreate(false);
      await fetchUsers(page);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(data: { name: string; email: string; password: string; is_admin: boolean; is_active: boolean }) {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const payload: UserUpdate = { name: data.name, email: data.email, is_admin: data.is_admin, is_active: data.is_active };
      if (data.password) payload.password = data.password;
      await usersApi.update(editingUser.id, payload);
      setEditingUser(null);
      await fetchUsers(page);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    try {
      await usersApi.update(id, { is_active: active });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: active } : u));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      await usersApi.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setTotal(t => t - 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="max-w-max-width mx-auto p-margin w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Users</h1>
          <p className="font-body-md text-body-md text-secondary">{total} registered accounts</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowCreate(true); }}
          className="flex items-center gap-2 px-stack-md py-[10px] bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          New User
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

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
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingUser(null)}
          submitting={submitting}
        />
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Name</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Email</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Role</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider">Status</th>
                <th className="px-stack-md py-4 text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-stack-md py-4"><div className="h-4 w-32 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-40 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-16 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"><div className="h-4 w-16 bg-outline-variant rounded"></div></td>
                    <td className="px-stack-md py-4"></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-stack-md py-12 text-center text-secondary">No users found.</td></tr>
              ) : (
                users.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onEdit={u => { setShowCreate(false); setEditingUser(u); }}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
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
