"use client";

import { useState } from "react";
import Link from "next/link";

interface SampleNews {
  id: string;
  title: string;
  category: string;
  summary: string;
  author: string;
  timeAgo: string;
  views: string;
  readTime: string;
  isTrending?: boolean;
  image: string;
}

const sampleArticles: SampleNews[] = [
  {
    id: "1",
    title: "Quantum Breakthrough: 10,000-Qubit Processor Achieves Stable Error Correction",
    category: "AI & Tech",
    summary: "Researchers achieve room-temperature quantum coherence, opening doors for real-time decryption and climate modeling at scale.",
    author: "Elena Rostova",
    timeAgo: "12 mins ago",
    views: "48.2k",
    readTime: "4 min read",
    isTrending: true,
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "2",
    title: "Global Central Banks Launch Interoperable Sovereign Digital Currency Protocol",
    category: "Markets & Economy",
    summary: "Seventeen central banks sign historic agreement enabling zero-fee instant cross-border settlement using cryptographically backed digital reserve notes.",
    author: "Marcus Vance",
    timeAgo: "45 mins ago",
    views: "32.9k",
    readTime: "6 min read",
    isTrending: true,
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "3",
    title: "Next-Gen Fusion Reactor Begins Continuous Commercial Energy Generation Grid Trial",
    category: "Clean Energy",
    summary: "The Helion-IV tokamak sustains net energy output for 72 consecutive hours, supplying 300MW directly to the regional electrical grid.",
    author: "Dr. Sarah Chen",
    timeAgo: "2 hours ago",
    views: "94.1k",
    readTime: "5 min read",
    isTrending: true,
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "4",
    title: "Autonomous Space Cargo Clipper Completes First Deep Space Cargo Run to Mars Station",
    category: "Global Affairs",
    summary: "The uncrewed supply vessel delivers 45 metric tons of life support hardware and scientific equipment to Olympus Outpost.",
    author: "Alex Rivera",
    timeAgo: "3 hours ago",
    views: "21.5k",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "5",
    title: "AI-Synthesized Therapeutics Enter Phase III Trials for Universal Virus Immunity",
    category: "AI & Tech",
    summary: "Computational biology platform designs broad-spectrum protein inhibitor targeting universal viral replication enzymes.",
    author: "Dr. Jonathan Hayes",
    timeAgo: "5 hours ago",
    views: "57.4k",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "6",
    title: "Zero-Trust Architecture Standard Mandated Across All Financial Infrastructure Providers",
    category: "Cyber & Infra",
    summary: "New regulatory framework requires micro-segmentation and continuous identity authorization for all transaction routes.",
    author: "Maya Lin",
    timeAgo: "7 hours ago",
    views: "18.3k",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80"
  }
];

export default function LandingPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "AI & Tech", "Markets & Economy", "Clean Energy", "Global Affairs", "Cyber & Infra"];

  const filteredArticles = sampleArticles.filter(item => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesQuery = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090A0F]/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[2px] shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-[#0d0f17] rounded-[10px] flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400 text-xl font-bold">newspaper</span>
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                DailyNews<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Hub</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block leading-none">News Engine & Platform</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#live-feed" className="hover:text-blue-400 transition-colors">Live Feed</a>
            <a href="#metrics" className="hover:text-blue-400 transition-colors">Platform Stats</a>
            <a href="#testimonials" className="hover:text-blue-400 transition-colors">Publishers</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 transition-all duration-200 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">admin_panel_settings</span>
              <span>Admin Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32 border-b border-slate-800/60">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute -top-12 left-10 w-72 h-72 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-blue-500/30 shadow-inner mb-8 text-xs font-semibold text-blue-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Introducing DailyNewsHub Engine v2.0</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">AI News Summaries & Dynamic Telemetry</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.15]">
            The AI-Powered Intelligence Hub for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Global Breaking News
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            DailyNewsHub aggregates high-velocity news streams across technology, global affairs, and markets. Powered by real-time AI summarization, reader analytics, and enterprise moderation tools.
          </p>

          {/* Hero CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/admin/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 transition-all duration-200 active:scale-95 flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span>Launch Admin Dashboard</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>

            <a
              href="#live-feed"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-blue-400">play_circle</span>
              <span>Explore Live Demo Feed</span>
            </a>
          </div>

          {/* Hero Preview Card Stack */}
          <div className="mt-16 max-w-5xl mx-auto rounded-2xl p-2 bg-gradient-to-b from-slate-700/50 to-slate-900/80 border border-slate-700/80 shadow-2xl shadow-blue-900/20 backdrop-blur-xl">
            <div className="rounded-xl bg-[#0d0f17] p-4 sm:p-6 text-left border border-slate-800/80">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                  <span className="ml-2 text-xs font-mono text-slate-400">dailynewshub.internal / live-stream-monitor</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>LIVE INGESTION ACTIVE (48ms latency)</span>
                </div>
              </div>

              {/* Ingestion snippet */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">AI Summarizer</span>
                    <h4 className="text-sm font-semibold text-slate-100 mt-2">Automated TL;DR Generation</h4>
                    <p className="text-xs text-slate-400 mt-1">Ingested 1,420 longform articles in last 60 seconds with 99.4% factual retention.</p>
                  </div>
                  <span className="text-[11px] text-blue-400 font-mono mt-3">⚡ Status: Operational</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Telemetry</span>
                    <h4 className="text-sm font-semibold text-slate-100 mt-2">Realtime Audience Spike Detection</h4>
                    <p className="text-xs text-slate-400 mt-1">Algorithm detected +340% view velocity on quantum computing articles.</p>
                  </div>
                  <span className="text-[11px] text-indigo-400 font-mono mt-3">📈 Velocity: High</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Moderation</span>
                    <h4 className="text-sm font-semibold text-slate-100 mt-2">Multi-Tier Admin Review</h4>
                    <p className="text-xs text-slate-400 mt-1">Role-based permission gating for article drafts, editor approvals, and user accounts.</p>
                  </div>
                  <span className="text-[11px] text-cyan-400 font-mono mt-3">🛡️ Auth: Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats Section */}
      <section id="metrics" className="py-16 bg-slate-950/60 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">12.4M+</p>
              <p className="text-sm font-medium text-slate-400 mt-1">Monthly Active Readers</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">99.99%</p>
              <p className="text-sm font-medium text-slate-400 mt-1">Enterprise Uptime SLA</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">&lt; 50ms</p>
              <p className="text-sm font-medium text-slate-400 mt-1">Feed Ingestion Latency</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">850K+</p>
              <p className="text-sm font-medium text-slate-400 mt-1">AI Summaries Published</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive News Showcase */}
      <section id="live-feed" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-3 border border-blue-500/20">
              <span className="material-symbols-outlined text-sm">rss_feed</span>
              Interactive Demonstration
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Explore the Live News Stream</h2>
            <p className="text-slate-400 mt-2 text-base max-w-2xl">
              Experience the fast-loading, AI-summarized news feed designed for modern readers and content creators.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search news titles or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                activeCategory === cat
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              <span className="material-symbols-outlined text-4xl mb-2">find_in_page</span>
              <p className="text-base font-medium">No articles matched your search query.</p>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <div
                key={article.id}
                className="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-blue-900/10"
              >
                <div>
                  {/* Card Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                    {/* eslint-disable-next-html-element-suppression */}
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-950/80 backdrop-blur-md text-blue-400 border border-blue-500/30">
                        {article.category}
                      </span>
                      {article.isTrending && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/90 text-slate-950 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">trending_up</span>
                          Trending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>{article.timeAgo}</span>
                      <span>{article.readTime}</span>
                    </div>

                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors leading-snug">
                      {article.title}
                    </h3>

                    {/* AI Summary Badge + Text */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 mb-1">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        AI Executive Summary
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {article.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-300">{article.author}</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    {article.views}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-24 bg-slate-950/80 border-t border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Built for Next-Gen Newsrooms & Enterprise Publishing</h2>
            <p className="text-slate-400 mt-4 text-base">
              DailyNewsHub delivers an end-to-end stack for real-time news management, reader engagement, and analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">psychology</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated AI Summarization</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Generate concise, high-accuracy summaries of lengthy articles automatically using neural language processing algorithms.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">analytics</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Real-Time Platform Telemetry</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Monitor user registration velocity, daily article creation rates, and view counts through clean admin dashboard KPIs.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">shield_lock</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Role-Based Access Control</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Enforce strict admin authentication with secure token session handling and instant account activation toggles.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">edit_note</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Rich Article Management</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Full-featured editor supporting categories, author attribution, trending tags, draft states, and SEO metadata.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">bolt</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sub-50ms Global CDN</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Optimized Next.js server infrastructure ensures ultra-fast page loads and responsive data fetching.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">group</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">User Moderation Suite</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Comprehensive directory of user accounts with real-time status management and administrative controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-white">Trusted by Leading Digital Media Outlets</h2>
          <p className="text-slate-400 mt-2">Here is what chief editors and platform leads say about DailyNewsHub.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <p className="text-slate-300 text-sm italic leading-relaxed">
              &quot;DailyNewsHub transformed how our newsroom operates. The AI summarization and admin analytics give us complete visibility over breaking news trends.&quot;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 font-bold">VC</div>
              <div>
                <p className="text-sm font-bold text-white">Victoria Cross</p>
                <p className="text-xs text-slate-400">Editor-in-Chief, Global Tech Review</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <p className="text-slate-300 text-sm italic leading-relaxed">
              &quot;The protected admin console and user management interface are rock solid. Managing editors and managing article statuses is effortless.&quot;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-bold">DK</div>
              <div>
                <p className="text-sm font-bold text-white">David Kroll</p>
                <p className="text-xs text-slate-400">VP of Engineering, MarketWire Daily</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <p className="text-slate-300 text-sm italic leading-relaxed">
              &quot;Sub-50ms ingestion latency with automated AI insights allows us to publish verified stories minutes before competing networks.&quot;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-600/30 flex items-center justify-center text-cyan-400 font-bold">MS</div>
              <div>
                <p className="text-sm font-bold text-white">Maria Santos</p>
                <p className="text-xs text-slate-400">Head of Content Operations, FinNews</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Portal CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-blue-900/30 via-indigo-900/40 to-slate-900 border-t border-slate-800 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to Manage the DailyNewsHub Platform?</h2>
          <p className="text-slate-300 mt-4 text-base max-w-2xl mx-auto">
            Sign in to the protected admin console to publish articles, view platform telemetry, and manage registered user accounts.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/admin/login"
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl shadow-blue-600/40 transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">lock_open</span>
              Access Admin Portal (/admin/login)
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-900 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">newspaper</span>
            </div>
            <span className="font-bold text-white">DailyNewsHub Engine</span>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} DailyNewsHub Inc. All rights reserved. Enterprise News Platform.
          </p>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link href="/admin/login" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
              Admin Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
