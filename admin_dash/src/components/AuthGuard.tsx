"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/** Wraps authenticated pages — redirects to /login if no token. */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // --- SEC FIX SEC-007 ---
  const hasUser = !!user;

  useEffect(() => {
    console.log("[AuthGuard] loading:", loading, "hasUser:", hasUser);
    if (!loading && !hasUser) {
      console.log("[AuthGuard] Redirecting to login");
      router.replace("/admin/login");
    }
  }, [hasUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (!hasUser) return null;

  return <>{children}</>;
}
