"use client";

import { useState } from "react";
import Link from "next/link";

const endpointGroups = [
  {
    title: "News and articles API",
    endpoints: [
      { method: "GET", path: "/api/v2/public/articles", description: "List published articles with pagination." },
      { method: "GET", path: "/api/v2/public/articles/{article_id}", description: "Fetch a single published article." },
      { method: "GET", path: "/api/v2/public/articles/search?q=...", description: "Search published articles." },
      { method: "GET", path: "/api/v2/public/articles/trending", description: "Fetch the most viewed recent articles." },
      { method: "GET", path: "/api/v2/public/categories", description: "List all categories." },
    ],
  },
];

const errorCodes = [
  ["MISSING_API_KEY", "401", "No X-API-Key header was supplied."],
  ["INVALID_API_KEY", "401", "The provided API key does not match any active key."],
  ["REVOKED_API_KEY", "401", "The key was deactivated."],
  ["EXPIRED_API_KEY", "401", "The key is past its expiry date."],
  ["RATE_LIMIT_EXCEEDED", "429", "The daily limit for the key has been reached."],
  ["TIER_INSUFFICIENT", "403", "The endpoint requires a higher tier."],
  ["NOT_FOUND", "404", "The requested resource does not exist."],
  ["VALIDATION_ERROR", "422", "The request payload failed validation."],
  ["INTERNAL_ERROR", "500", "Unexpected server error."],
];

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300">{children}</pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(children);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-3 top-3 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-white">
              <span className="material-symbols-outlined text-[18px]">newspaper</span>
            </div>
            <div>
              <p className="text-base font-extrabold tracking-tight text-white">DailyNewsHub API</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Developer documentation</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Link href="/developer" className="hover:text-white transition-colors">Developer portal</Link>
            <Link href="/developer/register" className="hover:text-white transition-colors">Get access</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-12 rounded-3xl border border-zinc-800 bg-[#09090b] p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            API key content API
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Build with DailyNewsHub content
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-400 sm:text-base">
            Use your API key to fetch published news articles, search the archive, retrieve trending stories, and list content categories.
          </p>
        </section>

        <section className="mb-12 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-[#09090b] p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Authentication</h2>
            <p className="mt-3 text-sm text-zinc-400">
              Public news endpoints require an API key in the <code className="rounded bg-zinc-950 px-1.5 py-0.5 text-xs text-white">X-API-Key</code> header.
            </p>
            <CodeBlock>{`curl -H "X-API-Key: dnh_live_your_key_here" \\
  /api/v2/public/articles`}</CodeBlock>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-[#09090b] p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Base URL</h2>
            <p className="mt-3 text-sm text-zinc-400">All routes are mounted beneath:</p>
            <CodeBlock>{`/api/v2`}</CodeBlock>
          </div>
        </section>

        {endpointGroups.map((group) => (
          <section key={group.title} className="mb-12">
            <h2 className="mb-4 text-lg font-bold text-white">{group.title}</h2>
            <div className="space-y-3">
              {group.endpoints.map((endpoint) => (
                <div key={`${endpoint.method}:${endpoint.path}`} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-[#09090b] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-emerald-900/60 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                      {endpoint.method}
                    </span>
                    <code className="font-mono text-xs text-white">{endpoint.path}</code>
                  </div>
                  <p className="text-xs text-zinc-500">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="mb-12 rounded-3xl border border-zinc-800 bg-[#09090b] p-6">
          <h2 className="text-lg font-bold text-white">Response shape</h2>
          <p className="mt-2 text-sm text-zinc-400">These endpoints return a consistent JSON envelope.</p>
          <div className="mt-4">
            <CodeBlock>{`{
  "success": true,
  "message": "Articles retrieved",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}`}</CodeBlock>
          </div>
        </section>

        <section className="mb-12 rounded-3xl border border-zinc-800 bg-[#09090b] p-6">
          <h2 className="text-lg font-bold text-white">Error codes</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">HTTP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {errorCodes.map(([code, http, description]) => (
                  <tr key={code}>
                    <td className="px-4 py-3 font-mono text-xs text-white">{code}</td>
                    <td className="px-4 py-3 text-zinc-300">{http}</td>
                    <td className="px-4 py-3 text-zinc-400">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="border-t border-zinc-800 pt-6 text-center text-sm text-zinc-500">
          Daily News Hub API v2 · {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
