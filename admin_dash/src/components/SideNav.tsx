"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/", icon: "analytics", label: "Overview" },
  { href: "/articles", icon: "article", label: "Articles" },
  { href: "/users", icon: "group", label: "Users" },
];

export default function SideNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Don't render sidebar on login page
  if (pathname === "/login") return null;

  return (
    <aside className="w-[280px] h-full fixed left-0 top-0 bg-surface dark:bg-inverse-surface border-r border-outline-variant dark:border-outline flex flex-col py-stack-lg px-stack-md z-50">
      <div className="mb-10 px-4">
        <h1 className="font-headline-lg text-headline-lg text-primary dark:text-inverse-primary tracking-tight">DailyNewsHub</h1>
        <p className="font-label-md text-label-md text-secondary opacity-70">Admin Console</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${
                isActive
                  ? "bg-primary-container/20 text-primary font-bold"
                  : "text-secondary hover:bg-surface-container-high"
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? "FILL" : ""}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
              <span className="font-body-md text-body-md">{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"></span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="mt-auto pt-4 border-t border-outline-variant space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-9 h-9 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="font-bold text-sm text-on-surface leading-none truncate">{user.name}</p>
              <p className="text-[11px] text-secondary truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-secondary hover:bg-error-container/10 hover:text-error transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-body-md text-body-md">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
