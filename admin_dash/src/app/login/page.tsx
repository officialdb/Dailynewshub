"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight mb-1">DailyNewsHub</h1>
          <p className="text-body-md text-secondary">Admin Console</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-lg">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Welcome back</h2>
          <p className="text-body-md text-secondary mb-8">Sign in to your admin account to continue.</p>

          {error && (
            <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-sm">
              <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-label-md text-on-surface-variant mb-2">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-outline-variant rounded-xl px-4 py-3 bg-surface-bright text-body-md focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-label-md text-on-surface-variant mb-2">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-outline-variant rounded-xl px-4 py-3 bg-surface-bright text-body-md focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-on-primary font-label-md rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-label-sm text-secondary mt-6">
          Daily News Hub · Admin Console · v1.0
        </p>
      </div>
    </div>
  );
}
