"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { analyticsApi } from "@/lib/api";
import type { Analytics } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

function StatCard({
  label,
  value,
  icon,
  sub,
  colorClass,
}: {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
  colorClass: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</p>
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
        {sub && <p className="text-xs font-semibold text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="h-3 w-24 bg-slate-200 rounded mb-4" />
      <div className="h-8 w-20 bg-slate-300 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyticsApi
      .get()
      .then(res => setAnalytics(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const maxCategoryCount =
    analytics?.articles_per_category?.reduce((m, c) => Math.max(m, c.count), 1) ?? 1;

  return (
    <AuthGuard>
      <div className="space-y-8 max-w-7xl mx-auto w-full">
        {/* Header Banner */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-slate-900 p-6 md:p-8 rounded-2xl text-white shadow-xl">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Overview Dashboard</h2>
            <p className="text-slate-300 text-sm mt-1 font-medium">
              Real-time health, readership metrics, and platform analytics.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/articles/new"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              New Article
            </Link>
            <Link
              href="/notifications"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              Push Alerts
            </Link>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-sm">
            <span className="material-symbols-outlined text-[20px]">error</span>
            Failed to load analytics: {error}
          </div>
        )}

        {/* Primary KPI Cards — row 1 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : analytics && (
                <>
                  <StatCard
                    label="Total Articles"
                    value={(analytics.total_articles ?? 0).toLocaleString()}
                    icon="article"
                    sub="Published content"
                    colorClass="bg-blue-100 text-blue-700"
                  />
                  <StatCard
                    label="Total Users"
                    value={(analytics.total_users ?? 0).toLocaleString()}
                    icon="group"
                    sub="Registered accounts"
                    colorClass="bg-emerald-100 text-emerald-700"
                  />
                  <StatCard
                    label="New Users Today"
                    value={(analytics.new_users_today ?? 0).toLocaleString()}
                    icon="person_add"
                    sub="Since midnight UTC"
                    colorClass="bg-purple-100 text-purple-700"
                  />
                  <StatCard
                    label="Articles Today"
                    value={(analytics.articles_today ?? 0).toLocaleString()}
                    icon="today"
                    sub="Added today"
                    colorClass="bg-amber-100 text-amber-700"
                  />
                </>
              )}
        </section>

        {/* Secondary KPI Cards — row 2 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : analytics && (
                <>
                  <StatCard
                    label="Total Reels"
                    value={(analytics.total_reels ?? 0).toLocaleString()}
                    icon="play_circle"
                    sub="Video content"
                    colorClass="bg-rose-100 text-rose-700"
                  />
                  <StatCard
                    label="Total Bookmarks"
                    value={(analytics.total_bookmarks ?? 0).toLocaleString()}
                    icon="bookmark"
                    sub="Saved by users"
                    colorClass="bg-sky-100 text-sky-700"
                  />
                  <StatCard
                    label="Notifications Sent"
                    value={(analytics.total_notifications ?? 0).toLocaleString()}
                    icon="notifications_active"
                    sub="All-time broadcasts"
                    colorClass="bg-indigo-100 text-indigo-700"
                  />
                  <StatCard
                    label="New Users This Week"
                    value={(analytics.new_users_this_week ?? 0).toLocaleString()}
                    icon="trending_up"
                    sub="Last 7 days"
                    colorClass="bg-teal-100 text-teal-700"
                  />
                </>
              )}
        </section>

        {/* Charts + Lists Row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Articles by Category Bar Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-5">
              Articles per Category
            </h3>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-3 w-20 bg-slate-200 rounded mb-1" />
                    <div className="h-6 bg-slate-100 rounded-full" style={{ width: `${60 + i * 8}%` }} />
                  </div>
                ))}
              </div>
            ) : analytics?.articles_per_category?.length ? (
              <div className="space-y-3">
                {analytics.articles_per_category.map(cat => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700">{cat.category}</span>
                      <span className="text-xs font-black text-slate-900 tabular-nums">
                        {cat.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                        style={{
                          width: `${Math.round((cat.count / maxCategoryCount) * 100)}%`,
                          minWidth: cat.count > 0 ? "8px" : "0",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium py-8 text-center">
                No category data yet.{" "}
                <Link href="/articles/new" className="text-blue-600 font-bold underline">
                  Create your first article.
                </Link>
              </p>
            )}
          </div>

          {/* Most Bookmarked Articles */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-5">
              Most Bookmarked
            </h3>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-slate-200 rounded w-full" />
                      <div className="h-2 bg-slate-100 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : analytics?.most_bookmarked_articles?.length ? (
              <ol className="space-y-4">
                {analytics.most_bookmarked_articles.map((item, idx) => (
                  <li key={item.article_id} className="flex items-start gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5 ${
                        idx === 0
                          ? "bg-amber-400 text-white"
                          : idx === 1
                          ? "bg-slate-300 text-slate-800"
                          : idx === 2
                          ? "bg-orange-300 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">bookmark</span>
                        {item.bookmark_count} saves
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500 font-medium py-8 text-center">
                No bookmarks yet.
              </p>
            )}
          </div>
        </section>

        {/* Quick Management Links */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/users"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[26px]">manage_accounts</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">User Management</h4>
              <p className="text-slate-600 text-xs font-medium">Ban/restrict accounts & edit roles</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 ml-auto group-hover:text-blue-600 transition-colors">
              arrow_forward
            </span>
          </Link>

          <Link
            href="/articles"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[26px]">newsmode</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Article Editor</h4>
              <p className="text-slate-600 text-xs font-medium">Edit, pin, or remove news stories</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 ml-auto group-hover:text-emerald-600 transition-colors">
              arrow_forward
            </span>
          </Link>

          <Link
            href="/notifications"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-purple-500 hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[26px]">notifications_active</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Push Notifications</h4>
              <p className="text-slate-600 text-xs font-medium">Dispatch instant or scheduled alerts</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 ml-auto group-hover:text-purple-600 transition-colors">
              arrow_forward
            </span>
          </Link>
        </section>
      </div>
    </AuthGuard>
  );
}
