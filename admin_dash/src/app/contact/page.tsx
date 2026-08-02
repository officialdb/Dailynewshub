"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("api_support");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
    }, 1000);
  }

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
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">Contact Us</span>
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

      {/* Hero Section */}
      <section className="py-16 sm:py-24 bg-[#050608] border-b border-zinc-800/80">
        <div data-aos="fade-up" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-300">
            <i className="fa fa-envelope-o text-white"></i>
            <span>24/7 SUPPORT & INQUIRIES</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            We&apos;d Love to <span className="text-zinc-400">Hear From You</span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Have questions about our News API, Enterprise plans, press inquiries, or technical support? Our team is standing by to help.
          </p>
        </div>
      </section>

      {/* Contact Hub: Info + Interactive Form */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Direct Info Cards */}
          <div data-aos="fade-right" className="lg:col-span-5 space-y-6 text-left">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Direct Communication Channels</h2>
              <p className="text-xs text-zinc-400 mt-1">Reach out directly to specialized teams for rapid responses.</p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                  <i className="fa fa-code"></i>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Developer & API Support</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Rate limits, endpoint configuration & SDK assistance.</p>
                  <a href="mailto:api-support@dailynewshub.com" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold mt-2 inline-block">
                    api-support@dailynewshub.com &rarr;
                  </a>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                  <i className="fa fa-building-o"></i>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Enterprise Sales & Licensing</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Custom data volumes, guaranteed SLAs & dedicated servers.</p>
                  <a href="mailto:enterprise@dailynewshub.com" className="text-xs text-blue-400 hover:text-blue-300 font-semibold mt-2 inline-block">
                    enterprise@dailynewshub.com &rarr;
                  </a>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                  <i className="fa fa-newspaper-o"></i>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Press & Media Inquiries</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Interviews, media kits, and corporate news releases.</p>
                  <a href="mailto:press@dailynewshub.com" className="text-xs text-purple-400 hover:text-purple-300 font-semibold mt-2 inline-block">
                    press@dailynewshub.com &rarr;
                  </a>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                  <i className="fa fa-map-marker"></i>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Global Headquarters</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">San Francisco, CA & Lagos, Nigeria</p>
                  <span className="text-[11px] text-zinc-500 font-mono mt-1 block">Active operations 24/7/365</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Form */}
          <div data-aos="fade-left" className="lg:col-span-7">
            <div className="bg-[#09090b] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-left">
              {formSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 text-2xl mx-auto">
                    <i className="fa fa-check"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Message Received!</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out. A representative from our team will respond to <span className="text-zinc-200 font-semibold">{email}</span> within 2 hours.
                  </p>
                  <button
                    onClick={() => { setFormSubmitted(false); setName(""); setEmail(""); setMessage(""); }}
                    className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Send Us a Message</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Fill out the form below and we will get back to you promptly.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full bg-black border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Work Email *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@acme.io"
                        className="w-full bg-black border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Inquiry Topic</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                    >
                      <option value="api_support">Developer API Support & Key Questions</option>
                      <option value="enterprise">Enterprise Custom Volume & SLA</option>
                      <option value="press">Press & Media Contact</option>
                      <option value="publisher">Publisher Data Ingestion</option>
                      <option value="other">General Feedback / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">Your Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your project requirements or technical question..."
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <i className="fa fa-circle-o-notch fa-spin"></i>
                        Sending Message…
                      </>
                    ) : (
                      <>
                        <i className="fa fa-paper-plane"></i>
                        Submit Inquiry &rarr;
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div data-aos="fade-up" className="text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-zinc-400 mt-2 text-xs sm:text-base">Quick answers to common developer & reader inquiries.</p>
          </div>

          <div className="space-y-4 text-left">
            <div data-aos="fade-up" data-aos-delay="100" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-2">
              <h3 className="font-bold text-white text-sm">How fast can I get an API Key?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Instantly! Sign up via our <Link href="/developer/register" className="text-emerald-400 hover:underline font-semibold">Developer Registration Page</Link> and your free API key will be issued immediately with 10,000 monthly requests included.
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="200" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-2">
              <h3 className="font-bold text-white text-sm">What region and category filters are available?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You can filter articles by category (AI & Tech, Markets, Clean Energy, Global Affairs, Cyber) and regional focus (including Nigerian regional feeds and global coverage).
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="300" className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-2">
              <h3 className="font-bold text-white text-sm">Do you offer 99.99% SLA guarantees for commercial platforms?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Yes. Our Pro and Enterprise tiers feature dedicated uptime guarantees, high-rate limits, and direct priority support channels.
              </p>
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
