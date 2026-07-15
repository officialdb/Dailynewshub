"use client";

import { usePathname } from "next/navigation";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <main className={isLogin ? "min-h-screen flex flex-col flex-1" : "ml-[280px] pt-16 min-h-screen flex flex-col flex-1"}>
      {children}
    </main>
  );
}
