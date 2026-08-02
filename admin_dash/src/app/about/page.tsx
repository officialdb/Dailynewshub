"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/95 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <i className="fa fa-newspaper-o text-sm"></i>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
                DailyNews<span className="text-zinc-400">Hub</span>
              </span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">About Us</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">Features</Link>
            <Link href="/#live-feed" className="hover:text-white transition-colors">Headlines</Link>
            <Link href="/developer" className="hover:text-white transition-colors">For Developers</Link>
            <a href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Get App</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/developer/register" className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95">
              Get API Key →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="py-16 sm:py-24 bg-[#050608] border-b border-zinc-800/80">
        <div data-aos="fade-up" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-300">
            <i className="fa fa-globe text-white"></i>
            <span>OUR MISSION & VISION</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Empowering Readers & Developers With <br />
            <span className="text-zinc-400">Real-Time AI News Intelligence</span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-xl max-w-3xl mx-auto leading-relaxed">
            DailyNewsHub is building the world&apos;s most reliable, distraction-free news reader and real-time REST API platform, delivering 30-second AI executive summaries and multi-source verification.
          </p>

          {/* Stat Counters Grid */}
          <div data-aos="zoom-in" data-aos-delay="150" className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-4xl mx-auto text-left">
            <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl">
              <p className="text-3xl font-extrabold text-white">2.4M+</p>
              <p className="text-xs text-zinc-400 mt-1">Active Monthly Readers</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl">
              <p className="text-3xl font-extrabold text-emerald-400">&lt; 50ms</p>
              <p className="text-xs text-zinc-400 mt-1">Global REST API Latency</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl">
              <p className="text-3xl font-extrabold text-white">120+</p>
              <p className="text-xs text-zinc-400 mt-1">Verified News Sources</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl">
              <p className="text-3xl font-extrabold text-blue-400">99.99%</p>
              <p className="text-xs text-zinc-400 mt-1">Platform Uptime SLA</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars / Value Props */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div data-aos="fade-up" className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">What Sets Us Apart</h2>
          <p className="text-zinc-400 mt-2 text-xs sm:text-base">Designed from the ground up for zero ad clutter, high performance, and developer flexibility.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div data-aos="fade-up" data-aos-delay="100" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white text-lg mb-4">
                <i className="fa fa-magic"></i>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Bullet Summaries</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Our intelligence engine ingests raw news feeds and distills key facts into 30-second executive summaries so readers stay informed without information overload.
              </p>
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="200" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white text-lg mb-4">
                <i className="fa fa-check-circle-o"></i>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Source Verification</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Articles are automatically cross-referenced across trusted publishers globally to reduce bias and eliminate sensationalist clickbait headlines.
              </p>
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="300" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white text-lg mb-4">
                <i className="fa fa-code"></i>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Developer REST API</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Every story, category feed, and AI summary is accessible via ultra-fast REST endpoints built for mobile apps, enterprise platforms, and AI agents.
              </p>
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="400" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white text-lg mb-4">
                <i className="fa fa-map-marker"></i>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Nigerian & Global Coverage</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                In-depth regional reporting covering Nigerian markets, technology, and governance alongside full real-time worldwide intelligence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership & Engineering Section */}
      <section className="py-16 sm:py-24 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-aos="fade-up" className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Built by Engineers & Journalists</h2>
            <p className="text-zinc-400 mt-2 text-xs sm:text-base">Our team combines distributed systems engineering, AI research, and journalism expertise.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div data-aos="fade-up" data-aos-delay="100" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-xl font-bold text-white">
                DR
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Dr. David Rostova</h4>
                <p className="text-xs text-zinc-500">Chief Executive & Founder</p>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Former distributed systems architect specializing in high-throughput data streams.</p>
            </div>

            <div data-aos="fade-up" data-aos-delay="200" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-xl font-bold text-white">
                AO
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Aisha Adebayo</h4>
                <p className="text-xs text-zinc-500">Head of AI & NLP Systems</p>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Leading computational linguistics researcher focused on multi-lingual executive summaries.</p>
            </div>

            <div data-aos="fade-up" data-aos-delay="300" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-xl font-bold text-white">
                MK
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Marcus Vance</h4>
                <p className="text-xs text-zinc-500">Head of API Platform</p>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Overseeing global REST API infrastructure, 99.99% uptime SLAs, and developer relations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-[#050505] border-t border-zinc-800 text-center">
        <div data-aos="zoom-in" className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Ready to Experience DailyNewsHub?</h2>
          <p className="text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto">
            Get breaking news on mobile or power your next application with our low-latency REST API.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/developer/register" className="px-7 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all">
              Get Free API Key →
            </Link>
            <a href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk" target="_blank" rel="noopener noreferrer" className="px-7 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all">
              Download Android APK
            </a>
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
