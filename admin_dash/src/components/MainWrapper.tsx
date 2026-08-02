"use client";

import { usePathname } from "next/navigation";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <main className={isLogin
      ? "min-h-screen flex flex-col flex-1"
      : "ml-0 lg:ml-[280px] pt-[calc(3.5rem+1.5rem)] px-5 pb-8 sm:px-8 min-h-screen flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950"
    }>
      {children}
    </main>
  );
}
