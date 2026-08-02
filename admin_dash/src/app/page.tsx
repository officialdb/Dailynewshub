"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { articlesApi, developerAuthApi, setDeveloperTokens } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface DisplayNews {
  id: string;
  title: string;
  category: string;
  summary: string;
  author: string;
  timeAgo: string;
  views: string;
  readTime: string;
  isTrending?: boolean;
  image: string;
}

const fallbackArticles: DisplayNews[] = [
  {
    id: "1",
    title: "Quantum Breakthrough: 10,000-Qubit Processor Achieves Stable Error Correction",
    category: "AI & Tech",
    summary: "Researchers achieve room-temperature quantum coherence, opening doors for real-time decryption and climate modeling at scale.",
    author: "Elena Rostova",
    timeAgo: "12 mins ago",
    views: "48.2k",
    readTime: "4 min read",
    isTrending: true,
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "2",
    title: "Global Central Banks Launch Interoperable Sovereign Digital Currency Protocol",
    category: "Markets & Economy",
    summary: "Seventeen central banks sign historic agreement enabling zero-fee instant cross-border settlement using cryptographically backed digital reserve notes.",
    author: "Marcus Vance",
    timeAgo: "45 mins ago",
    views: "32.9k",
    readTime: "6 min read",
    isTrending: true,
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "3",
    title: "Next-Gen Fusion Reactor Begins Continuous Commercial Energy Generation Grid Trial",
    category: "Clean Energy",
    summary: "The Helion-IV tokamak sustains net energy output for 72 consecutive hours, supplying 300MW directly to the regional electrical grid.",
    author: "Dr. Sarah Chen",
    timeAgo: "2 hours ago",
    views: "94.1k",
    readTime: "5 min read",
    isTrending: true,
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "4",
    title: "Autonomous Space Cargo Clipper Completes First Deep Space Cargo Run to Mars Station",
    category: "Global Affairs",
    summary: "The uncrewed supply vessel delivers 45 metric tons of life support hardware and scientific equipment to Olympus Outpost.",
    author: "Alex Rivera",
    timeAgo: "3 hours ago",
    views: "21.5k",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "5",
    title: "AI-Synthesized Therapeutics Enter Phase III Trials for Universal Virus Immunity",
    category: "AI & Tech",
    summary: "Computational biology platform designs broad-spectrum protein inhibitor targeting universal viral replication enzymes.",
    author: "Dr. Jonathan Hayes",
    timeAgo: "5 hours ago",
    views: "57.4k",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "6",
    title: "Zero-Trust Architecture Standard Mandated Across All Financial Infrastructure Providers",
    category: "Cyber & Infra",
    summary: "New regulatory framework requires micro-segmentation and continuous identity authorization for all transaction routes.",
    author: "Maya Lin",
    timeAgo: "7 hours ago",
    views: "18.3k",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80"
  }
];

const typingPhrases = [
  "AI-Powered Real-Time News",
  "30-Second Executive Summaries",
  "Instant Breaking News Alerts",
  "Unbiased Multi-Source Stories",
  "Custom-Tailored Daily Feeds"
];

export default function LandingPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [newsItems, setNewsItems] = useState<DisplayNews[]>(fallbackArticles);
  const [loadingBackend, setLoadingBackend] = useState(true);
  const [usingBackendData, setUsingBackendData] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // API Key modal & Registration state
  const auth = useAuth();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [modalTab, setModalTab] = useState<"signup" | "signin">("signup");
  const [developerSessionEmail, setDeveloperSessionEmail] = useState<string | null>(null);

  // Extended Profile Fields
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCountry, setRegCountry] = useState("United States");
  const [regState, setRegState] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regRole, setRegRole] = useState("api_developer");

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    const storedDeveloper = localStorage.getItem("developer_user");
    if (!storedDeveloper) return;
    try {
      const parsed = JSON.parse(storedDeveloper) as { email?: string };
      setDeveloperSessionEmail(parsed.email ?? null);
    } catch {
      setDeveloperSessionEmail(null);
    }
  }, []);

  const isAuthenticated = !!auth?.token || !!developerSessionEmail;

  // Password strength calculation
  const passLengthOk = regPassword.length >= 8;
  const passUpperLowerOk = /[A-Z]/.test(regPassword) && /[a-z]/.test(regPassword);
  const passNumberOk = /[0-9]/.test(regPassword);
  const passSpecialOk = /[^A-Za-z0-9]/.test(regPassword);
  const passScore = (passLengthOk ? 1 : 0) + (passUpperLowerOk ? 1 : 0) + (passNumberOk ? 1 : 0) + (passSpecialOk ? 1 : 0);

  const passwordsMatch = regPassword === regConfirmPassword || regConfirmPassword === "";

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    if (regPassword !== regConfirmPassword) {
      setAuthError("Passwords do not match. Please verify your password.");
      return;
    }
    if (regPassword.length < 8) {
      setAuthError("Password must be at least 8 characters long.");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await developerAuthApi.register({
        name: `${regFirstName.trim()} ${regLastName.trim()}`.trim(),
        email: regEmail,
        password: regPassword,
        company_name: regRole,
        website: null,
        what_are_you_building: [regPhone, regCountry, regState].filter(Boolean).join(" | ") || null,
      });
      if (res.data?.id) {
        setModalTab("signin");
        setRevealedKey("__registered__");
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Registration failed. Please check your inputs.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const loginRes = await developerAuthApi.login({ email: regEmail, password: regPassword });
      const tokens = loginRes.data;
      // --- SEC FIX SEC-007 ---
      if (tokens?.developer) {
        setDeveloperTokens();
        localStorage.setItem("developer_user", JSON.stringify(tokens.developer));
        setDeveloperSessionEmail(tokens.developer.email);
        setShowApiKeyModal(false);
        router.push("/developer/dashboard");
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Typing effect state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const categories = ["All", "AI & Tech", "Markets & Economy", "Clean Energy", "Global Affairs", "Cyber & Infra"];

  // Typing effect logic
  useEffect(() => {
    const currentPhrase = typingPhrases[phraseIndex];
    let timer: NodeJS.Timeout;

    if (isDeleting) {
      if (typedText.length > 0) {
        timer = setTimeout(() => {
          setTypedText(currentPhrase.substring(0, typedText.length - 1));
        }, 40);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % typingPhrases.length);
      }
    } else {
      if (typedText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setTypedText(currentPhrase.substring(0, typedText.length + 1));
        }, 80);
      } else {
        // Pause at full word before deleting
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    }

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, phraseIndex]);

  // Fetch real articles from backend on mount
  useEffect(() => {
    async function fetchBackendNews() {
      try {
        setLoadingBackend(true);
        const response = await articlesApi.listPublic(1, 6);
        if (response?.data?.items && response.data.items.length > 0) {
          const mapped: DisplayNews[] = response.data.items.map((art) => ({
            id: art.id,
            title: art.title,
            category: art.source_name ?? "General",
            summary: art.description || art.content?.slice(0, 140) + "...",
            author: art.author || "Editorial Staff",
            timeAgo: art.published_at ? new Date(art.published_at).toLocaleDateString() : "Recently",
            views: `${(art.view_count ?? 1200).toLocaleString()} views`,
            readTime: "4 min read",
            isTrending: art.is_trending || art.is_featured,
            image: art.image_url || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
          }));
          setNewsItems(mapped);
          setUsingBackendData(true);
        }
      } catch {
        // Fallback to sample articles seamlessly if backend is unauthenticated/unreachable
      } finally {
        setLoadingBackend(false);
      }
    }

    fetchBackendNews();
  }, []);

  const filteredArticles = newsItems.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/95 border-b border-zinc-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg shrink-0">
              <i className="fa fa-newspaper-o text-white text-sm sm:text-lg"></i>
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-xl tracking-tight text-white flex items-center gap-1">
                DailyNews<span className="text-zinc-400">Hub</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">Global News Engine</span>
            </div>
          </div>

          {/* Desktop Nav links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#live-feed" className="hover:text-white transition-colors">Headlines</a>
            <a href="/developer" className="hover:text-white transition-colors">For Developers</a>
            <a href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Get App</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/developer/register"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            >
              <i className="fa fa-key text-xs"></i>
              <span>Get Access</span>
            </a>

            <a
              href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-lg transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            >
              <i className="fa fa-mobile text-xs sm:text-sm"></i>
              <span>Get App</span>
            </a>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <i className={`fa ${mobileMenuOpen ? "fa-times" : "fa-bars"} text-base`}></i>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-800 bg-[#09090b] px-4 py-4 space-y-3 animate-fadeIn">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white py-1.5 border-b border-zinc-800/50"
            >
              <i className="fa fa-magic text-zinc-500 mr-2.5"></i>Features
            </a>
            <a
              href="#live-feed"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white py-1.5 border-b border-zinc-800/50"
            >
              <i className="fa fa-newspaper-o text-zinc-500 mr-2.5"></i>Headlines
            </a>
            <a
              href="/developer"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white py-1.5 border-b border-zinc-800/50"
            >
              <i className="fa fa-code text-zinc-500 mr-2.5"></i>For Developers
            </a>
            <a
              href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white py-1.5"
            >
              <i className="fa fa-download text-zinc-500 mr-2.5"></i>Get App
            </a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-20 sm:pb-28 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Announcement Pill */}
          <div data-aos="fade-down" className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-zinc-900 border border-zinc-700 shadow-sm mb-6 sm:mb-8 text-[11px] sm:text-xs font-semibold text-zinc-300 max-w-full">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span>Over 2,000,000+ Readers</span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="text-zinc-200"><i className="fa fa-star text-zinc-400 mr-1"></i>4.9/5 Rating</span>
          </div>

          {/* Main Headline with Typing Effect */}
          <h1 data-aos="fade-up" className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-tight sm:leading-[1.15] min-h-[120px] sm:min-h-[160px]">
            Stay Informed with <br className="hidden sm:inline" />
            <span className="text-zinc-400 font-extrabold inline-block">
              {typedText}
              <span className="animate-pulse text-white ml-0.5 font-light">|</span>
            </span>
          </h1>

          <p data-aos="fade-up" data-aos-delay="100" className="mt-4 sm:mt-6 text-sm sm:text-xl text-zinc-400 max-w-3xl mx-auto font-normal leading-relaxed px-2">
            Get breaking updates, 30-second AI summaries, and verified topics delivered directly to your phone.
          </p>

          {/* Store Download Buttons */}
          <div data-aos="fade-up" data-aos-delay="200" className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
            {/* Google Play Store Badge */}
            <a
              href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-3.5 px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white shadow-xl transition-all duration-200 active:scale-95 group cursor-pointer"
            >
              <i className="fa fa-android text-2xl text-white group-hover:scale-110 transition-transform"></i>
              <div className="text-left">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider leading-none">DOWNLOAD APK</p>
                <p className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">Android</p>
              </div>
            </a>

            {/* Apple App Store Badge - Coming Soon */}
            <div
              title="iOS version coming soon!"
              className="w-full sm:w-auto flex items-center justify-center gap-3.5 px-6 py-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-white shadow-xl cursor-not-allowed opacity-70 relative group"
            >
              <i className="fa fa-apple text-2xl text-zinc-300"></i>
              <div className="text-left">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider leading-none">COMING SOON ON</p>
                <p className="text-sm sm:text-base font-bold text-zinc-200 tracking-wide mt-0.5">App Store</p>
              </div>
              <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-zinc-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
            </div>
          </div>

          {/* Hero App Screen Mockup */}
          <div data-aos="zoom-in" data-aos-delay="300" className="mt-12 sm:mt-16 max-w-4xl mx-auto rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-zinc-900/60 border border-zinc-800 shadow-2xl">
            <div className="rounded-xl sm:rounded-2xl bg-[#09090b] p-4 sm:p-6 text-left border border-zinc-800 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
              {/* Phone illustration mockup */}
              <div className="w-full max-w-xs md:w-64 h-80 sm:h-96 rounded-3xl bg-zinc-950 border-4 border-zinc-700 p-3 flex flex-col justify-between shadow-2xl shrink-0 relative overflow-hidden mx-auto">
                <div className="w-16 sm:w-20 h-3 bg-zinc-800 rounded-full mx-auto mb-2 sm:mb-3"></div>
                <div className="space-y-2.5 sm:space-y-3 flex-1 overflow-hidden">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-white flex items-center justify-between">
                    <span><i className="fa fa-bolt mr-1"></i> BREAKING NEWS</span>
                    <span className="text-[9px] text-zinc-400">JUST NOW</span>
                  </div>
                  <div className="h-16 sm:h-20 bg-zinc-900 rounded-xl overflow-hidden relative">
                    {/* eslint-disable-next-html-element-suppression */}
                    <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=400&q=80" alt="App preview" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs font-bold text-white leading-tight">Quantum Processor Achieves Error Correction</p>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">AI Summary: Room-temperature quantum coherence unlocked for real-time calculation.</p>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-around text-zinc-400">
                  <i className="fa fa-newspaper-o text-xs sm:text-sm text-white"></i>
                  <i className="fa fa-search text-xs sm:text-sm"></i>
                  <i className="fa fa-bookmark-o text-xs sm:text-sm"></i>
                  <i className="fa fa-user-o text-xs sm:text-sm"></i>
                </div>
              </div>

              {/* Pitch column */}
              <div className="flex-1 space-y-3 sm:space-y-4 text-center md:text-left">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-zinc-900 text-zinc-200 border border-zinc-700">
                  DailyNewsHub Mobile Experience
                </span>
                <h3 className="text-xl sm:text-3xl font-extrabold text-white">Your World in 30 Seconds</h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  Experience a high-contrast, distraction-free news reader engineered for smart readers. Filter topics, read AI-generated executive summaries, and listen to audio news briefs.
                </p>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-2">
                  <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
                    <i className="fa fa-magic text-white text-sm sm:text-base mb-1 block"></i>
                    <p className="text-xs font-bold text-white">AI Summaries</p>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400">Read key facts instantly</p>
                  </div>
                  <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
                    <i className="fa fa-bell-o text-white text-sm sm:text-base mb-1 block"></i>
                    <p className="text-xs font-bold text-white">Instant Alerts</p>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400">Only verified stories</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reader Features Section */}
      <section id="features" className="py-16 sm:py-24 bg-zinc-950 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-aos="fade-up" className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Designed for Modern Readers</h2>
            <p className="text-zinc-400 mt-2 sm:mt-4 text-xs sm:text-base">
              Built with precision typography and minimalist black-and-white design for effortless daily reading.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            <div data-aos="fade-up" data-aos-delay="100" className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-magic text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">AI Executive Summaries</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Get bullet-point summaries of complex multi-page articles so you stay fully informed in under 30 seconds.
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="200" className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-bell-o text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Custom Push Notifications</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Follow specific categories, technology topics, or market events and receive real-time mobile alerts.
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="300" className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-cloud-download text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Offline Reading Mode</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Save stories automatically for offline reading during commutes, flights, or remote travels without internet.
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="100" className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-volume-up text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Audio Briefings</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Listen to natural AI-narrated audio summaries of daily top stories while multi-tasking or walking.
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="200" className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-check-circle-o text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Multi-Source Verification</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Compare coverage across multiple global publishers to get an unbiased perspective on major headlines.
              </p>
            </div>

            <div data-aos="fade-up" data-aos-delay="300" className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-moon-o text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Rich Contrast OLED Dark Mode</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Sleek black-and-white layout designed to minimize eye fatigue during late-night reading sessions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live News Stream Section (Backend Connected) */}
      <section id="live-feed" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 text-zinc-300 text-xs font-semibold mb-3 border border-zinc-700">
              <i className="fa fa-circle text-[8px] text-emerald-400"></i>
              <span>Experience Today&apos;s Headlines</span>
              {usingBackendData && (
                <span className="ml-1 text-[10px] text-zinc-500 uppercase tracking-widest">(Live Backend Feed)</span>
              )}
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Today&apos;s Top Trending Stories</h2>
            <p className="text-zinc-400 mt-1 sm:mt-2 text-xs sm:text-base max-w-2xl">
              Explore breaking stories fetched directly from the DailyNewsHub intelligence engine.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <i className="fa fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
            <input
              type="text"
              placeholder="Search news stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 sm:mb-8 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                activeCategory === cat
                  ? "bg-white text-black shadow-lg"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles List */}
        {loadingBackend ? (
          <div className="py-16 text-center text-zinc-400">
            <i className="fa fa-circle-o-notch fa-spin text-3xl mb-3 block text-white"></i>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider">Fetching live news stories...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
            <i className="fa fa-newspaper-o text-4xl mb-3 block text-zinc-600"></i>
            <p className="text-sm sm:text-base font-medium">No articles matched your search filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="group rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-600 transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xl"
              >
                <div>
                  {/* Card Image */}
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-zinc-900">
                    {/* eslint-disable-next-html-element-suppression */}
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-black/90 text-white border border-zinc-700">
                        {article.category}
                      </span>
                      {article.isTrending && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-white text-black flex items-center gap-1">
                          <i className="fa fa-bolt text-xs"></i>
                          Trending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-2 font-mono">
                      <span><i className="fa fa-clock-o mr-1"></i>{article.timeAgo}</span>
                      <span>{article.readTime}</span>
                    </div>

                    <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-snug">
                      {article.title}
                    </h3>

                    {/* AI Summary Box */}
                    <div className="mt-3 sm:mt-4 p-3 sm:p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-zinc-300 mb-1">
                        <i className="fa fa-magic text-xs"></i>
                        AI Executive Summary
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {article.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-medium text-zinc-300 truncate max-w-[150px]">{article.author}</span>
                  <span className="flex items-center gap-1 text-zinc-500 font-mono shrink-0">
                    <i className="fa fa-eye text-xs"></i>
                    {article.views}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reader Reviews */}
      <section id="reviews" className="py-16 sm:py-24 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-aos="fade-up" className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Loved by Readers Worldwide</h2>
            <p className="text-zinc-400 mt-2 text-xs sm:text-base">See why millions choose DailyNewsHub for their daily news routine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div data-aos="fade-up" data-aos-delay="100" className="p-5 sm:p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-zinc-200 mb-3 text-xs">
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                </div>
                <p className="text-zinc-300 text-xs sm:text-sm italic leading-relaxed">
                  &quot;The AI summaries are incredible! I get caught up on global markets and tech news in under two minutes every morning.&quot;
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-xs shrink-0">SJ</div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Sarah Jenkins</p>
                  <p className="text-[11px] text-zinc-500">Tech Entrepreneur</p>
                </div>
              </div>
            </div>

            <div data-aos="fade-up" data-aos-delay="200" className="p-5 sm:p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-zinc-200 mb-3 text-xs">
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                </div>
                <p className="text-zinc-300 text-xs sm:text-sm italic leading-relaxed">
                  &quot;No ads, no clutter, just pure news. The custom topic alerts mean I never miss critical updates.&quot;
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-xs shrink-0">MC</div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Michael Chen</p>
                  <p className="text-[11px] text-zinc-500">Financial Analyst</p>
                </div>
              </div>
            </div>

            <div data-aos="fade-up" data-aos-delay="300" className="p-5 sm:p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-zinc-200 mb-3 text-xs">
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                  <i className="fa fa-star"></i>
                </div>
                <p className="text-zinc-300 text-xs sm:text-sm italic leading-relaxed">
                  &quot;The offline reading mode is essential for my flights. Ultra clean dark mode design and super fast.&quot;
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-xs shrink-0">ER</div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Elena Rodriguez</p>
                  <p className="text-[11px] text-zinc-500">Software Architect</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "Build on Daily News Hub" Developer API Section */}
      <section id="developer-api" className="py-16 sm:py-24 bg-[#050608] border-t border-zinc-800/80 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div data-aos="fade-right" className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-300">
                <i className="fa fa-code text-white"></i>
                <span>Build on Daily News Hub</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Power Your App With <br className="hidden sm:inline" />
                <span className="text-zinc-400">Real-Time News</span>
              </h2>

              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                Access breaking news, AI summaries, trending stories, and category feeds through a simple REST API. Trusted data. Nigerian and global coverage.
              </p>

              {/* Tier Pills */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Available API Tiers</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Free
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Starter
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Pro
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Enterprise
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-3">
                <a
                  href="/developer/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <span>Get Free API Key</span>
                  <i className="fa fa-arrow-right text-xs"></i>
                </a>
              </div>
            </div>

            {/* Right: cURL Code Example Snippet Box */}
            <div data-aos="fade-left" className="lg:col-span-6">
              <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-4 sm:p-6 shadow-2xl relative font-mono text-xs text-left">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
                    <span className="ml-2 text-zinc-400 text-[11px]">curl_example.sh</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-sans">REST JSON</span>
                </div>

                {/* Request */}
                <div className="space-y-1 text-zinc-300 text-[11px] sm:text-xs overflow-x-auto pb-2">
                  <p><span className="text-zinc-500">$</span> curl -X GET <span className="text-emerald-400">&quot;https://api.dailynewshub.com/api/v2/public/articles?category=trending&country=ng&quot;</span> \</p>
                  <p className="pl-4">-H <span className="text-amber-300">&quot;X-API-Key: dnh_live_9f823a7b4c...&quot;</span> \</p>
                  <p className="pl-4">-H <span className="text-amber-300">&quot;Content-Type: application/json&quot;</span></p>
                </div>

                {/* Response Box */}
                <div className="mt-4 p-3.5 rounded-xl bg-black border border-zinc-800 text-zinc-400 overflow-x-auto text-[10px] sm:text-[11px] leading-relaxed">
                  <p className="text-emerald-500/90 mb-1 font-sans">// 200 OK Response — Nigerian & Global Coverage</p>
                  <pre className="text-zinc-300 font-mono">{`{
  "status": "success",
  "data": {
    "total": 1284,
    "region": "NG/Global",
    "items": [
      {
        "id": "art_908a21b",
        "title": "Quantum Error Correction Unlocked",
        "category": "AI & Tech",
        "summary": "AI model proves room-temp coherence...",
        "published_at": "2026-07-29T10:30:00Z"
      }
    ]
  }
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Download App Call-to-Action Section */}
      <section id="download" className="py-16 sm:py-24 bg-[#050505] border-t border-zinc-800 relative overflow-hidden">
        <div data-aos="zoom-in" className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-zinc-900 text-zinc-300 text-xs font-bold mb-4 sm:mb-6 border border-zinc-700">
            <i className="fa fa-download text-xs"></i>
            Available Now on iOS & Android
          </div>

          <h2 className="text-2xl sm:text-5xl font-extrabold text-white tracking-tight">Get DailyNewsHub Today</h2>
          <p className="text-zinc-400 mt-3 sm:mt-4 text-xs sm:text-lg max-w-2xl mx-auto px-2">
            Join over 2 million readers staying informed with real-time AI summaries and instant topic notifications.
          </p>

          {/* Large Store Download Badges */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full max-w-md sm:max-w-none mx-auto">
            {/* Google Play Store Large Badge */}
            <a
              href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-4 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white shadow-2xl transition-all duration-200 active:scale-95 group cursor-pointer"
            >
              <i className="fa fa-android text-2xl sm:text-3xl text-white group-hover:scale-110 transition-transform"></i>
              <div className="text-left">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider leading-none">DOWNLOAD APK</p>
                <p className="text-base sm:text-lg font-extrabold text-white tracking-wide mt-1">Android</p>
              </div>
            </a>

            {/* Apple App Store Large Badge - Coming Soon */}
            <div
              title="iOS version coming soon!"
              className="w-full sm:w-auto flex items-center justify-center gap-4 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-white shadow-2xl cursor-not-allowed opacity-70 relative"
            >
              <i className="fa fa-apple text-2xl sm:text-3xl text-zinc-300"></i>
              <div className="text-left">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider leading-none">COMING SOON ON</p>
                <p className="text-base sm:text-lg font-extrabold text-zinc-200 tracking-wide mt-1">App Store</p>
              </div>
              <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-zinc-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Public App Footer */}
      <footer data-aos="fade-up" className="py-12 sm:py-16 bg-black border-t border-zinc-900 text-zinc-400 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-zinc-900 text-left">
            {/* Brand */}
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

            {/* Product Column */}
            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3.5">Product</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Get App</a></li>
                <li><a href="#reviews" className="hover:text-white transition-colors">Reviews</a></li>
              </ul>
            </div>

            {/* Developers Column */}
            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3.5">Developers</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="/docs" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="/developer/status" className="hover:text-white transition-colors">API Status</a></li>
                <li><a href="/developer" className="hover:text-white transition-colors">Developer Portal</a></li>
                <li><a href="/developer/changelog" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3.5">Company</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
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

      {/* Interactive API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#09090b] border border-zinc-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-left">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white text-lg p-1 cursor-pointer"
            >
              <i className="fa fa-times"></i>
            </button>

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold">
                    <i className="fa fa-key text-lg"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Developer API Access</h3>
                    <p className="text-xs text-zinc-400">Manage your production and sandbox API keys</p>
                  </div>
                </div>

                {revealedKey && !revealedKey.startsWith("__") ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <i className="fa fa-check-circle text-emerald-400"></i>
                      <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Your API Key — Copy it now!</label>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-black border border-emerald-700 rounded-xl">
                      <code className="text-xs text-emerald-400 font-mono flex-1 truncate select-all">{revealedKey}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(revealedKey);
                          setKeyCopied(true);
                          setTimeout(() => setKeyCopied(false), 2500);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                      >
                        {keyCopied ? <><i className="fa fa-check mr-1"></i>Copied!</> : <><i className="fa fa-clipboard mr-1"></i>Copy</>}
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-400 flex items-center gap-1">
                      <i className="fa fa-exclamation-triangle"></i>
                      This key will <strong>not be shown again</strong> — store it securely now.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Your API Keys</label>
                    <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                      <p className="flex items-center gap-2">
                        <i className="fa fa-info-circle text-zinc-500"></i>
                        Manage and create API keys from your developer dashboard.
                      </p>
                    </div>
                    <p className="text-[11px] text-zinc-500">Signed in as <span className="text-zinc-300">{auth.user?.email || "Developer"}</span>.</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => { setShowApiKeyModal(false); setRevealedKey(null); }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-xs hover:text-white transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <a
                    href="/developer/dashboard"
                    className="px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors"
                  >
                    Manage Keys in Dashboard &rarr;
                  </a>
                </div>
              </>
            ) : (
              <>
                {/* ─── Success: key revealed ─────────────────────────────────── */}
                {revealedKey ? (
                  <div className="space-y-4">
                    {revealedKey === "__registered__" ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                            <i className="fa fa-envelope text-emerald-400"></i>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">Account created</h3>
                            <p className="text-[11px] text-zinc-400">Verify your email, then sign in to access the developer dashboard.</p>
                          </div>
                        </div>
                        <div className="p-3 bg-black border border-zinc-800 rounded-xl">
                          <p className="text-[11px] text-zinc-400">No API key is issued until you create one inside the dashboard.</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowApiKeyModal(false); setRevealedKey(null); }}
                            className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-xs hover:text-white transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                          <a
                            href="/developer/register"
                            className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs text-center hover:bg-zinc-200 transition-colors"
                          >
                            Open Portal
                          </a>
                        </div>
                      </>
                    ) : revealedKey === "__fetch_failed__" ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                            <i className="fa fa-exclamation-triangle text-amber-400"></i>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">Signed in</h3>
                            <p className="text-[11px] text-zinc-400">Open your dashboard to manage apps and keys.</p>
                          </div>
                        </div>
                        <a
                          href="/developer/dashboard"
                          className="w-full py-2.5 rounded-xl bg-white text-black font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                        >
                          <i className="fa fa-tachometer"></i> Go to Dashboard
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                            <i className="fa fa-check-circle text-emerald-400 text-lg"></i>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">Developer session active</h3>
                            <p className="text-[11px] text-zinc-400">You can create apps and keys from the dashboard.</p>
                          </div>
                        </div>
                        <div className="p-3 bg-black border border-zinc-800 rounded-xl">
                          <p className="text-[11px] text-zinc-400 mb-1">Signed in as</p>
                          <code className="text-xs text-zinc-300 font-mono">{developerSessionEmail || auth.user?.email || "Developer"}</code>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowApiKeyModal(false); setRevealedKey(null); }}
                            className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-xs hover:text-white transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                          <a
                            href="/developer/dashboard"
                            className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs text-center hover:bg-zinc-200 transition-colors"
                          >
                            Open Dashboard
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Modal Header */}
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
                          <i className="fa fa-key text-sm"></i>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">Developer Portal</h3>
                          <p className="text-[11px] text-zinc-400">Create an account and sign in to manage apps and keys</p>
                        </div>
                      </div>
                    </div>

                    {/* Sign Up / Sign In Tab Toggle */}
                    <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => { setModalTab("signup"); setAuthError(null); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          modalTab === "signup" ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <i className="fa fa-user-plus mr-1.5"></i>Create Account (Sign Up)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setModalTab("signin"); setAuthError(null); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          modalTab === "signin" ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <i className="fa fa-sign-in mr-1.5"></i>Sign In
                      </button>
                    </div>

                {/* Error Banner */}
                {authError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <i className="fa fa-exclamation-circle text-sm shrink-0"></i>
                    <span>{authError}</span>
                  </div>
                )}

                {/* Form */}
                {modalTab === "signup" ? (
                  <form onSubmit={handleRegister} className="space-y-2.5">
                    {/* First Name & Last Name */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          placeholder="Alex"
                          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          placeholder="Rivera"
                          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Email & Phone Number */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="alex@acme-apps.io"
                          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+1 (555) 019-2834"
                          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Country & State */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          Country
                        </label>
                        <select
                          value={regCountry}
                          onChange={(e) => setRegCountry(e.target.value)}
                          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-all"
                        >
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Canada">Canada</option>
                          <option value="Germany">Germany</option>
                          <option value="Nigeria">Nigeria</option>
                          <option value="India">India</option>
                          <option value="Australia">Australia</option>
                          <option value="France">France</option>
                          <option value="Other">Other Country</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          State / Province
                        </label>
                        <input
                          type="text"
                          value={regState}
                          onChange={(e) => setRegState(e.target.value)}
                          placeholder="e.g. California"
                          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Role / Purpose */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                        Account Purpose / Role
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-all"
                      >
                        <option value="api_developer">API Consumer / App Integrator</option>
                        <option value="reporter">News Reporter / Contributor</option>
                        <option value="fact_checker">Fact Checker</option>
                        <option value="validator">Content Validator / Editor</option>
                        <option value="chief_editor">Chief Editor</option>
                        <option value="publisher">Publisher / Distribution</option>
                        <option value="auditor">Compliance Auditor</option>
                      </select>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                      />

                      {/* Password Strength Indicator */}
                      {regPassword.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400">Password Strength:</span>
                            <span className={`font-bold ${
                              passScore <= 1 ? "text-red-400" : passScore <= 3 ? "text-amber-400" : "text-emerald-400"
                            }`}>
                              {passScore <= 1 ? "Weak" : passScore <= 3 ? "Medium" : "Strong"}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden flex gap-0.5">
                            <div className={`h-full flex-1 transition-all ${passScore >= 1 ? (passScore <= 1 ? "bg-red-500" : passScore <= 3 ? "bg-amber-500" : "bg-emerald-500") : "bg-zinc-800"}`}></div>
                            <div className={`h-full flex-1 transition-all ${passScore >= 2 ? (passScore <= 3 ? "bg-amber-500" : "bg-emerald-500") : "bg-zinc-800"}`}></div>
                            <div className={`h-full flex-1 transition-all ${passScore >= 3 ? (passScore <= 3 ? "bg-amber-500" : "bg-emerald-500") : "bg-zinc-800"}`}></div>
                            <div className={`h-full flex-1 transition-all ${passScore >= 4 ? "bg-emerald-500" : "bg-zinc-800"}`}></div>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[9px] text-zinc-400 pt-0.5">
                            <span className={passLengthOk ? "text-emerald-400" : ""}>
                              <i className={`fa ${passLengthOk ? "fa-check-circle" : "fa-circle-o"} mr-1`}></i>8+ characters
                            </span>
                            <span className={passUpperLowerOk ? "text-emerald-400" : ""}>
                              <i className={`fa ${passUpperLowerOk ? "fa-check-circle" : "fa-circle-o"} mr-1`}></i>Upper & lower
                            </span>
                            <span className={passNumberOk ? "text-emerald-400" : ""}>
                              <i className={`fa ${passNumberOk ? "fa-check-circle" : "fa-circle-o"} mr-1`}></i>Number (0-9)
                            </span>
                            <span className={passSpecialOk ? "text-emerald-400" : ""}>
                              <i className={`fa ${passSpecialOk ? "fa-check-circle" : "fa-circle-o"} mr-1`}></i>Symbol (@#$%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                          Confirm Password *
                        </label>
                        {regConfirmPassword.length > 0 && (
                          <span className={`text-[10px] font-semibold ${passwordsMatch ? "text-emerald-400" : "text-red-400"}`}>
                            {passwordsMatch ? <><i className="fa fa-check mr-1"></i>Passwords match</> : <><i className="fa fa-times mr-1"></i>Passwords do not match</>}
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-black border rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all ${
                          regConfirmPassword.length > 0
                            ? passwordsMatch
                              ? "border-emerald-500/70 focus:border-emerald-400"
                              : "border-red-500/70 focus:border-red-400"
                            : "border-zinc-700 focus:border-white"
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading || !passwordsMatch || regPassword.length < 8}
                      className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {authLoading ? (
                        <>
                          <i className="fa fa-circle-o-notch fa-spin"></i>
                          Creating Account…
                        </>
                      ) : (
                        <>
                          <i className="fa fa-key"></i>
                          Create Developer Account
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="developer@example.com"
                        className="w-full bg-black border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {authLoading ? (
                        <>
                          <i className="fa fa-circle-o-notch fa-spin"></i>
                          Signing in…
                        </>
                      ) : (
                        <>
                          <i className="fa fa-sign-in"></i>
                          Sign In
                        </>
                      )}
                    </button>
                  </form>
                )}

                    <p className="text-[11px] text-zinc-500 text-center pt-1">
                      Developer accounts can create apps and API keys from the dashboard.
                    </p>
                  </>
                )}

              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
