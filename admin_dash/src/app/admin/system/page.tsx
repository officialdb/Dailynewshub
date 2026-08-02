"use client";

import { useEffect, useState } from "react";
import { v2ApiHealth, v2SystemSettings, v2ApiKeys } from "@/lib/api";
import type { V2HealthStatus, V2SystemSettings, V2ApiKey } from "@/lib/types";

function StatusDot({ status }: { status: string }) {
  const color = status === "ok" || status === "healthy" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-amber-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

export default function SystemDashboardPage() {
  const [health, setHealth] = useState<V2HealthStatus | null>(null);
  const [settings, setSettings] = useState<V2SystemSettings | null>(null);
  const [apiKeys, setApiKeys] = useState<V2ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "api-keys" | "settings">("overview");

  useEffect(() => {
    Promise.all([
      v2ApiHealth().then(r => setHealth(r.data)),
      v2SystemSettings().then(r => setSettings(r.data)),
      v2ApiKeys.list().then(r => setApiKeys(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">System Control</h1>
        <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />)}</div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "dashboard" },
    { id: "api-keys" as const, label: "API Keys", icon: "key" },
    { id: "settings" as const, label: "Settings", icon: "settings" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">System Control</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Health */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">System Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <StatusDot status={health?.status ?? "error"} />
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">Overall</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{health?.status ?? "unknown"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <StatusDot status={health?.database ?? "error"} />
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">Database</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{health?.database ?? "unknown"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <StatusDot status={health?.redis ?? "error"} />
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">Redis</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{health?.redis ?? "unknown"}</p>
                </div>
              </div>
            </div>
            {health?.version && <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-3">Version: {health.version}</p>}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">API Keys Active</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{apiKeys.filter(k => k.is_active).length}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">API Keys Total</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{apiKeys.length}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">System Roles</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{settings?.system_roles.length ?? 8}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Workflow States</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{settings?.workflow_states.length ?? 12}</p>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "api-keys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{apiKeys.length} keys total, {apiKeys.filter(k => k.is_active).length} active</p>
          </div>

          {apiKeys.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 text-center text-zinc-500 dark:text-zinc-400 text-xs">
              No API keys created yet.
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Prefix</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Rate Limit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Last Used</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {apiKeys.map(key => (
                    <tr key={key.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="px-4 py-3 text-xs font-semibold text-zinc-900 dark:text-white">{key.name}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{key.prefix}...</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{key.rate_limit.toLocaleString()}/min</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                          key.is_active ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${key.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {key.is_active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && settings && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">System Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">App Name</p>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white mt-0.5">{settings.app_name}</p>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Version</p>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white mt-0.5">{settings.version}</p>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Max Upload Size</p>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white mt-0.5">{settings.max_upload_size_mb} MB</p>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Default Rate Limit</p>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white mt-0.5">{settings.default_rate_limit.toLocaleString()} req/min</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">Allowed Image Types</h3>
            <div className="flex flex-wrap gap-2">
              {settings.allowed_image_types.map(type => (
                <span key={type} className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">{type}</span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">System Roles ({settings.system_roles.length})</h3>
            <div className="flex flex-wrap gap-2">
              {settings.system_roles.map(role => (
                <span key={role} className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">{role}</span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">Workflow States ({settings.workflow_states.length})</h3>
            <div className="flex flex-wrap gap-2">
              {settings.workflow_states.map(state => (
                <span key={state} className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">{state}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
