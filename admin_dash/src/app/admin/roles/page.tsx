"use client";

import { useEffect, useState } from "react";
import { v2RolesApi } from "@/lib/api";
import type { V2Role, V2Permission } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

function RoleCard({ role }: { role: V2Role }) {
  const [expanded, setExpanded] = useState(false);

  const grouped = role.permissions.reduce<Record<string, V2Permission[]>>((acc, p) => {
    const key = p.resource;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.is_system ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>
            <span className="material-symbols-outlined text-[20px]">{role.is_system ? "shield" : "badge"}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">{role.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{role.description ?? "No description"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{role.permissions.length} permissions</span>
          <span className="material-symbols-outlined text-[20px] text-zinc-500 dark:text-zinc-400 transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "none" }}>
            expand_more
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {Object.entries(grouped).map(([resource, perms]) => (
              <div key={resource} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider mb-2">{resource}</p>
                <div className="space-y-1">
                  {perms.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-xs text-zinc-900 dark:text-white">
                      <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                      <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{p.action}</span>
                      {p.description && <span className="text-zinc-500 dark:text-zinc-400">— {p.description}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateRoleModal({
  permissions,
  onClose,
  onCreated,
}: {
  permissions: V2Permission[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Group permissions by resource for easier selection
  const grouped = permissions.reduce<Record<string, V2Permission[]>>((acc, p) => {
    const key = p.resource;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await v2RolesApi.create({
        name: name.trim().toLowerCase().replace(/\s+/g, "_"), // snake_case convention
        description: description.trim(),
        permission_ids: Array.from(selectedPerms),
      });
      toast("Role created successfully", "success");
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create role", "error");
    } finally {
      setSaving(false);
    }
  }

  function togglePerm(id: string) {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Create Custom Role</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Define a new role and its permissions</p>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Role Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                  placeholder="e.g. senior_editor"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white w-full outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
                  placeholder="Brief description of the role"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Permissions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(grouped).map(([resource, perms]) => (
                  <div key={resource} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider mb-2">{resource}</p>
                    <div className="space-y-1.5">
                      {perms.map(p => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 p-1 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedPerms.has(p.id)}
                            onChange={() => togglePerm(p.id)}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-zinc-900 dark:text-white">{p.action}</span>
                            {p.description && <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">{p.description}</span>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-white dark:bg-zinc-950">
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
              {saving ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<V2Role[]>([]);
  const [permissions, setPermissions] = useState<V2Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      v2RolesApi.list().then(r => setRoles(r.data)),
      v2RolesApi.permissions().then(r => setPermissions(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">System roles and their assigned permissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Role
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Roles</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{roles.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">System Roles</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{roles.filter(r => r.is_system).length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Permissions</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{permissions.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined text-[18px] text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2">search</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search roles..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Roles List */}
      {loading ? (
        <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 text-center text-zinc-500 dark:text-zinc-400 text-xs">
          No roles found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(role => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}

      {showModal && <CreateRoleModal permissions={permissions} onClose={() => setShowModal(false)} onCreated={loadData} />}
    </div>
  );
}
