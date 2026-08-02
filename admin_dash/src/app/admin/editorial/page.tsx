"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { v2DashboardApi, v2ArticlesApi } from "@/lib/api";
import type { V2DashboardStats, V2PipelineStats, V2Article } from "@/lib/types";

// ─── Status badge colours ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft:              "bg-zinc-400",
  submitted:          "bg-blue-500",
  under_review:       "bg-indigo-500",
  fact_checking:      "bg-amber-500",
  validation:         "bg-purple-500",
  editorial_review:   "bg-violet-500",
  approved:           "bg-emerald-500",
  scheduled:          "bg-cyan-500",
  published:          "bg-green-500",
  archived:           "bg-zinc-500",
  rejected:           "bg-rose-500",
  revision_requested: "bg-orange-500",
};

function Badge({ status }: { status: string }) {
  const dotColor = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="divide-y divide-zinc-200 dark:divide-zinc-800" />;
}

// ─── Reporter View ────────────────────────────────────────────────────────────
function ReporterView() {
  const [myArticles, setMyArticles] = useState<V2Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    v2ArticlesApi.list({ limit: 10 })
      .then(res => setMyArticles(res.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const drafts    = myArticles.filter(a => a.status === "draft");
  const inReview  = myArticles.filter(a => ["submitted","under_review","fact_checking","validation","editorial_review"].includes(a.status));
  const revisions = myArticles.filter(a => a.status === "revision_requested");
  const published = myArticles.filter(a => a.status === "published");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">My Workspace</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Your articles and their current status</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Drafts"     value={drafts.length}    icon="edit_note" />
        <StatCard label="In Review"  value={inReview.length}  icon="fact_check" />
        <StatCard label="Revisions"  value={revisions.length} icon="rate_review" />
        <StatCard label="Published"  value={published.length} icon="publish" />
      </div>

      {revisions.length > 0 && (
        <div className="rounded-xl border border-orange-300 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/30 p-4">
          <h3 className="text-xs font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            Revision Requests
          </h3>
          <div className="mt-3 space-y-2">
            {revisions.map(a => (
              <p key={a.id} className="text-xs text-orange-700 dark:text-orange-300">{a.title}</p>
            ))}
          </div>
        </div>
      )}

      <SectionCard title="Recent Articles">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}
          </div>
        ) : myArticles.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No articles yet.</p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {myArticles.slice(0, 8).map(a => (
              <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-900 dark:text-white truncate flex-1">{a.title}</span>
                <Badge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Fact Checker View ────────────────────────────────────────────────────────
function FactCheckerView() {
  const [articles, setArticles] = useState<V2Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    v2ArticlesApi.list({ status: "fact_checking", limit: 20 })
      .then(res => setArticles(res.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Fact-Check Queue</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Articles awaiting fact verification</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Checks" value={articles.length} icon="fact_check" />
      </div>

      <SectionCard title="Queue">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No articles in fact-check stage.</p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {articles.map(a => (
              <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{a.title}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{a.reporter?.name ?? "Unknown"} · {a.category?.name ?? "—"}</p>
                </div>
                <button className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                  Verify
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Chief Editor View ────────────────────────────────────────────────────────
function ChiefEditorView() {
  const [stats, setStats]       = useState<V2DashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<V2PipelineStats | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([v2DashboardApi.stats(), v2DashboardApi.pipeline()])
      .then(([s, p]) => { setStats(s.data); setPipeline(p.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Newsroom Overview</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Full pipeline visibility and team oversight</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Articles" value={stats?.total_articles ?? 0}    icon="article" />
        <StatCard label="In Pipeline"    value={pipeline?.total_in_pipeline ?? 0} icon="moving" />
        <StatCard label="Users"          value={stats?.total_users ?? 0}        icon="group" />
        <StatCard label="API Keys"       value={stats?.total_api_keys ?? 0}     icon="key" />
      </div>

      {pipeline && pipeline.stages.length > 0 && (
        <SectionCard title="Editorial Pipeline">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {pipeline.stages.map(s => (
              <div key={s.status} className="text-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3">
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{s.count}</p>
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {s.status.replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {stats && stats.by_status.length > 0 && (
        <SectionCard title="Status Distribution">
          <div className="flex flex-wrap gap-2">
            {stats.by_status.map(sc => (
              <div key={sc.status} className="flex items-center gap-1.5">
                <Badge status={sc.status} />
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">{sc.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Publisher View ───────────────────────────────────────────────────────────
function PublisherView() {
  const [approved,  setApproved]  = useState<V2Article[]>([]);
  const [scheduled, setScheduled] = useState<V2Article[]>([]);
  const [recent,    setRecent]    = useState<V2Article[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      v2ArticlesApi.list({ status: "approved",  limit: 10 }),
      v2ArticlesApi.list({ status: "scheduled", limit: 10 }),
      v2ArticlesApi.list({ status: "published", limit: 5 }),
    ]).then(([a, s, r]) => {
      setApproved(a.data.items);
      setScheduled(s.data.items);
      setRecent(r.data.items);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Publishing Desk</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Ready to publish, scheduled, and recently published</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Ready to Publish"    value={approved.length}  icon="check_circle" />
        <StatCard label="Scheduled"           value={scheduled.length} icon="schedule" />
        <StatCard label="Recently Published"  value={recent.length}    icon="publish" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Ready to Publish">
          {approved.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Nothing ready.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {approved.map(a => (
                <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-900 dark:text-white truncate flex-1">{a.title}</span>
                  <button className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors">
                    Publish
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Scheduled">
          {scheduled.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Nothing scheduled.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {scheduled.map(a => (
                <div key={a.id} className="py-2.5">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">{a.title}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {a.workflow?.published_at ? new Date(a.workflow.published_at).toLocaleString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Validator View ───────────────────────────────────────────────────────────
function ValidatorView() {
  const [articles, setArticles] = useState<V2Article[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    v2ArticlesApi.list({ status: "validation", limit: 20 })
      .then(res => setArticles(res.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Validation Queue</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Articles awaiting editorial standards review</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Validation" value={articles.length} icon="verified" />
      </div>

      <SectionCard title="Queue">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No articles in validation.</p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {articles.map(a => (
              <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{a.title}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{a.reporter?.name ?? "Unknown"} · {a.category?.name ?? "—"}</p>
                </div>
                <button className="rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 px-3 py-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors">
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Main Page (Role Router) ──────────────────────────────────────────────────
export default function EditorialDashboardPage() {
  const { hasRole, isAdmin } = useAuth();

  if (hasRole("chief_editor") || isAdmin) return <ChiefEditorView />;
  if (hasRole("publisher"))               return <PublisherView />;
  if (hasRole("fact_checker"))            return <FactCheckerView />;
  if (hasRole("validator"))               return <ValidatorView />;
  return <ReporterView />;
}
