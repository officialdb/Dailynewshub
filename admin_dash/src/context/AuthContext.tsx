"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v2AuthApi, clearTokens } from "@/lib/api";
import type { User, V2User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  v2User: V2User | null;
  token: string | null;
  loading: boolean;
  roles: string[];
  isAdmin: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (perm: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [v2User, setV2User] = useState<V2User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const roles = v2User?.roles?.map(r => r.name) ?? [];
  const isAdmin = user?.is_admin ?? v2User?.is_admin ?? false;

  const hasRole = useCallback((role: string) => {
    if (isAdmin) return true;
    return roles.includes(role);
  }, [isAdmin, roles]);

  const hasPermission = useCallback((perm: string) => {
    if (isAdmin) return true;
    // Walk through all roles and their permissions
    if (v2User?.roles) {
      for (const role of v2User.roles) {
        if ((role as any).permissions) {
          for (const rp of (role as any).permissions) {
            const permName = rp?.permission?.name ?? rp?.name ?? rp;
            if (permName === perm) return true;
          }
        }
      }
    }
    return false;
  }, [isAdmin, v2User]);

  // --- SEC FIX SEC-007 ---
  // Restore session by asking the API to validate the httpOnly cookie.
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await v2AuthApi.me();
        if (cancelled) return;
        const v2u = response.data;
        setV2User(v2u);
        setToken("cookie-session");
        setUser({
          id: v2u.id,
          name: v2u.name,
          email: v2u.email,
          avatar_url: v2u.avatar_url,
          is_active: v2u.is_active,
          is_admin: v2u.is_admin,
          created_at: v2u.created_at,
          updated_at: v2u.updated_at,
        });
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setV2User(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-logout when token expires
  useEffect(() => {
    function handleTokenExpired() {
      clearTokens();
      setToken(null);
      setUser(null);
      setV2User(null);
      router.push("/admin/login");
    }
    window.addEventListener("auth:token-expired", handleTokenExpired);
    return () => window.removeEventListener("auth:token-expired", handleTokenExpired);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    console.log("[AuthContext] Attempting v2 login...");
    const v2Res = await v2AuthApi.login(email, password);
    console.log("[AuthContext] v2 login response:", v2Res);
    // --- SEC FIX SEC-007 ---
    const { user: v2u } = v2Res.data;
    setToken("cookie-session");
    setV2User(v2u);

    // Mirror v2 user into the v1 User shape for backward compat
    const v1User: User = {
      id: v2u.id,
      name: v2u.name,
      email: v2u.email,
      avatar_url: v2u.avatar_url,
      is_active: v2u.is_active,
      is_admin: v2u.is_admin,
      created_at: v2u.created_at,
      updated_at: v2u.updated_at,
    };
    setUser(v1User);

    // Redirect based on role
    const isAdminUser = v2u.is_admin ?? false;
    const roleNames = v2u.roles?.map((r: any) => r.name) ?? [];
    const isEditorialUser = roleNames.some((r: string) =>
      ["reporter", "fact_checker", "validator", "chief_editor", "publisher", "auditor"].includes(r)
    );

    if (isAdminUser) {
      router.push("/admin");
    } else if (isEditorialUser) {
      router.push("/admin/editorial");
    } else {
      router.push("/admin/editorial");
    }
  }, [router]);

  const logout = useCallback(async () => {
    try { await v2AuthApi.logout(); } catch {}
    clearTokens();
    setToken(null);
    setUser(null);
    setV2User(null);
    router.push("/admin/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, v2User, token, loading, roles, isAdmin, hasRole, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
