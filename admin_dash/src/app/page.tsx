"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { analyticsApi } from "@/lib/api";
import type { Analytics } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: string; trend?: string }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md card-shadow flex flex-col justify-between gap-3">
      <div className="flex justify-between items-start">
        <p className="text-label-md font-label-md text-secondary">{label}</p>
        <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
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

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyticsApi.get()
      .then(res => setAnalytics(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div className="p-margin space-y-stack-lg max-w-max-width mx-auto w-full">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface">Overview</h2>
            <p className="text-body-lg font-body-lg text-secondary">Platform health at a glance.</p>
          </div>
          <Link
            href="/articles/new"
            className="bg-primary text-on-primary px-4 py-[10px] rounded-lg font-label-md flex items-center gap-2 hover:opacity-90 transition-all shadow-sm shadow-primary/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Create Article
          </Link>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-sm">
            <span className="material-symbols-outlined text-[18px]">error</span>
            Failed to load analytics: {error}
          </div>
        )}

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : analytics ? (
            <>
              <StatCard label="Total Articles" value={analytics.total_articles.toLocaleString()} icon="article" trend="All time" />
              <StatCard label="Total Users" value={analytics.total_users.toLocaleString()} icon="group" trend="Registered accounts" />
              <StatCard label="New Users Today" value={analytics.new_users_today} icon="person_add" trend="Since midnight UTC" />
              <StatCard label="Articles Today" value={analytics.articles_today} icon="today" trend="Published today" />
            </>
          ) : null}
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <Link href="/users" className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow hover:border-primary/40 transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-[28px]">manage_accounts</span>
            </div>
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">User Management</h4>
              <p className="text-body-sm text-secondary">View, edit, and manage user accounts</p>
            </div>
            <span className="material-symbols-outlined text-outline ml-auto group-hover:text-primary transition-colors">arrow_forward</span>
          </Link>

          <Link href="/articles" className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg card-shadow hover:border-primary/40 transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary-container/30 flex items-center justify-center text-on-secondary-container group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
              <span className="material-symbols-outlined text-[28px]">newsmode</span>
            </div>
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">Article Management</h4>
              <p className="text-body-sm text-secondary">Create, edit, and publish articles</p>
            </div>
            <span className="material-symbols-outlined text-outline ml-auto group-hover:text-primary transition-colors">arrow_forward</span>
          </Link>
        </section>
      </div>
    </AuthGuard>
  );
}
