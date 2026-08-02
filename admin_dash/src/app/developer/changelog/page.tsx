"use client";

import Link from "next/link";

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/95 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <i className="fa fa-newspaper-o text-sm"></i>
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">DailyNewsHub Changelog</span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Link href="/developer" className="hover:text-white transition-colors">Developer Portal</Link>
            <Link href="/docs" className="hover:text-white transition-colors">API Docs</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-16 w-full space-y-8 flex-1 text-left">
        <div data-aos="fade-down">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Developer Changelog</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">Updates, release notes, and feature additions for the DailyNewsHub REST API.</p>
        </div>

        <div className="space-y-8">
          {/* Release v2.4.0 */}
          <div data-aos="fade-up" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">v2.4.0 · July 2026</span>
              <span className="text-xs text-zinc-500 font-mono">Latest Release</span>
            </div>
            <h2 className="text-base font-bold text-white">Expanded Regional & AI Summary Parameters</h2>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside leading-relaxed">
              <li>Added <code className="text-emerald-400 font-mono">country=ng</code> regional filtering parameter for breaking West African news.</li>
              <li>Added pre-computed bullet executive summaries directly inside the <code className="text-amber-300 font-mono">/api/v2/public/articles</code> JSON payloads.</li>
              <li>Upgraded free tier rate limits to 60 requests/minute.</li>
            </ul>
          </div>

          {/* Release v2.0.0 */}
          <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="px-3 py-1 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold">v2.0.0 · May 2026</span>
              <span className="text-xs text-zinc-500 font-mono">Major REST Release</span>
            </div>
            <h2 className="text-base font-bold text-white">v2 REST Architecture & Instant API Keys</h2>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside leading-relaxed">
              <li>Migrated public API endpoints to high-performance REST v2 pipeline (&lt;50ms response latency).</li>
              <li>Launched Developer Self-Service Portal and instant API Key issuance.</li>
              <li>Implemented automated HMAC and bearer key authentication.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
