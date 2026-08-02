"use client";

import Link from "next/link";
import DeveloperAuthCard from "@/components/DeveloperAuthCard";

export default function DeveloperRegisterPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-white">
              <span className="material-symbols-outlined text-[18px]">newspaper</span>
            </div>
            <div>
              <p className="text-base font-extrabold tracking-tight text-white">DailyNewsHub</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Developer Registration</p>
            </div>
          </Link>

          <nav className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Link href="/developer" className="hover:text-white transition-colors">Developer</Link>
            <Link href="/developer/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/docs" className="hover:text-white transition-colors">API Docs</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
        <DeveloperAuthCard initialMode="register" />
      </main>
    </div>
  );
}
