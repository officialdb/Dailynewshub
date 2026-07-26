"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/admin", icon: "analytics", label: "Overview" },
  { href: "/admin/articles", icon: "article", label: "Articles" },
  { href: "/admin/users", icon: "group", label: "Users" },
  { href: "/admin/categories", icon: "category", label: "Categories" },
  { href: "/admin/reels", icon: "movie", label: "Reels" },
  { href: "/admin/notifications", icon: "notifications", label: "Notifications" },
  { href: "/admin/comments", icon: "forum", label: "Comments" },
];

export function useSidebar() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, toggle: () => setOpen(v => !v) };
}

export default function SideNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  useEffect(() => { onClose(); }, [pathname]);

  if (pathname === "/admin/login") return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-[280px] z-50
        bg-surface-container-lowest border-r border-outline-variant
        flex flex-col py-6 px-4
        transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="mb-8 px-3">
          <h1 className="text-[22px] font-bold text-primary tracking-tight leading-tight">DailyNewsHub</h1>
          <p className="text-[13px] font-medium text-on-surface-variant mt-0.5">Admin Console</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 500" } : {}}
                >
                  {item.icon}
                </span>
                <span className={`text-[14px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="font-semibold text-[13px] text-on-surface leading-tight truncate">{user.name}</p>
                <p className="text-[11px] text-on-surface-variant truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-[14px] font-medium">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
