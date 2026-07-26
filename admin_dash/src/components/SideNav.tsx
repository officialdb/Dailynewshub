"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard", icon: "analytics", label: "Overview" },
  { href: "/articles", icon: "article", label: "Articles" },
  { href: "/reels", icon: "video_library", label: "Reels" },
  { href: "/notifications", icon: "notifications", label: "Push Notifications" },
  { href: "/users", icon: "group", label: "Users" },
  { href: "/", icon: "home", label: "Landing Home" },
];

export default function SideNav({ mobileOpen, setMobileOpen }: { mobileOpen?: boolean; setMobileOpen?: (open: boolean) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Don't render sidebar on landing or login page
  if (pathname === "/" || pathname === "/login") return null;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`w-[280px] h-full fixed left-0 top-0 bg-surface dark:bg-inverse-surface border-r border-outline-variant dark:border-outline flex flex-col py-6 px-4 z-50 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 px-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl text-primary dark:text-inverse-primary tracking-tight">DailyNewsHub</h1>
            <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">Admin Console</p>
          </div>
          {setMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map(item => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen?.(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-150 ${
                  isActive
                    ? "bg-primary-container/20 text-primary font-bold shadow-sm"
                    : "text-slate-700 hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] ${isActive ? "FILL" : ""}`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="mt-auto pt-4 border-t border-outline-variant space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 bg-surface-container/50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-primary-container/30 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{user.name}</p>
                <p className="text-xs font-medium text-slate-600 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-error-container/20 hover:text-error transition-colors cursor-pointer font-medium text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
