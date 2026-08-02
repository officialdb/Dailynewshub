"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ArticlesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/editorial/articles");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-secondary text-sm">Redirecting to Articles…</p>
    </div>
  );
}
