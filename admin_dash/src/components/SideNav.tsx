"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";


export function useSidebar() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, toggle: () => setOpen(v => !v) };
}

export default function SideNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, v2User, logout, isAdmin, hasRole } = useAuth();

  useEffect(() => { onClose(); }, [pathname]);

  if (pathname === "/admin/login") return null;

  const navItems: { href: string; icon: string; label: string; section?: string }[] = [];

  if (isAdmin) {
    navItems.push({ href: "/admin", icon: "analytics", label: "Overview" });
  }

  if (isAdmin || hasRole("reporter") || hasRole("chief_editor") || hasRole("publisher") || hasRole("fact_checker") || hasRole("validator")) {
    navItems.push({ href: "/admin/editorial", icon: "edit_note", label: "My Dashboard", section: "Editorial" });
    navItems.push({ href: "/admin/editorial/articles", icon: "article", label: "Articles" });
    navItems.push({ href: "/admin/editorial/tags", icon: "sell", label: "Tags" });
    navItems.push({ href: "/admin/editorial/notifications", icon: "notifications", label: "Notifications" });
  }

  if (isAdmin) {
    navItems.push({ href: "/admin/categories", icon: "category", label: "Categories", section: "Content" });
    navItems.push({ href: "/admin/reels", icon: "movie", label: "Reels" });
    navItems.push({ href: "/admin/comments", icon: "forum", label: "Comments" });
  }

  if (isAdmin || hasRole("auditor")) {
    navItems.push({ href: "/admin/audit-dashboard", icon: "security", label: "Audit", section: "Compliance" });
    navItems.push({ href: "/admin/editorial/audit", icon: "history", label: "Audit Log" });
  }

  if (isAdmin) {
    navItems.push({ href: "/admin/users", icon: "group", label: "Users", section: "Admin" });
    navItems.push({ href: "/admin/developers", icon: "api", label: "Developers" });
    navItems.push({ href: "/admin/roles", icon: "admin_panel_settings", label: "Roles" });
    navItems.push({ href: "/admin/notifications", icon: "campaign", label: "Push Blast" });
    navItems.push({ href: "/admin/system", icon: "settings", label: "System" });
  }

  let lastSection: string | undefined = undefined;
  const displayName = v2User?.name ?? user?.name ?? "User";
  const displayRole = v2User?.roles?.map(r => r.name).join(", ") ?? (user?.is_admin ? "Administrator" : "Staff");

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-screen w-[280px] z-50
        bg-white dark:bg-zinc-950
        border-r border-zinc-200 dark:border-zinc-800
        flex flex-col p-5
        transition-transform duration-200 ease-in-out
        lg:translate-x-0 overflow-y-auto
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-2 text-zinc-900 dark:text-white">
            <span className="material-symbols-outlined text-[20px]">newsmode</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide">DailyNewsHub</h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {isAdmin ? "Admin Console" : "Newsroom"}
            </p>
          </div>
        </div>

        {/* User card */}
        {(user || v2User) && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 p-3.5 space-y-1.5 mb-5">
            <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{displayName}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide truncate">{displayRole}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : item.href === "/admin/editorial"
                ? pathname === "/admin/editorial"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;

            return (
              <div key={item.href + idx}>
                {showSection && (
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 pt-4 pb-1.5">
                    {item.section}
                  </p>
                )}
                <Link
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
