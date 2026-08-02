"use client";

import { useState } from "react";
import Link from "next/link";

export default function DeveloperPortalPage() {
  const [activeTab, setActiveTab] = useState<"curl" | "python" | "javascript">("curl");

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/95 border-b border-zinc-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg shrink-0">
              <i className="fa fa-newspaper-o text-white text-sm sm:text-lg"></i>
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-xl tracking-tight text-white flex items-center gap-1">
                DailyNews<span className="text-zinc-400">Hub</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">Developer Platform</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">Features</Link>
            <Link href="/#live-feed" className="hover:text-white transition-colors">Headlines</Link>
            <Link href="/developer" className="text-white font-bold transition-colors">For Developers</Link>
            <a href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Get App</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/developer/login"
              className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
            >
              Sign In
            </Link>
            <Link
              href="/docs"
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
            >
              <i className="fa fa-book mr-1.5"></i>API Docs
            </Link>
            <Link
              href="/developer/register"
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Get API Key →
            </Link>
          </div>
        </div>
      </header>      {/* Hero Section */}
      <section className="py-16 sm:py-24 bg-[#050608] border-b border-zinc-800/80">
        <div data-aos="fade-up" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-300">
            <i className="fa fa-terminal text-white"></i>
            <span>DAILYNEWSHUB REST API PLATFORM</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Power Your Applications With <br />
            <span className="text-zinc-400">Real-Time Global News & AI Summaries</span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-xl max-w-3xl mx-auto leading-relaxed">
            Access breaking news, AI executive summaries, trending stories, and category feeds through a high-performance REST API. Trusted data with comprehensive Nigerian and global coverage.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/developer/register"
              className="px-7 py-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer"
            >
              Get Free API Key →
            </Link>
            <Link
              href="/docs"
              className="px-7 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200"
            >
              Explore API Documentation
            </Link>
          </div>

          {/* Tier Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2">API Tiers:</span>
            <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-emerald-400">Free (10k requests/mo)</span>
            <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-blue-400">Starter</span>
            <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-purple-400">Pro</span>
            <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-amber-400">Enterprise</span>
          </div>
        </div>
      </section>

      {/* Interactive Code Snippets Section */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div data-aos="fade-up" className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Simple REST Integration</h2>
          <p className="text-zinc-400 mt-2 text-xs sm:text-base">Fetch live news articles in under 5 minutes with our clean SDKs and endpoints.</p>
        </div>

        <div data-aos="zoom-in" className="max-w-4xl mx-auto rounded-2xl bg-[#09090b] border border-zinc-800 shadow-2xl overflow-hidden">
          {/* Tab Selector */}
          <div className="flex border-b border-zinc-800 bg-zinc-950 px-4 pt-3 gap-2">
            <button
              onClick={() => setActiveTab("curl")}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer ${
                activeTab === "curl" ? "bg-[#09090b] text-white border-t border-x border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setActiveTab("python")}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer ${
                activeTab === "python" ? "bg-[#09090b] text-white border-t border-x border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setActiveTab("javascript")}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer ${
                activeTab === "javascript" ? "bg-[#09090b] text-white border-t border-x border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Node.js / JS
            </button>
          </div>

          <div className="p-6 font-mono text-xs text-left overflow-x-auto">
            {activeTab === "curl" && (
              <pre className="text-zinc-300 leading-relaxed">{`curl -X GET "https://api.dailynewshub.com/api/v2/public/articles?category=trending&country=ng" \\
  -H "X-API-Key: dnh_live_9f823a7b4c..." \\
  -H "Content-Type: application/json"`}</pre>
            )}
            {activeTab === "python" && (
              <pre className="text-zinc-300 leading-relaxed">{`import requests

headers = {
    "X-API-Key": "dnh_live_9f823a7b4c...",
    "Content-Type": "application/json"
}

response = requests.get(
    "https://api.dailynewshub.com/api/v2/public/articles",
    params={"category": "trending", "country": "ng"},
    headers=headers
)

articles = response.json()["data"]["items"]
print(f"Retrieved {len(articles)} articles with AI summaries.")`}</pre>
            )}
            {activeTab === "javascript" && (
              <pre className="text-zinc-300 leading-relaxed">{`const response = await fetch("https://api.dailynewshub.com/api/v2/public/articles?category=trending&country=ng", {
  headers: {
    "X-API-Key": "dnh_live_9f823a7b4c...",
    "Content-Type": "application/json"
  }
});

const { data } = await response.json();
console.log("Top headlines:", data.items);`}</pre>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section className="py-16 sm:py-24 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-aos="fade-up" className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Developer API Plans</h2>
            <p className="text-zinc-400 mt-2 text-xs sm:text-base">Start free and scale seamlessly as your application traffic grows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Free Tier */}
            <div data-aos="fade-up" data-aos-delay="100" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Free</span>
                <p className="text-3xl font-extrabold text-white mt-2">$0 <span className="text-xs font-normal text-zinc-500">/ mo</span></p>
                <p className="text-xs text-zinc-400 mt-2">Perfect for prototyping and small side projects.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>10,000 requests/mo</li>
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>AI Bullet Summaries</li>
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>Standard Rate Limit (60/min)</li>
                </ul>
              </div>
              <Link href="/developer/register" className="mt-8 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs text-center transition-colors">
                Get Free Key
              </Link>
            </div>

            {/* Starter Tier */}
            <div data-aos="fade-up" data-aos-delay="200" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Starter</span>
                <p className="text-3xl font-extrabold text-white mt-2">$29 <span className="text-xs font-normal text-zinc-500">/ mo</span></p>
                <p className="text-xs text-zinc-400 mt-2">For growing mobile apps and specialized niche news portals.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>250,000 requests/mo</li>
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>Full Text & Media URLs</li>
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>Elevated Rate Limits</li>
                </ul>
              </div>
              <Link href="/developer/register" className="mt-8 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs text-center transition-colors">
                Start 14-Day Trial
              </Link>
            </div>

            {/* Pro Tier */}
            <div data-aos="fade-up" data-aos-delay="300" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-700 flex flex-col justify-between relative">
              <span className="absolute -top-3 right-6 text-[9px] font-bold bg-white text-black px-2 py-0.5 rounded-full uppercase tracking-wider">Popular</span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Pro</span>
                <p className="text-3xl font-extrabold text-white mt-2">$99 <span className="text-xs font-normal text-zinc-500">/ mo</span></p>
                <p className="text-xs text-zinc-400 mt-2">For high-traffic news platforms & financial aggregators.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>2,000,000 requests/mo</li>
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>Real-time Webhook Stream</li>
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>Priority Email & Chat Support</li>
                </ul>
              </div>
              <Link href="/developer/register" className="mt-8 w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs text-center transition-colors">
                Upgrade to Pro
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div data-aos="fade-up" data-aos-delay="400" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Enterprise</span>
                <p className="text-3xl font-extrabold text-white mt-2">Custom</p>
                <p className="text-xs text-zinc-400 mt-2">For global enterprise platforms requiring dedicated infrastructure.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>Unlimited Volume</li>
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>99.99% Guaranteed SLA</li>
                  <li className="flex items-center gap-2"><i className="fa fa-check text-emerald-400"></i>Dedicated Account Manager</li>
                </ul>
              </div>
              <Link href="/contact" className="mt-8 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs text-center transition-colors">
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 sm:py-16 bg-black border-t border-zinc-900 text-zinc-400 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-zinc-900 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                  <i className="fa fa-newspaper-o text-sm"></i>
                </div>
                <span className="font-bold text-white text-base">DailyNewsHub</span>
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
                Real-time AI news intelligence and global REST API platform for developers, enterprise apps, and modern readers.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3.5">Product</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><a href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Get App</a></li>
                <li><Link href="/#reviews" className="hover:text-white transition-colors">Reviews</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3.5">Developers</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/docs" className="hover:text-white transition-colors">API Docs</Link></li>
                <li><Link href="/developer/status" className="hover:text-white transition-colors">API Status</Link></li>
                <li><Link href="/developer" className="hover:text-white transition-colors">Developer Portal</Link></li>
                <li><Link href="/developer/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3.5">Company</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <p>© {new Date().getFullYear()} DailyNewsHub Inc. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All Systems Operational</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
