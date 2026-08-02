"use client";

import Link from "next/link";

export default function APIStatusPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/95 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <i className="fa fa-newspaper-o text-sm"></i>
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">DailyNewsHub Status</span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Link href="/developer" className="hover:text-white transition-colors">Developer Portal</Link>
            <Link href="/docs" className="hover:text-white transition-colors">API Docs</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-16 w-full space-y-8 flex-1">
        {/* Banner */}
        <div data-aos="fade-down" className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <h1 className="text-lg font-bold text-white">All Systems Operational</h1>
              <p className="text-xs text-zinc-400">REST API, Webhooks, AI Intelligence Engine, and Feeds operating normally.</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-700">99.99% Uptime</span>
        </div>

        {/* Metrics Grid */}
        <div data-aos="fade-up" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-1">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">REST Response Latency</p>
            <p className="text-2xl font-extrabold text-white">28 ms</p>
            <p className="text-[11px] text-emerald-400"><i className="fa fa-arrow-down mr-1"></i>4ms faster than target</p>
          </div>
          <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-1">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">30-Day Uptime</p>
            <p className="text-2xl font-extrabold text-white">99.99 %</p>
            <p className="text-[11px] text-emerald-400">Zero unplanned outages</p>
          </div>
          <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-1">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">AI Summaries Pipeline</p>
            <p className="text-2xl font-extrabold text-white">Active</p>
            <p className="text-[11px] text-emerald-400">Real-time processing</p>
          </div>
        </div>

        {/* System Services Status List */}
        <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Service Components Status</h2>

          <div className="space-y-3 divide-y divide-zinc-800 text-xs">
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Public REST API (v2)</p>
                <p className="text-zinc-500 text-[11px]">https://api.dailynewshub.com/api/v2/public/articles</p>
              </div>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Operational</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">AI Summarization Engine</p>
                <p className="text-zinc-500 text-[11px]">Executive bullet point generation</p>
              </div>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Operational</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Nigerian Regional Data Feed</p>
                <p className="text-zinc-500 text-[11px]">Local & Breaking news ingestion</p>
              </div>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Operational</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Global Publishers Ingestion</p>
                <p className="text-zinc-500 text-[11px]">Multi-source verification pipeline</p>
              </div>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Operational</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
