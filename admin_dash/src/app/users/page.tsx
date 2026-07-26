"use client";

import { useEffect, useState, useCallback } from "react";
import { usersApi } from "@/lib/api";
import type { User, UserUpdate } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "restricted">("all");

  // Selected User Modal / Edit state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordReset, setPasswordReset] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Load Users
  const loadUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    usersApi
      .list(page, limit)
      .then(res => {
        setUsers(res.data.items);
        setTotal(res.data.total);
        setPages(res.data.pages);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, limit]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Quick Account Restriction / Activation Toggle
  const toggleUserActive = async (user: User) => {
    const nextActive = !user.is_active;
    try {
      await usersApi.update(user.id, { is_active: nextActive });
      setActionMessage(`Account ${user.name} is now ${nextActive ? "Active" : "Restricted/Banned"}.`);
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user status");
    }
  };

  // Quick Role Toggle
  const toggleUserAdmin = async (user: User) => {
    const nextAdmin = !user.is_admin;
    try {
      await usersApi.update(user.id, { is_admin: nextAdmin });
      setActionMessage(`User ${user.name} role updated to ${nextAdmin ? "Admin" : "Standard User"}.`);
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  // Delete User
  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) return;
    try {
      await usersApi.delete(user.id);
      setActionMessage(`User ${user.name} was successfully deleted.`);
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  // Save Modal Form Updates
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);

    const payload: UserUpdate = {
      name: selectedUser.name,
      email: selectedUser.email,
      is_active: selectedUser.is_active,
      is_admin: selectedUser.is_admin,
    };

    if (passwordReset.trim().length > 0) {
      payload.password = passwordReset.trim();
    }

    try {
      await usersApi.update(selectedUser.id, payload);
      setActionMessage(`User ${selectedUser.name} updated successfully.`);
      setIsDetailOpen(false);
      setPasswordReset("");
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // Filtered List for Local Search
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === "active") return matchesSearch && u.is_active;
    if (filterStatus === "restricted") return matchesSearch && !u.is_active;
    return matchesSearch;
  });

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">User Management & Powers</h2>
            <p className="text-slate-700 text-sm font-medium mt-1">
              Full control over account access, restrictions, role privileges, and detailed user profiles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl border border-blue-200">
              Total Users: {total}
            </span>
          </div>
        </div>

        {/* Action Notification */}
        {actionMessage && (
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              {actionMessage}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-800 hover:text-emerald-950 font-bold text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700">Filter:</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as "all" | "active" | "restricted")}
              className="bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 px-3 py-2 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="restricted">Restricted / Banned Only</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-bold text-sm">
            Error loading users: {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-4 px-6">User / Avatar</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Account Status</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6 text-right">Actions & Powers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-600 font-semibold">
                      <span className="material-symbols-outlined animate-spin text-3xl text-blue-600 mb-2">progress_activity</span>
                      <p>Loading registered accounts...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-600 font-semibold">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 text-blue-800 flex items-center justify-center font-black text-sm flex-shrink-0">
                            {user.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              user.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{user.name}</p>
                            <p className="text-[11px] text-slate-600 font-mono">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 text-slate-800 font-semibold">{user.email}</td>

                      {/* Role Badge */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleUserAdmin(user)}
                          title="Click to toggle Admin / User role"
                          className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                            user.is_admin
                              ? "bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200"
                              : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {user.is_admin ? "ADMIN" : "USER"}
                        </button>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleUserActive(user)}
                          title="Click to Restrict or Reactivate account"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
                            user.is_active
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200"
                              : "bg-red-100 text-red-900 border border-red-300 hover:bg-red-200"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${user.is_active ? "bg-emerald-600" : "bg-red-600"}`} />
                          {user.is_active ? "ACTIVE" : "RESTRICTED"}
                        </button>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-slate-700 text-xs font-semibold">
                        {new Date(user.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDetailOpen(true);
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-all border border-blue-200 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            Inspect
                          </button>

                          <button
                            onClick={() => handleDelete(user)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all border border-red-200 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-700">
                Page {page} of {pages} ({total} accounts)
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detailed User Modal */}
        {isDetailOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-lg">
                    {selectedUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-900">{selectedUser.name}</h3>
                    <p className="text-xs font-bold text-slate-600">{selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="text-slate-500 hover:text-slate-800 p-1">
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={selectedUser.name}
                    onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                {/* Account Status Switch */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900">Account Access Control</p>
                    <p className="text-xs font-medium text-slate-600">Restrict user from logging in when disabled</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active })}
                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                      selectedUser.is_active
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-red-600 text-white shadow-md shadow-red-600/20"
                    }`}
                  >
                    {selectedUser.is_active ? "ACTIVE" : "RESTRICTED"}
                  </button>
                </div>

                {/* Role Switch */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900">Admin Privileges</p>
                    <p className="text-xs font-medium text-slate-600">Grant full access to admin console</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser({ ...selectedUser, is_admin: !selectedUser.is_admin })}
                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                      selectedUser.is_admin
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                        : "bg-slate-300 text-slate-800"
                    }`}
                  >
                    {selectedUser.is_admin ? "ADMIN" : "STANDARD USER"}
                  </button>
                </div>

                {/* Optional Password Reset */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={passwordReset}
                    onChange={e => setPasswordReset(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsDetailOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {saving ? "Saving Changes..." : "Save User Powers"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
