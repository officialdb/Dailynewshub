"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import SideNav from "@/components/SideNav";
import TopNav from "@/components/TopNav";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStandalonePage = pathname === "/" || pathname === "/login";

  if (isStandalonePage) {
    return <main className="min-h-screen flex flex-col flex-1 bg-surface">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-slate-900">
      <SideNav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <TopNav onMobileToggle={() => setMobileOpen(prev => !prev)} />
      <main className="lg:ml-[280px] pt-16 min-h-screen flex flex-col flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
