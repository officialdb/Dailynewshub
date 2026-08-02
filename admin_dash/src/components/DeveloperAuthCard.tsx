"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { developerAuthApi, setDeveloperTokens } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

type Mode = "login" | "register";

interface DeveloperAuthCardProps {
  initialMode?: Mode;
  redirectTo?: string;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
      {children}
    </label>
  );
}

export default function DeveloperAuthCard({ initialMode = "login", redirectTo = "/developer/dashboard" }: DeveloperAuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [whatAreYouBuilding, setWhatAreYouBuilding] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordLengthOk = password.length >= 8;
  const passwordUpperOk = /[A-Z]/.test(password);
  const passwordNumberOk = /[0-9]/.test(password);
  const passwordSpecialOk = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "register") {
      if (name.trim().length < 2) {
        setError("Enter your full name.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (!passwordUpperOk || !passwordNumberOk || !passwordSpecialOk) {
        setError("Password must contain an uppercase letter, a number, and a special character.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "register") {
        await developerAuthApi.register({
          name: name.trim(),
          email: email.trim(),
          password,
          company_name: companyName.trim() || null,
          website: website.trim() || null,
          what_are_you_building: whatAreYouBuilding.trim() || null,
        });
        setSuccess("Account created. Check your email to verify the account, then sign in.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const response = await developerAuthApi.login({ email: email.trim(), password });
      // --- SEC FIX SEC-007 ---
      setDeveloperTokens();
      localStorage.setItem("developer_user", JSON.stringify(response.data.developer));
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-[#09090b] shadow-2xl shadow-black/30">
      <div className="border-b border-zinc-800 p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">
          <span className="material-symbols-outlined text-[16px]">terminal</span>
          Developer Platform
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          {mode === "register" ? "Create your developer account" : "Sign in to your developer dashboard"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {mode === "register"
            ? "Register once, verify your email, then manage apps, keys, and usage."
            : "Use your developer credentials to access the API platform."}
        </p>
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex rounded-2xl bg-zinc-950 border border-zinc-800 p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
            className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === "login" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
            className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === "register" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <div>
                <FieldLabel htmlFor="name">Full name</FieldLabel>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/50"
                  placeholder="Ada Lovelace"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="companyName">Company</FieldLabel>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/50"
                    placeholder="Acme Labs"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="website">Website</FieldLabel>
                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/50"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="whatAreYouBuilding">What are you building?</FieldLabel>
                <textarea
                  id="whatAreYouBuilding"
                  value={whatAreYouBuilding}
                  onChange={(e) => setWhatAreYouBuilding(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/50"
                  placeholder="A news aggregator, a mobile app, a newsroom tool..."
                />
              </div>
            </>
          )}

          <div>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/50"
              placeholder="developer@example.com"
            />
          </div>

          <div>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 pl-4 pr-12 py-3 text-sm text-white outline-none transition focus:border-white/50"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {mode === "register" && password.length > 0 && (
              <div className="mt-2 rounded-2xl border border-zinc-800 bg-black/30 p-3 text-[11px] text-zinc-400">
                <p className="mb-2 font-semibold uppercase tracking-wider text-zinc-500">Password rules</p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  <li className={passwordLengthOk ? "text-emerald-400" : ""}>At least 8 characters</li>
                  <li className={passwordUpperOk ? "text-emerald-400" : ""}>One uppercase letter</li>
                  <li className={passwordNumberOk ? "text-emerald-400" : ""}>One number</li>
                  <li className={passwordSpecialOk ? "text-emerald-400" : ""}>One special character</li>
                </ul>
              </div>
            )}
          </div>

          {mode === "register" && (
            <div>
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 pl-4 pr-12 py-3 text-sm text-white outline-none transition focus:border-white/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`mt-2 text-[11px] font-semibold ${passwordsMatch ? "text-emerald-400" : "text-red-300"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "register" && !passwordsMatch)}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                {mode === "register" ? "Creating account..." : "Signing in..."}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  {mode === "register" ? "person_add" : "login"}
                </span>
                {mode === "register" ? "Create account" : "Sign in"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
