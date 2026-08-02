"use client";

import { useEffect, useState, useCallback } from "react";
import { v2AuditApi, v2DashboardApi } from "@/lib/api";
import type { V2AuditLog, V2DashboardStats } from "@/lib/types";

function StatCard({ label, value, icon, color = "primary" }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2 text-zinc-700 dark:text-zinc-300">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function AuditDashboardPage() {
  const [logs, setLogs] = useState<V2AuditLog[]>([]);
  const [stats, setStats] = useState<V2DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [actions, setActions] = useState<string[]>([]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v2AuditApi.list({
        page, limit: 25,
        action: actionFilter || undefined,
        resource_type: resourceFilter || undefined,
      });
      setLogs(res.data.items);
      setTotal(res.data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, actionFilter, resourceFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => {
    v2AuditApi.actions().then(res => setActions(res.data)).catch(console.error);
    v2DashboardApi.stats().then(res => setStats(res.data)).catch(console.error);
  }, []);

  const pages = Math.ceil(total / 25);

  // Count actions by resource type
  const resourceCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.resource_type] = (acc[log.resource_type] || 0) + 1;
    return acc;
  }, {});

  // Count actions by type
  const actionCounts = logs.reduce<Record<string, number>>((acc, log) => {
    const prefix = log.action.split(":")[0];
    acc[prefix] = (acc[prefix] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Compliance Center</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Monitor all system activity and ensure accountability</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Articles" value={stats?.total_articles ?? "—"} icon="article" />
        <StatCard label="Total Users" value={stats?.total_users ?? "—"} icon="group" color="emerald" />
        <StatCard label="Audit Entries" value={total} icon="history" color="amber" />
        <StatCard label="Active API Keys" value={stats?.total_api_keys ?? "—"} icon="key" color="red" />
      </div>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Activity by Resource</h3>
          {Object.keys(resourceCounts).length === 0 ? <p className="text-xs text-zinc-500 dark:text-zinc-400">No data</p> :
            <div className="space-y-2">
              {Object.entries(resourceCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-900 dark:text-white">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 dark:bg-white rounded-full" style={{ width: `${(count / logs.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Activity by Action</h3>
          {Object.keys(actionCounts).length === 0 ? <p className="text-xs text-zinc-500 dark:text-zinc-400">No data</p> :
            <div className="space-y-2">
              {Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-900 dark:text-white">{action}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-500 dark:bg-zinc-400 rounded-full" style={{ width: `${(count / logs.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors">
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={resourceFilter} onChange={e => { setResourceFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-500 dark:focus:border-zinc-600 transition-colors">
          <option value="">All resources</option>
          {Object.keys(resourceCounts).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 self-center">{total} entries</span>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="animate-pulse space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />)}</div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-zinc-900 dark:text-white">{log.user_name ?? "—"}</td>
                    <td className="px-4 py-3"><code className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">{log.action}</code></td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{log.resource_type}{log.resource_id ? ` (${log.resource_id.slice(0, 8)}...)` : ""}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{log.ip_address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded border border-zinc-300 dark:border-zinc-800 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer">Prev</button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="rounded border border-zinc-300 dark:border-zinc-800 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer">Next</button>
        </div>
      )}
    </div>
  );
}
