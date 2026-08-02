"use client";

import Link from "next/link";

export default function TermsPage() {
  const lastUpdated = "July 29, 2026";

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      content: `By accessing or using DailyNewsHub (including our mobile application, web platform, REST API, and Developer Portal), you agree to be bound by these Terms of Service ("Terms"). If you are using our services on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.

If you do not agree to these Terms, you must not access or use any part of our services.

We reserve the right to modify these Terms at any time. Continued use of DailyNewsHub after any such changes constitutes your acceptance of the revised Terms. We will notify registered users of material changes via email.`
    },
    {
      id: "api-license",
      title: "2. API License & Permitted Use",
      content: `Subject to your compliance with these Terms and timely payment of applicable fees, DailyNewsHub grants you a limited, non-exclusive, non-transferable, revocable license to access and use our REST API.

**Permitted Uses:**
- Integrating news data into your own applications, products, or services
- Displaying AI-generated summaries with proper attribution to DailyNewsHub
- Building news aggregators, financial data dashboards, and AI research tools
- Internal testing, development, and prototyping

**Prohibited Uses:**
- Re-selling raw API data or republishing article content as your own
- Bypassing rate limits through IP rotation, key sharing, or automated account creation
- Scraping or mirroring our entire article database
- Using the API to train commercial language models without a separate data licensing agreement
- Building services that directly compete with DailyNewsHub core features using our own data`
    },
    {
      id: "api-keys",
      title: "3. API Keys & Account Security",
      content: `Each developer account may generate a limited number of API keys per plan tier. You are solely responsible for:

- Maintaining the confidentiality of your API key(s)
- All API requests made under your credentials, whether authorized or not
- Immediately notifying us at security@dailynewshub.com if you believe your key has been compromised

DailyNewsHub reserves the right to revoke any API key that violates these Terms, exhibits unusual traffic patterns, or is used in a manner inconsistent with the permitted use outlined in Section 2.

Free tier API keys may be rate-limited or suspended during periods of excessive platform load. Commercial tier keys are governed by the SLA commitments in your subscription agreement.`
    },
    {
      id: "content-attribution",
      title: "4. Content, Attribution & Intellectual Property",
      content: `**News Article Content:**
Article content sourced through the DailyNewsHub API originates from third-party publishers and news agencies. You must comply with each publisher's licensing terms when displaying their content. DailyNewsHub provides attribution metadata (source name, URL, publication date) in every API response. You are required to surface this attribution to end users.

**AI Summaries:**
Our AI-generated executive summaries are proprietary content of DailyNewsHub. You may display them within your applications provided that you include attribution ("Summarized by DailyNewsHub AI").

**Platform Trademarks:**
"DailyNewsHub," our logo, and product names are trademarks of DailyNewsHub Inc. You may not use these marks in ways that imply partnership, sponsorship, or endorsement without our express written consent.

**Your Content:**
You retain ownership of any content, code, or applications you build using the API.`
    },
    {
      id: "rate-limits",
      title: "5. Rate Limits & Fair Use",
      content: `API usage is subject to rate limits that vary by tier:

- **Free Tier**: 10,000 requests/month · 60 requests/minute
- **Starter Tier**: 250,000 requests/month · 300 requests/minute  
- **Pro Tier**: 2,000,000 requests/month · 1,200 requests/minute
- **Enterprise Tier**: Custom negotiated limits

Exceeding rate limits will result in HTTP 429 responses. Systematic attempts to circumvent rate limits (key pooling, distributed bypass attempts) are a material breach of these Terms and will result in immediate account suspension without refund.

If your application requires higher limits than your current tier supports, please upgrade your subscription or contact enterprise@dailynewshub.com.`
    },
    {
      id: "payment",
      title: "6. Payment, Billing & Refunds",
      content: `Paid API tiers are billed on a monthly subscription basis. By subscribing to a paid plan, you authorize DailyNewsHub to charge your payment method on a recurring basis.

**Billing Terms:**
- Subscriptions renew automatically at the start of each billing cycle
- Downgrades take effect at the end of the current billing period
- Upgrades are prorated and charged immediately upon plan change

**Refund Policy:**
We offer a 14-day money-back guarantee for first-time paid subscribers only. After 14 days, all payments are non-refundable. Accounts suspended for Terms violations are not eligible for refunds.

**Failed Payments:**
If a payment fails, we will attempt to retry billing 3 times over 7 days. Continued failure will result in plan downgrade to the free tier. Your API data and settings are preserved for 30 days during this grace period.`
    },
    {
      id: "uptime",
      title: "7. Service Availability & SLA",
      content: `DailyNewsHub targets 99.99% monthly API uptime for Pro and Enterprise tier subscribers. Uptime is calculated as:

  Uptime % = ((Total Minutes − Downtime Minutes) / Total Minutes) × 100

**Scheduled Maintenance**: We provide at least 72 hours advance notice for planned maintenance windows. Scheduled maintenance is excluded from downtime calculations.

**SLA Credits**: If monthly uptime falls below 99.99% (Pro) or negotiated SLA (Enterprise), eligible customers may claim service credits as follows:
- 99.0% – 99.99%: 10% credit
- 95.0% – 99.0%: 25% credit
- Below 95.0%: 50% credit

Credits are applied to future invoices only and are not redeemable for cash. The Free and Starter tiers do not have SLA credit guarantees.`
    },
    {
      id: "termination",
      title: "8. Termination & Suspension",
      content: `**Termination by You:**
You may terminate your account at any time by visiting your account dashboard or emailing support@dailynewshub.com. Termination takes effect at the end of your current billing period.

**Termination or Suspension by DailyNewsHub:**
We reserve the right to suspend or terminate your account immediately and without notice if:
- You violate these Terms of Service
- Your API usage threatens the stability, security, or integrity of our platform
- Your account is used for illegal activities or content
- Payment fails and is not resolved within the grace period

Upon termination, your API keys will be invalidated and you will no longer be able to access our services. Sections relating to intellectual property, limitation of liability, and governing law survive termination.`
    },
    {
      id: "liability",
      title: "9. Limitation of Liability",
      content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DAILYNEWSHUB AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:

- Loss of profits, revenue, or data arising from use or inability to use our API
- Accuracy, completeness, or timeliness of news content sourced from third-party publishers
- Actions taken based on news data or AI summaries delivered via our API
- Third-party service interruptions affecting our infrastructure

OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING UNDER THESE TERMS IS LIMITED TO THE AMOUNTS YOU PAID TO DAILYNEWSHUB IN THE THREE (3) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.

Nothing in these Terms limits liability for death, personal injury, fraud, or any other liability that cannot be excluded by law.`
    },
    {
      id: "governing-law",
      title: "10. Governing Law & Disputes",
      content: `These Terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.

**Dispute Resolution:**
Before initiating legal proceedings, you agree to first contact us at legal@dailynewshub.com and attempt to resolve the dispute informally within 30 days.

**Arbitration:**
Any unresolved dispute shall be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. The arbitration shall be conducted in San Francisco, California.

**Class Action Waiver:**
You agree to resolve disputes with DailyNewsHub on an individual basis only, and not as part of any class or representative action.

For users based in Nigeria, disputes may alternatively be resolved through the Lagos Multi-Door Courthouse in accordance with Nigerian arbitration law.`
    }
  ];

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
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">Terms of Service</span>
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

      {/* Hero */}
      <section className="py-16 sm:py-24 bg-[#050608] border-b border-zinc-800/80">
        <div data-aos="fade-up" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-300">
            <i className="fa fa-file-text-o text-white"></i>
            <span>TERMS OF SERVICE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Clear Rules for a <span className="text-zinc-400">Fair Partnership</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            These Terms govern your access to and use of DailyNewsHub&apos;s news reader app, REST API, and developer platform. Please read carefully before building with our data.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><i className="fa fa-calendar-o"></i> Last Updated: {lastUpdated}</span>
            <span className="flex items-center gap-1.5"><i className="fa fa-gavel"></i> Governing Law: California, USA</span>
            <span className="flex items-center gap-1.5"><i className="fa fa-language"></i> Language: English</span>
          </div>

          {/* Quick Highlights */}
          <div data-aos="zoom-in" data-aos-delay="150" className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 max-w-3xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800">
              <i className="fa fa-check-circle text-emerald-400 text-lg mb-2 block"></i>
              <p className="text-[11px] font-bold text-white">14-Day Money Back</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">First-time paid subscribers</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800">
              <i className="fa fa-bar-chart text-blue-400 text-lg mb-2 block"></i>
              <p className="text-[11px] font-bold text-white">99.99% SLA</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Pro & Enterprise plans</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800">
              <i className="fa fa-key text-amber-400 text-lg mb-2 block"></i>
              <p className="text-[11px] font-bold text-white">Instant API Keys</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Free tier, no credit card</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800">
              <i className="fa fa-ban text-red-400 text-lg mb-2 block"></i>
              <p className="text-[11px] font-bold text-white">No Data Reselling</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Raw API data is not re-distributable</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Sticky Sidebar TOC */}
          <aside data-aos="fade-right" className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-28 bg-[#09090b] border border-zinc-800 rounded-2xl p-5 space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Table of Contents</h3>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-xs text-zinc-400 hover:text-white transition-colors py-0.5 leading-snug"
                >
                  {s.title}
                </a>
              ))}
              <div className="pt-4 border-t border-zinc-800 mt-4">
                <a href="mailto:legal@dailynewshub.com" className="block text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                  <i className="fa fa-envelope-o mr-1.5"></i> legal@dailynewshub.com
                </a>
              </div>
            </div>
          </aside>

          {/* Terms Content */}
          <main data-aos="fade-up" className="lg:col-span-9 space-y-10 text-left">
            <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-800/60 text-xs text-blue-300 leading-relaxed">
              <i className="fa fa-info-circle mr-2"></i>
              <strong>Quick Summary:</strong> Use our API to build great apps. Attribute news sources. Don&apos;t resell raw data or bypass rate limits. Commercial plans come with 99.99% SLA credits. Disputes are handled via arbitration in California or Lagos.
            </div>

            {sections.map((section, idx) => (
              <section key={section.id} id={section.id} data-aos="fade-up" data-aos-delay={idx * 30}>
                <h2 className="text-lg sm:text-xl font-extrabold text-white mb-4 border-b border-zinc-800 pb-3">
                  {section.title}
                </h2>
                <div className="text-xs sm:text-sm text-zinc-300 leading-7 space-y-3">
                  {section.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={i} className="font-bold text-white text-sm">{line.replace(/\*\*/g, '')}</p>;
                    }
                    if (line.startsWith('- **')) {
                      const parts = line.replace('- **', '').split('**:');
                      return (
                        <p key={i} className="pl-4 border-l border-zinc-800">
                          <span className="font-bold text-zinc-200">{parts[0]}:</span>
                          <span className="text-zinc-400">{parts[1]}</span>
                        </p>
                      );
                    }
                    if (line.startsWith('- ')) {
                      return <p key={i} className="pl-4 text-zinc-400">· {line.slice(2)}</p>;
                    }
                    if (line.startsWith('  ')) {
                      return <p key={i} className="pl-6 font-mono text-xs text-zinc-300 bg-zinc-900/50 rounded px-2 py-1">{line.trim()}</p>;
                    }
                    return line ? <p key={i} className="text-zinc-400">{line}</p> : <br key={i} />;
                  })}
                </div>
              </section>
            ))}

            <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 text-center space-y-4">
              <h3 className="text-lg font-bold text-white">Need Legal Clarification?</h3>
              <p className="text-xs text-zinc-400">Our legal team responds to formal inquiries within 2 business days.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a href="mailto:legal@dailynewshub.com" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider transition-all">
                  <i className="fa fa-envelope-o"></i> Email Legal Team
                </a>
                <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all">
                  Contact Support
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>

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
              <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">Real-time AI news intelligence and global REST API platform.</p>
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
                <li><Link href="/terms" className="text-white font-semibold">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <p>© {new Date().getFullYear()} DailyNewsHub Inc. All rights reserved.</p>
            <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span>All Systems Operational</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
