"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TopNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname === "/login") return null;

  return (
    <header className="fixed top-0 right-0 h-16 bg-surface-container-lowest flex justify-between items-center px-margin ml-[280px] w-[calc(100%-280px)] shadow-sm z-40 border-b border-outline-variant">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="font-headline-md text-headline-md text-on-surface hidden md:block capitalize">
          {pathname === "/" ? "Overview" : pathname.split("/").filter(Boolean).join(" / ")}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg">
          <div className="w-6 h-6 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-xs">
            {user?.name?.slice(0, 2).toUpperCase() ?? "AD"}
          </div>
          <span className="text-label-md font-bold text-on-surface">{user?.name ?? "Admin"}</span>
        </div>
      </div>
    </header>
  );
}

