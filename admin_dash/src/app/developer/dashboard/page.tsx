"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearDeveloperTokens,
  developerAppsApi,
  developerAuthApi,
  developerKeysApi,
  developerUsageApi,
} from "@/lib/api";
import type {
  DeveloperAppResponse,
  DeveloperApiKeyCreatedResponse,
  DeveloperApiKeyResponse,
  DeveloperResponse,
  TopEndpointResponse,
  UsageHistoryResponse,
  UsageStatsResponse,
} from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";

function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
          {trend && <p className="mt-1 text-xs text-zinc-500">{trend}</p>}
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2 text-zinc-700 dark:text-zinc-300">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ApiDashboardPage() {
  const router = useRouter();
  const [developer, setDeveloper] = useState<DeveloperResponse | null>(null);
  const [apps, setApps] = useState<DeveloperAppResponse[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStatsResponse | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistoryResponse | null>(null);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpointResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "apps" | "keys" | "usage" | "docs">("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAppModal, setShowAppModal] = useState(false);
  const [editingApp, setEditingApp] = useState<DeveloperAppResponse | null>(null);
  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [savingApp, setSavingApp] = useState(false);

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [keyName, setKeyName] = useState("");
  const [keyEnvironment, setKeyEnvironment] = useState<"live" | "test">("live");
  const [keyExpiresAt, setKeyExpiresAt] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<DeveloperApiKeyCreatedResponse | null>(null);

  const [usageModalKey, setUsageModalKey] = useState<DeveloperApiKeyResponse | null>(null);
  const [usageModalHistory, setUsageModalHistory] = useState<UsageHistoryResponse | null>(null);
  const [loadingUsageHistory, setLoadingUsageHistory] = useState(false);

  const flattenedKeys = useMemo(() => {
    return apps.flatMap((app) =>
      app.api_keys.map((key) => ({
        ...key,
        app_id: app.id,
        app_name: app.name,
      }))
    );
  }, [apps]);

  const activeKeys = flattenedKeys.filter((key) => key.is_active);
  const revokedKeys = flattenedKeys.filter((key) => !key.is_active);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    const [profileResult, appsResult, statsResult, historyResult, endpointsResult] = await Promise.allSettled([
      developerAuthApi.me(),
      developerAppsApi.list(),
      developerUsageApi.stats(),
      developerUsageApi.history(30),
      developerUsageApi.topEndpoints(30),
    ]);

    if (profileResult.status === "fulfilled") setDeveloper(profileResult.value.data);
    if (appsResult.status === "fulfilled") setApps(appsResult.value.data);
    if (statsResult.status === "fulfilled") setUsageStats(statsResult.value.data);
    if (historyResult.status === "fulfilled") setUsageHistory(historyResult.value.data);
    if (endpointsResult.status === "fulfilled") setTopEndpoints(endpointsResult.value.data);

    const firstError = [profileResult, appsResult, statsResult, historyResult, endpointsResult].find(
      (result) => result.status === "rejected",
    );

    if (firstError?.status === "rejected") {
      setError(firstError.reason instanceof Error ? firstError.reason.message : String(firstError.reason));
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    function handleDeveloperTokenExpired() {
      router.push("/developer/login");
    }

    window.addEventListener("developer:token-expired", handleDeveloperTokenExpired);
    return () => window.removeEventListener("developer:token-expired", handleDeveloperTokenExpired);
  }, [router]);

  useEffect(() => {
    if (!selectedAppId && apps.length > 0) {
      setSelectedAppId(apps[0].id);
    }
  }, [apps, selectedAppId]);

  function openCreateAppModal(app?: DeveloperAppResponse) {
    setEditingApp(app ?? null);
    setAppName(app?.name ?? "");
    setAppDescription(app?.description ?? "");
    setShowAppModal(true);
  }

  function openCreateKeyModal(appId?: string) {
    setSelectedAppId(appId || selectedAppId || apps[0]?.id || "");
    setKeyName("");
    setKeyEnvironment("live");
    setKeyExpiresAt("");
    setShowKeyModal(true);
  }

  async function saveApp() {
    if (!appName.trim()) return;
    setSavingApp(true);
    setError(null);
    try {
      if (editingApp) {
        await developerAppsApi.update(editingApp.id, {
          name: appName.trim(),
          description: appDescription.trim() || null,
        });
      } else {
        await developerAppsApi.create({
          name: appName.trim(),
          description: appDescription.trim() || null,
        });
      }
      setShowAppModal(false);
      setEditingApp(null);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save app.");
    } finally {
      setSavingApp(false);
    }
  }

  async function deleteApp(appId: string) {
    if (!confirm("Delete this app? All active keys for the app will be revoked.")) return;
    try {
      await developerAppsApi.delete(appId);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete app.");
    }
  }

  async function saveKey() {
    if (!selectedAppId || !keyName.trim()) return;
    setSavingKey(true);
    setError(null);
    try {
      const result = await developerKeysApi.create(selectedAppId, {
        name: keyName.trim(),
        environment: keyEnvironment,
        expires_at: keyExpiresAt ? new Date(keyExpiresAt).toISOString() : null,
      });
      setCreatedKey(result.data);
      setShowKeyModal(false);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key.");
    } finally {
      setSavingKey(false);
    }
  }

  async function revokeKey(keyId: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await developerKeysApi.revoke(keyId);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key.");
    }
  }

  async function viewKeyUsage(key: DeveloperApiKeyResponse) {
    setUsageModalKey(key);
    setLoadingUsageHistory(true);
    setUsageModalHistory(null);
    try {
      const result = await developerKeysApi.usage(key.id, 30);
      setUsageModalHistory(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load key usage.");
    } finally {
      setLoadingUsageHistory(false);
    }
  }

  async function handleLogout() {
    try {
      await developerAuthApi.logout();
    } catch {
      // Ignore logout errors and clear local session anyway.
    }
    clearDeveloperTokens();
    localStorage.removeItem("developer_user");
    router.push("/developer/login");
  }

  const navigationItems = [
    { id: "overview" as const, label: "Overview", icon: "dashboard" },
    { id: "apps" as const, label: "Applications", icon: "widgets" },
    { id: "keys" as const, label: "API Keys", icon: "key" },
    { id: "usage" as const, label: "Analytics", icon: "bar_chart" },
    { id: "docs" as const, label: "API Reference", icon: "description" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="fixed top-0 left-0 h-screen w-64 hidden border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 md:block">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="md:ml-64 p-8 space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Sidebar for Desktop — fixed, sticky like admin dash */}
      <aside className="fixed top-0 left-0 h-screen w-64 hidden flex-col justify-between border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 md:flex overflow-y-auto z-50">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-2 text-zinc-900 dark:text-white">
                <span className="material-symbols-outlined text-[20px]">developer_board</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide">Developer Hub</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">API Portal</p>
              </div>
            </div>
          </div>

          {/* Developer Card */}
          {developer && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 p-3.5 space-y-2">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{developer.email}</p>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 font-medium uppercase text-zinc-700 dark:text-zinc-300">
                  {developer.tier} Tier
                </span>
                <span className={`rounded px-2 py-0.5 font-medium ${developer.is_email_verified ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800" : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"}`}>
                  {developer.is_email_verified ? "Verified" : "Pending"}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Container — offset by sidebar width on desktop */}
      <div className="flex flex-1 flex-col min-w-0 md:ml-64">
        {/* Mobile Top Navigation Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3.5 md:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-zinc-900 dark:text-white text-[20px]">developer_board</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white">Developer Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <span className="material-symbols-outlined text-[20px]">{mobileNavOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4 md:hidden">
            {developer && (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 text-xs space-y-1">
                <p className="font-semibold text-zinc-900 dark:text-white">{developer.email}</p>
                <p className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">{developer.tier} tier</p>
              </div>
            )}
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                    activeTab === item.id ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Log Out
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-5 sm:p-8 space-y-6 overflow-y-auto">
          {/* Top Title & Actions Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">API Dashboard</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Manage applications, configure access keys, and review rate limit usage.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => openCreateAppModal()}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New App
              </button>
              <button
                onClick={() => openCreateKeyModal()}
                disabled={apps.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-white transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">key</span>
                New API Key
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center justify-between rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-rose-600 dark:text-rose-400">warning</span>
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-600 dark:text-rose-400 hover:opacity-75">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* System Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Apps" value={apps.length} icon="widgets" />
            <StatCard label="Active Keys" value={activeKeys.length} icon="key" />
            <StatCard label="Revoked Keys" value={revokedKeys.length} icon="block" />
            <StatCard label="Daily Limit Left" value={usageStats?.today_remaining ?? "—"} icon="schedule" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today Requests" value={usageStats?.today_requests ?? "—"} icon="trending_up" />
            <StatCard label="Month Requests" value={usageStats?.month_requests ?? "—"} icon="calendar_month" />
            <StatCard label="Success Rate" value={usageStats ? `${usageStats.success_rate.toFixed(1)}%` : "—"} icon="check_circle" />
            <StatCard label="Avg Latency" value={usageStats ? `${Math.round(usageStats.avg_response_time_ms)} ms` : "—"} icon="speed" />
          </div>

          {/* View Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3">Developer Account</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
                      <span className="text-zinc-500">Name</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">{developer?.name ?? "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
                      <span className="text-zinc-500">Company</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">{developer?.company_name || "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
                      <span className="text-zinc-500">Website</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{developer?.website || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Registered</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{developer ? formatDate(developer.created_at) : "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3">System Quota</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 text-xs">
                      <p className="text-zinc-500">Daily Request Limit</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{usageStats?.today_limit ?? "10,000"}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 text-xs">
                      <p className="text-zinc-500">Monthly Request Limit</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{usageStats?.month_limit ?? "300,000"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Table */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Recent Request Activity</h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Total Requests</th>
                        <th className="px-4 py-3 text-left font-semibold">Successful</th>
                        <th className="px-4 py-3 text-left font-semibold">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {(usageHistory?.data ?? []).slice(0, 7).map((point) => (
                        <tr key={point.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                          <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{formatDate(point.date)}</td>
                          <td className="px-4 py-3 text-zinc-900 dark:text-white font-semibold">{point.request_count}</td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">{point.success_count}</td>
                          <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-semibold">{point.error_count}</td>
                        </tr>
                      ))}
                      {(usageHistory?.data ?? []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                            No request logs recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* View Tab 2: Applications */}
          {activeTab === "apps" && (
            <div className="space-y-4">
              {apps.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 text-center text-zinc-500 dark:text-zinc-400">
                  No applications created yet.
                </div>
              ) : (
                apps.map((app) => (
                  <div key={app.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{app.name}</h3>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${app.is_active ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"}`}>
                            {app.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{app.description || "No description provided."}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openCreateKeyModal(app.id)}
                          className="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          Add Key
                        </button>
                        <button
                          onClick={() => openCreateAppModal(app)}
                          className="rounded-lg border border-zinc-300 dark:border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteApp(app.id)}
                          className="rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden">
                      <div className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Keys ({app.api_keys.length})
                      </div>
                      {app.api_keys.length === 0 ? (
                        <div className="p-4 text-xs text-zinc-500">No keys for this application.</div>
                      ) : (
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {app.api_keys.map((key) => (
                            <div key={key.id} className="p-3.5 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-semibold text-zinc-900 dark:text-white">{key.name}</p>
                                <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{key.key_prefix}...</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${key.is_active ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"}`}>
                                  {key.is_active ? "Active" : "Revoked"}
                                </span>
                                <button
                                  onClick={() => viewKeyUsage(key)}
                                  className="rounded border border-zinc-300 dark:border-zinc-800 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                  Usage
                                </button>
                                {key.is_active && (
                                  <button
                                    onClick={() => revokeKey(key.id)}
                                    className="rounded border border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 px-2.5 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* View Tab 3: API Keys */}
          {activeTab === "keys" && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Key Name</th>
                    <th className="px-4 py-3 text-left font-semibold">App</th>
                    <th className="px-4 py-3 text-left font-semibold">Prefix</th>
                    <th className="px-4 py-3 text-left font-semibold">Environment</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {flattenedKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">{key.name}</td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{key.app_name}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">{key.key_prefix}...</td>
                      <td className="px-4 py-3 uppercase text-zinc-500 dark:text-zinc-400">{key.environment}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${key.is_active ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"}`}>
                          {key.is_active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => viewKeyUsage(key)}
                          className="rounded border border-zinc-300 dark:border-zinc-800 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Usage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {flattenedKeys.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                        No API keys generated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* View Tab 4: Analytics */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Endpoint Analytics</h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Endpoint</th>
                        <th className="px-4 py-3 text-left font-semibold">Request Count</th>
                        <th className="px-4 py-3 text-left font-semibold">Avg Latency</th>
                        <th className="px-4 py-3 text-left font-semibold">Error Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {topEndpoints.map((endpoint) => (
                        <tr key={endpoint.endpoint} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                          <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300">{endpoint.endpoint}</td>
                          <td className="px-4 py-3 text-zinc-900 dark:text-white font-semibold">{endpoint.request_count}</td>
                          <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{Math.round(endpoint.avg_response_time_ms)} ms</td>
                          <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{endpoint.error_rate.toFixed(1)}%</td>
                        </tr>
                      ))}
                      {topEndpoints.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                            No endpoint activity logs.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* View Tab 5: Docs */}
          {activeTab === "docs" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Authentication</h3>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">
                  Pass your API key in the <code className="rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 font-mono text-zinc-900 dark:text-white">X-API-Key</code> request header.
                </p>
                <pre className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 font-mono text-xs text-zinc-800 dark:text-zinc-300">{`curl -H "X-API-Key: dnh_live_..." \\
  ${typeof window !== "undefined" ? window.location.origin : "https://api.dailynewshub.com"}/api/v2/public/articles`}</pre>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Create App */}
      {showAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4" onClick={() => setShowAppModal(false)}>
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{editingApp ? "Edit Application" : "Create Application"}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 dark:text-zinc-400 mb-1">Name</label>
                <input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                  placeholder="My Mobile Client"
                />
              </div>
              <div>
                <label className="block text-zinc-500 dark:text-zinc-400 mb-1">Description</label>
                <textarea
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAppModal(false)} className="rounded-lg border border-zinc-300 dark:border-zinc-800 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                Cancel
              </button>
              <button onClick={saveApp} disabled={savingApp || !appName.trim()} className="rounded-lg bg-zinc-900 dark:bg-white px-3 py-1.5 text-xs font-bold text-white dark:text-zinc-950 disabled:opacity-40">
                {savingApp ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4" onClick={() => setShowKeyModal(false)}>
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Generate API Key</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 dark:text-zinc-400 mb-1">Target App</label>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white outline-none"
                >
                  <option value="">Select app...</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>{app.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-zinc-500 dark:text-zinc-400 mb-1">Key Name</label>
                <input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white outline-none"
                  placeholder="Production Key"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowKeyModal(false)} className="rounded-lg border border-zinc-300 dark:border-zinc-800 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                Cancel
              </button>
              <button onClick={saveKey} disabled={savingKey || !selectedAppId || !keyName.trim()} className="rounded-lg bg-zinc-900 dark:bg-white px-3 py-1.5 text-xs font-bold text-white dark:text-zinc-950 disabled:opacity-40">
                {savingKey ? "Generating..." : "Generate Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Display Created Key */}
      {createdKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4" onClick={() => setCreatedKey(null)}>
          <div className="w-full max-w-lg rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-white dark:bg-zinc-950 p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">API Key Created</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Copy this key now. It will not be shown again.</p>
            <div className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 font-mono text-xs text-emerald-700 dark:text-emerald-300 break-all select-all">
              {createdKey.raw_key}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdKey.raw_key);
                  setCreatedKey(null);
                }}
                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-500"
              >
                Copy & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Key Usage */}
      {usageModalKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4" onClick={() => setUsageModalKey(null)}>
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{usageModalKey.name} Activity</h3>
              <button onClick={() => setUsageModalKey(null)} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-3 py-2 text-left font-semibold">Requests</th>
                    <th className="px-3 py-2 text-left font-semibold">Success</th>
                    <th className="px-3 py-2 text-left font-semibold">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {(usageModalHistory?.data ?? []).map((point) => (
                    <tr key={point.date}>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{formatDate(point.date)}</td>
                      <td className="px-3 py-2 text-zinc-900 dark:text-white">{point.request_count}</td>
                      <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400">{point.success_count}</td>
                      <td className="px-3 py-2 text-rose-600 dark:text-rose-400">{point.error_count}</td>
                    </tr>
                  ))}
                  {(usageModalHistory?.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-zinc-500">
                        No usage recorded for this key.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
