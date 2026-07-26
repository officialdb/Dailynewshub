"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { analyticsApi } from "@/lib/api";
import type { Analytics } from "@/lib/types";

function StatCard({ label, value, icon, trend, color = "primary" }: { label: string; value: string | number; icon: string; trend?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary-container/10 text-primary",
    secondary: "bg-secondary-container/30 text-on-secondary-container",
    tertiary: "bg-tertiary-container/10 text-tertiary",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md card-shadow flex flex-col justify-between gap-3">
      <div className="flex justify-between items-start">
        <p className="text-label-md font-label-md text-secondary">{label}</p>
        <div className={`p-2 rounded-lg ${colorMap[color] ?? colorMap.primary}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <div>
        <h3 className="text-headline-lg font-headline-lg text-on-surface">{value}</h3>
        {trend && <p className="text-label-sm font-label-sm text-secondary mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md animate-pulse">
      <div className="h-4 w-24 bg-outline-variant rounded mb-4"></div>
      <div className="h-8 w-16 bg-outline-variant rounded"></div>
    </div>
  );
}

const quickLinks = [
  { href: "/admin/users", icon: "manage_accounts", title: "User Management", desc: "View, edit, and manage user accounts", color: "bg-primary-container/20 text-primary group-hover:bg-primary group-hover:text-on-primary" },
  { href: "/admin/articles", icon: "newsmode", title: "Article Management", desc: "Create, edit, and publish articles", color: "bg-secondary-container/30 text-on-secondary-container group-hover:bg-secondary group-hover:text-on-secondary" },
  { href: "/admin/categories", icon: "category", title: "Categories", desc: "Manage news categories and organization", color: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white" },
  { href: "/admin/reels", icon: "movie", title: "Reels", desc: "Manage short-form video content", color: "bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white" },
  { href: "/admin/notifications", icon: "notifications", title: "Notifications", desc: "Send and schedule push notifications", color: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white" },
  { href: "/admin/comments", icon: "forum", title: "Comments", desc: "Moderate user comments", color: "bg-violet-50 text-violet-600 group-hover:bg-violet-500 group-hover:text-white" },
];

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useEffect(() => {
    analyticsApi.get()
      .then(res => setAnalytics(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const maxCategoryCount = analytics?.articles_per_category?.reduce((max, c) => Math.max(max, c.count), 0) ?? 1;

  return (
    <div className="p-4 lg:p-margin space-y-stack-lg max-w-max-width mx-auto w-full">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface">Overview</h2>
          <p className="text-body-lg font-body-lg text-secondary">Platform health at a glance.</p>
        </div>
        <Link
          href="/admin/articles/edit"
          className="bg-primary text-on-primary px-4 py-[10px] rounded-lg font-label-md flex items-center gap-2 hover:opacity-90 transition-all shadow-sm shadow-primary/20 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Create Article
        </Link>
      </section>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>
          Failed to load analytics: {error}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : analytics ? (
          <>
            <StatCard label="Total Articles" value={(analytics.total_articles ?? 0).toLocaleString()} icon="article" trend="All time" />
            <StatCard label="Total Users" value={(analytics.total_users ?? 0).toLocaleString()} icon="group" trend="Registered accounts" color="secondary" />
            <StatCard label="Total Reels" value={(analytics.total_reels ?? 0).toLocaleString()} icon="movie" trend="Video content" color="tertiary" />
            <StatCard label="Total Bookmarks" value={(analytics.total_bookmarks ?? 0).toLocaleString()} icon="bookmark" trend="User saves" color="emerald" />
            <StatCard label="New Users Today" value={analytics.new_users_today ?? 0} icon="person_add" trend="Since midnight UTC" />
            <StatCard label="New Users This Week" value={analytics.new_users_this_week ?? 0} icon="group_add" trend="Last 7 days" color="secondary" />
            <StatCard label="Articles Today" value={analytics.articles_today ?? 0} icon="today" trend="Published today" color="tertiary" />
            <StatCard label="Notifications Sent" value={(analytics.total_notifications ?? 0).toLocaleString()} icon="notifications_active" trend="All time" color="emerald" />
          </>
        ) : null}
      </section>

      {analytics?.articles_per_category && analytics.articles_per_category.length > 0 && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow">
          <button
            onClick={() => setCategoriesExpanded(v => !v)}
            className="flex items-center justify-between w-full mb-4 cursor-pointer group"
          >
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Articles per Category
              <span className="text-label-sm text-secondary font-normal ml-2">({analytics.articles_per_category.length})</span>
            </h3>
            <span className={`material-symbols-outlined text-outline group-hover:text-primary transition-transform duration-200 ${categoriesExpanded ? "rotate-180" : ""}`}>
              expand_more
            </span>
          </button>
          <div className={`space-y-3 overflow-hidden transition-all duration-300 ${categoriesExpanded ? "max-h-[2000px]" : "max-h-[220px]"}`}>
            {(categoriesExpanded ? analytics.articles_per_category : analytics.articles_per_category.slice(0, 5)).map(item => (
              <div key={item.category} className="flex items-center gap-3">
                <span className="text-label-md text-on-surface-variant w-32 truncate text-right">{item.category}</span>
                <div className="flex-1 bg-surface-container-high rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.max((item.count / maxCategoryCount) * 100, item.count > 0 ? 8 : 0)}%` }}
                  >
                    {item.count > 0 && <span className="text-[11px] font-bold text-on-primary">{item.count}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {analytics.articles_per_category.length > 5 && (
            <button
              onClick={() => setCategoriesExpanded(v => !v)}
              className="mt-3 text-label-md text-primary hover:underline cursor-pointer"
            >
              {categoriesExpanded ? "Show less" : `Show all ${analytics.articles_per_category.length} categories`}
            </button>
          )}
        </section>
      )}

      {analytics?.most_bookmarked_articles && analytics.most_bookmarked_articles.length > 0 && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Most Bookmarked Articles</h3>
          <div className="space-y-2">
            {analytics.most_bookmarked_articles.map((item, i) => (
              <div key={item.article_id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container/40 transition-colors">
                <span className="text-label-sm text-outline w-6 text-center font-bold">#{i + 1}</span>
                <span className="material-symbols-outlined text-[16px] text-amber-500">bookmark</span>
                <span className="text-body-md text-on-surface flex-1 truncate">{item.title}</span>
                <span className="text-label-md font-bold text-primary">{item.bookmark_count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow hover:border-primary/40 transition-all flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${link.color}`}>
                <span className="material-symbols-outlined text-[28px]">{link.icon}</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface">{link.title}</h4>
                <p className="text-body-sm text-secondary">{link.desc}</p>
              </div>
              <span className="material-symbols-outlined text-outline ml-auto group-hover:text-primary transition-colors">arrow_forward</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
