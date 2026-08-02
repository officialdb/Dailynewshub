"use client";

import Link from "next/link";

export default function PrivacyPage() {
  const lastUpdated = "July 29, 2026";

  const sections = [
    {
      id: "information-we-collect",
      title: "1. Information We Collect",
      content: `We collect information you provide directly to us, such as when you create an account, register for an API key, or contact our support team.

**Information you provide:**
- Full name, email address, and password when registering an account
- Company name and job title when registering for API access
- Payment and billing information for paid API plans
- Communications you send us, including support requests and feedback

**Information collected automatically:**
- Log data including IP address, browser type, referring URLs, and timestamps
- Device identifiers and operating system information
- API request logs including endpoint calls, rate limit usage, and response codes
- Cookies and similar tracking technologies to maintain sessions and preferences`
    },
    {
      id: "how-we-use-information",
      title: "2. How We Use Your Information",
      content: `DailyNewsHub uses the information we collect to provide, maintain, and improve our services:

- **Service Delivery**: Authenticate users, provision API keys, and deliver real-time news data
- **Communication**: Send transactional emails (API key confirmations, usage alerts, invoices) and service announcements
- **Security**: Detect, investigate, and prevent fraudulent activity, abuse of API rate limits, and unauthorized access
- **Analytics**: Understand usage patterns to optimize API performance, endpoints, and AI summary quality
- **Legal Compliance**: Fulfill obligations under applicable Nigerian, US, and EU data regulations

We do not sell, rent, or trade your personal information to any third party for marketing purposes.`
    },
    {
      id: "api-data-practices",
      title: "3. API Data & Developer Practices",
      content: `For developers using the DailyNewsHub REST API:

- **API Keys**: Your API keys are sensitive credentials. We store them as one-way hashed values and display them only once upon creation. Keep them secure and rotate them regularly.
- **Request Logging**: We retain API request logs for up to 90 days for security, rate limiting enforcement, and billing verification purposes.
- **IP Address Storage**: We log source IP addresses for rate limiting and abuse prevention. These are purged after 30 days unless flagged for a security investigation.
- **Webhook Payloads**: If you subscribe to real-time news webhooks, we transmit data to endpoints you specify. You are responsible for securing those receiving endpoints.
- **Third-party SDKs**: Our official SDKs (Python, Node.js, Go) do not collect telemetry without explicit opt-in.`
    },
    {
      id: "information-sharing",
      title: "4. Information Sharing & Disclosure",
      content: `We may share your information in the following limited circumstances:

- **Service Providers**: We engage trusted third-party vendors (cloud infrastructure, payment processors, email delivery) who process data strictly on our behalf
- **Legal Requirements**: We may disclose information when required by law, court order, or governmental authority
- **Business Transfers**: In the event of a merger or acquisition, user data may be transferred as part of the business assets, subject to continued privacy protections
- **Consent**: With your explicit consent for any other purpose

We require all third-party service providers to implement appropriate data protection measures equivalent to or stronger than those described in this policy.`
    },
    {
      id: "data-retention",
      title: "5. Data Retention & Deletion",
      content: `We retain your personal data for as long as your account remains active or as required to provide you with services:

- **Account Data**: Retained for the duration of your subscription and up to 90 days after account closure
- **API Logs**: Retained for 90 days for security and billing audit trails
- **Payment Records**: Retained for 7 years as required by financial regulations
- **Support Tickets**: Retained for 2 years for quality assurance

You may request deletion of your account and associated personal data at any time by contacting privacy@dailynewshub.com. Upon verified request, we will delete your data within 30 days, except where retention is legally required.`
    },
    {
      id: "cookies",
      title: "6. Cookies & Tracking Technologies",
      content: `We use cookies and similar technologies to operate and improve DailyNewsHub:

- **Essential Cookies**: Required for authentication, session management, and API key portal functionality
- **Analytics Cookies**: Used with your consent to understand how developers interact with our documentation and developer portal
- **Preference Cookies**: Store your theme preferences and dashboard settings

You may configure your browser to refuse cookies, though this may impair certain platform features. Our mobile application uses device identifiers instead of browser cookies for session management.`
    },
    {
      id: "security",
      title: "7. Security",
      content: `We implement industry-standard security measures to protect your data:

- **Encryption in Transit**: All API communications and portal sessions use TLS 1.3 encryption
- **Encryption at Rest**: Sensitive user data and API keys are encrypted at rest using AES-256
- **Access Controls**: Strict role-based access controls limit internal data access to authorized personnel only
- **Regular Audits**: We conduct quarterly security audits and penetration testing
- **Incident Response**: In the event of a data breach, we will notify affected users within 72 hours as required by GDPR

Despite these measures, no system is completely immune to security threats. We encourage you to use strong passwords and enable multi-factor authentication where available.`
    },
    {
      id: "your-rights",
      title: "8. Your Rights",
      content: `Depending on your jurisdiction, you may have the following rights regarding your personal data:

- **Access**: Request a copy of the personal data we hold about you
- **Correction**: Request correction of inaccurate or incomplete data
- **Deletion**: Request deletion of your personal data ("right to be forgotten")
- **Portability**: Receive your data in a structured, machine-readable format
- **Objection**: Object to processing based on legitimate interests
- **Restriction**: Request that we restrict processing of your data in certain circumstances

To exercise any of these rights, contact us at privacy@dailynewshub.com. We will respond within 30 days.`
    },
    {
      id: "contact",
      title: "9. Contact & Data Controller",
      content: `DailyNewsHub Inc. is the data controller for personal information processed through our services.

**Privacy Inquiries:**
Email: privacy@dailynewshub.com
Response time: Within 72 hours

**Mailing Address:**
DailyNewsHub Inc.
Privacy & Compliance Team
San Francisco, CA, United States

**Nigerian Operations:**
Lagos Technology District, Lagos, Nigeria

If you are located in the European Economic Area, you also have the right to lodge a complaint with your local supervisory data protection authority.`
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
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">Privacy Policy</span>
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
            <i className="fa fa-shield text-white"></i>
            <span>PRIVACY POLICY</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Your Privacy Is Our <span className="text-zinc-400">Responsibility</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            This Privacy Policy explains how DailyNewsHub Inc. collects, uses, and protects your personal data when you use our news reader app, developer portal, and REST API.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><i className="fa fa-calendar-o"></i> Last Updated: {lastUpdated}</span>
            <span className="flex items-center gap-1.5"><i className="fa fa-map-marker"></i> Jurisdiction: US & Nigeria</span>
            <span className="flex items-center gap-1.5"><i className="fa fa-language"></i> Language: English</span>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Table of Contents (Sticky Sidebar) */}
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
                <a href="mailto:privacy@dailynewshub.com" className="block text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                  <i className="fa fa-envelope-o mr-1.5"></i> privacy@dailynewshub.com
                </a>
              </div>
            </div>
          </aside>

          {/* Policy Content */}
          <main data-aos="fade-up" className="lg:col-span-9 space-y-10 text-left">
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-300 leading-relaxed">
              <i className="fa fa-info-circle mr-2"></i>
              <strong>Summary:</strong> We collect only what we need to run our service. We never sell your data. API logs are retained for 90 days. You can request deletion of your account at any time.
            </div>

            {sections.map((section, idx) => (
              <section key={section.id} id={section.id} data-aos="fade-up" data-aos-delay={idx * 30}>
                <h2 className="text-lg sm:text-xl font-extrabold text-white mb-4 border-b border-zinc-800 pb-3">
                  {section.title}
                </h2>
                <div className="text-xs sm:text-sm text-zinc-300 leading-7 space-y-3 whitespace-pre-line">
                  {section.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={i} className="font-bold text-white">{line.replace(/\*\*/g, '')}</p>;
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
                    return <p key={i} className="text-zinc-400">{line}</p>;
                  })}
                </div>
              </section>
            ))}

            <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 text-center space-y-4">
              <h3 className="text-lg font-bold text-white">Questions About This Policy?</h3>
              <p className="text-xs text-zinc-400">Contact our Privacy & Compliance team directly.</p>
              <a href="mailto:privacy@dailynewshub.com" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider transition-all">
                <i className="fa fa-envelope-o"></i> Email Privacy Team
              </a>
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
                <li><Link href="/privacy" className="text-white font-semibold">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
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
