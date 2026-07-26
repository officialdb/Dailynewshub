"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TopNav({ onMobileToggle }: { onMobileToggle?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Don't render topnav on landing or login page
  if (pathname === "/" || pathname === "/login") return null;

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Overview & Analytics";
    if (pathname.startsWith("/articles/new")) return "Create New Article";
    if (pathname.startsWith("/articles/edit")) return "Edit Article";
    if (pathname.startsWith("/articles")) return "Article Management";
    if (pathname.startsWith("/reels")) return "Reels Management";
    if (pathname.startsWith("/users")) return "User Management & Powers";
    if (pathname.startsWith("/notifications")) return "Push Notifications Hub";
    return pathname.split("/").filter(Boolean).join(" / ");
  };

  return (
    <header className="fixed top-0 right-0 h-16 bg-surface-container-lowest flex justify-between items-center px-4 md:px-8 lg:ml-[280px] w-full lg:w-[calc(100%-280px)] shadow-sm z-30 border-b border-outline-variant">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileToggle}
          className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-surface-container-high focus:outline-none"
          aria-label="Open Navigation"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <h2 className="font-bold text-lg md:text-xl text-slate-900 capitalize tracking-tight">
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-surface-container/70 border border-outline-variant/60 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {user?.name?.slice(0, 2).toUpperCase() ?? "AD"}
          </div>
          <span className="text-sm font-bold text-slate-900 hidden sm:inline">{user?.name ?? "Admin"}</span>
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold uppercase rounded">
            Admin
          </span>
        </div>
      </div>
    </header>
  );
}
