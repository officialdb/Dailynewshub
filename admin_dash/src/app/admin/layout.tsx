"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import SideNav from "@/components/SideNav";
import TopNav from "@/components/TopNav";
import MainWrapper from "@/components/MainWrapper";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const isDeveloperDashboard = pathname === "/admin/api-dashboard";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (isLoginPage || isDeveloperDashboard) {
    return <main className="min-h-screen flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">{children}</main>;
  }

  return (
    <AuthGuard>
      <SideNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopNav onMenuToggle={() => setSidebarOpen(v => !v)} />
      <MainWrapper>{children}</MainWrapper>
    </AuthGuard>
  );
}
