"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname === "/admin/login") return null;

  const title = pathname === "/admin"
    ? "Overview"
    : pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" / ");

  return (
    <header className="fixed top-0 right-0 h-14 lg:h-16 bg-surface-container-lowest flex items-center px-4 lg:px-8 ml-0 lg:ml-[280px] w-full lg:w-[calc(100%-280px)] z-30 border-b border-outline-variant">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
        aria-label="Toggle menu"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>

      <h2 className="text-[18px] lg:text-[20px] font-semibold text-on-surface ml-2 lg:ml-0 flex-1 truncate">
        {title}
      </h2>

      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-container rounded-lg">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
          {user?.name?.slice(0, 2).toUpperCase() ?? "AD"}
        </div>
        <span className="text-[13px] font-semibold text-on-surface hidden sm:inline">{user?.name ?? "Admin"}</span>
      </div>
    </header>
  );
}
