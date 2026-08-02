"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { analyticsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Analytics, RecentActivity } from "@/lib/types";

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: string; trend?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2 text-zinc-700 dark:text-zinc-300">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      {trend && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{trend}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded mb-2"></div>
          <div className="h-6 w-16 bg-zinc-100 dark:bg-zinc-800 rounded mt-2"></div>
        </div>
        <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800"></div>
      </div>
      <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-800 rounded mt-2"></div>
    </div>
  );
}

const quickLinks = [
  { href: "/admin/users", icon: "manage_accounts", title: "User Management", desc: "View, edit, and manage user accounts" },
  { href: "/admin/articles", icon: "newsmode", title: "Article Management", desc: "Create, edit, and publish articles" },
  { href: "/admin/categories", icon: "category", title: "Categories", desc: "Manage news categories and organization" },
  { href: "/admin/reels", icon: "movie", title: "Reels", desc: "Manage short-form video content" },
  { href: "/admin/notifications", icon: "notifications", title: "Notifications", desc: "Send and schedule push notifications" },
  { href: "/admin/comments", icon: "forum", title: "Comments", desc: "Moderate user comments" },
];

export default function DashboardPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  // Guard: redirect non-admins away from this page
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/admin/editorial");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    analyticsApi.get()
      .then(res => setAnalytics(res.data))
      .catch(() => {
        // v1 analytics may not be available for v2-authenticated users
        setAnalytics(null);
      })
      .finally(() => setLoading(false));
    analyticsApi.activity()
      .then(res => setActivity(res.data))
      .catch(() => {});
  }, []);

  // Don't render admin content for non-admins while redirecting
  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-zinc-900 dark:text-white">progress_activity</span>
      </div>
    );
  }

  const maxCategoryCount = analytics?.articles_per_category?.reduce((max, c) => Math.max(max, c.count), 0) ?? 1;

  return (
    <div className="p-5 space-y-6 w-full mx-auto">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Overview</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Platform health at a glance.</p>
        </div>
        <Link
          href="/admin/articles/edit"
          className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Create Article
        </Link>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 mb-4">
          <span className="material-symbols-outlined text-[18px]">error</span>
          Failed to load analytics: {error}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : analytics ? (
          <>
            <StatCard label="Total Articles" value={(analytics.total_articles ?? 0).toLocaleString()} icon="article" trend="All time" />
            <StatCard label="Total Users" value={(analytics.total_users ?? 0).toLocaleString()} icon="group" trend="Registered accounts" />
            <StatCard label="Total Reels" value={(analytics.total_reels ?? 0).toLocaleString()} icon="movie" trend="Video content" />
            <StatCard label="Total Bookmarks" value={(analytics.total_bookmarks ?? 0).toLocaleString()} icon="bookmark" trend="User saves" />
            <StatCard label="New Users Today" value={analytics.new_users_today ?? 0} icon="person_add" trend="Since midnight UTC" />
            <StatCard label="New Users This Week" value={analytics.new_users_this_week ?? 0} icon="group_add" trend="Last 7 days" />
            <StatCard label="Articles Today" value={analytics.articles_today ?? 0} icon="today" trend="Published today" />
            <StatCard label="Notifications Sent" value={(analytics.total_notifications ?? 0).toLocaleString()} icon="notifications_active" trend="All time" />
          </>
        ) : null}
      </section>

      {analytics?.articles_per_category && analytics.articles_per_category.length > 0 && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
          <button
            onClick={() => setCategoriesExpanded(v => !v)}
            className="flex items-center justify-between w-full mb-4 cursor-pointer group"
          >
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Articles per Category
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal ml-2">({analytics.articles_per_category.length})</span>
            </h3>
            <span className={`material-symbols-outlined text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-transform duration-200 ${categoriesExpanded ? "rotate-180" : ""}`}>
              expand_more
            </span>
          </button>
          <div className={`space-y-3 overflow-hidden transition-all duration-300 ${categoriesExpanded ? "max-h-[2000px]" : "max-h-[220px]"}`}>
            {(categoriesExpanded ? analytics.articles_per_category : analytics.articles_per_category.slice(0, 5)).map(item => (
              <div key={item.category} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 w-32 truncate text-right">{item.category}</span>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-zinc-900 dark:bg-white h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.max((item.count / maxCategoryCount) * 100, item.count > 0 ? 8 : 0)}%` }}
                  >
                    {item.count > 0 && <span className="text-[11px] font-bold text-white dark:text-zinc-950">{item.count}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {analytics.articles_per_category.length > 5 && (
            <button
              onClick={() => setCategoriesExpanded(v => !v)}
              className="mt-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:underline cursor-pointer"
            >
              {categoriesExpanded ? "Show less" : `Show all ${analytics.articles_per_category.length} categories`}
            </button>
          )}
        </section>
      )}

      {analytics?.most_bookmarked_articles && analytics.most_bookmarked_articles.length > 0 && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">Most Bookmarked Articles</h3>
          <div className="space-y-2">
            {analytics.most_bookmarked_articles.map((item, i) => (
              <div key={item.article_id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                <span className="text-xs text-zinc-400 dark:text-zinc-500 w-6 text-center font-bold">#{i + 1}</span>
                <span className="material-symbols-outlined text-[16px] text-amber-500">bookmark</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white flex-1 truncate">{item.title}</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white">{item.bookmark_count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activity && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-zinc-900 dark:text-white">person_add</span>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">New Users</h3>
            </div>
            <div className="space-y-2">
              {activity.recent_users.map(u => (
                <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-[10px] font-bold flex-shrink-0">{u.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {activity.recent_users.length === 0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">No users yet</p>}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-zinc-900 dark:text-white">article</span>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Latest Articles</h3>
            </div>
            <div className="space-y-2">
              {activity.recent_articles.map(a => (
                <div key={a.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <span className="material-symbols-outlined text-[16px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">description</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-white truncate">{a.title}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{a.source_name ?? "Unknown"} · {new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {activity.recent_articles.length === 0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">No articles yet</p>}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-zinc-900 dark:text-white">forum</span>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Recent Comments</h3>
            </div>
            <div className="space-y-2">
              {activity.recent_comments.map(c => (
                <div key={c.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <span className="material-symbols-outlined text-[16px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">chat_bubble</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-white truncate">{c.body}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{c.user_name} · {c.article_title ?? "—"}</p>
                  </div>
                </div>
              ))}
              {activity.recent_comments.length === 0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">No comments yet</p>}
            </div>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                <span className="material-symbols-outlined text-[28px]">{link.icon}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{link.title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{link.desc}</p>
              </div>
              <span className="material-symbols-outlined text-zinc-400 dark:text-zinc-500 ml-auto group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">arrow_forward</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
