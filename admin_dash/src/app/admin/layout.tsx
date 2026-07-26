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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (isLoginPage) {
    return <main className="min-h-screen flex flex-col flex-1 bg-surface">{children}</main>;
  }

  return (
    <AuthGuard>
      <SideNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopNav onMenuToggle={() => setSidebarOpen(v => !v)} />
      <MainWrapper>{children}</MainWrapper>
    </AuthGuard>
  );
}
