"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const { user, v2User } = useAuth();

  if (pathname === "/admin/login") return null;

  const displayName = v2User?.name ?? user?.name ?? "Admin";

  const title = pathname === "/admin"
    ? "Overview"
    : pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" / ");

  return (
    <header className="fixed top-0 right-0 h-14 flex items-center px-4 lg:px-6 ml-0 lg:ml-[280px] w-full lg:w-[calc(100%-280px)] z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">

      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        aria-label="Toggle menu"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      {/* Page title */}
      <h2 className="text-sm font-bold text-zinc-900 dark:text-white ml-3 lg:ml-0 flex-1 truncate tracking-wide">
        {title}
      </h2>

      {/* Right actions */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />

        {/* User badge */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex-shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-zinc-900 dark:text-white hidden sm:inline">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
