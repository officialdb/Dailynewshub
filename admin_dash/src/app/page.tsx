"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Header Bar */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/30">
            N
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">DailyNewsHub</h1>
            <p className="text-xs text-blue-400 font-medium">Enterprise Admin Console</p>
          </div>
        </div>

        <div>
          {user ? (
            <Link
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              Sign In to Console
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl w-full mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Centralized Platform Management
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
            Powering Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">News Publishing</span> & Analytics
          </h2>

          <p className="text-lg text-slate-300 font-normal leading-relaxed max-w-2xl">
            Welcome to the official administrator portal for Daily News Hub. Manage published articles, monitor user analytics, dispatch targeted push notifications, and maintain user access controls with complete oversight.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-xl shadow-blue-600/30 active:scale-95 flex items-center gap-2"
              >
                <span>Open Dashboard</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-xl shadow-blue-600/30 active:scale-95 flex items-center gap-2"
              >
                <span>Access Admin Console</span>
                <span className="material-symbols-outlined text-[20px]">lock_open</span>
              </Link>
            )}
            <Link
              href="/articles"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-3.5 rounded-xl font-semibold text-base transition-all active:scale-95"
            >
              Browse Articles
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-3 hover:border-blue-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">analytics</span>
            </div>
            <h3 className="font-bold text-xl text-white">Live Analytics</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Track platform metrics, total active users, new registrations today, and total article readership stats in real-time.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-3 hover:border-blue-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">manage_accounts</span>
            </div>
            <h3 className="font-bold text-xl text-white">Advanced User Powers</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Complete administrative authority over user accounts: restrict or ban users, grant admin privileges, and inspect profiles.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-3 hover:border-blue-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">notifications_active</span>
            </div>
            <h3 className="font-bold text-xl text-white">Push Notification Center</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Broadcast instant push alerts to mobile devices or schedule automated notifications for breaking news stories.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-6 border-t border-slate-800 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium">
        <p>© {new Date().getFullYear()} Daily News Hub. All rights reserved.</p>
        <p className="mt-2 sm:mt-0">Enterprise Management System v1.0.0</p>
      </footer>
    </div>
  );
}
