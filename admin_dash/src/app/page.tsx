"use client";

import { useState, useEffect } from "react";
import { articlesApi } from "@/lib/api";

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
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [newsItems, setNewsItems] = useState<DisplayNews[]>(fallbackArticles);
  const [loadingBackend, setLoadingBackend] = useState(true);
  const [usingBackendData, setUsingBackendData] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        const response = await articlesApi.list(1, 12);
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
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#live-feed" className="hover:text-white transition-colors">Headlines</a>
            <a href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Get App</a>
            <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-lg transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
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
              <i className="fa fa-newspaper-o text-zinc-500 mr-2.5"></i>Today&apos;s Headlines
            </a>
            <a
              href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white py-1.5 border-b border-zinc-800/50"
            >
              <i className="fa fa-download text-zinc-500 mr-2.5"></i>Download APK (Android)
            </a>
            <a
              href="#reviews"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white py-1.5"
            >
              <i className="fa fa-star text-zinc-500 mr-2.5"></i>Reader Reviews
            </a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-20 sm:pb-28 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Announcement Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-zinc-900 border border-zinc-700 shadow-sm mb-6 sm:mb-8 text-[11px] sm:text-xs font-semibold text-zinc-300 max-w-full">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span>Over 2,000,000+ Readers</span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="text-zinc-200"><i className="fa fa-star text-zinc-400 mr-1"></i>4.9/5 Rating</span>
          </div>

          {/* Main Headline with Typing Effect */}
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-tight sm:leading-[1.15] min-h-[120px] sm:min-h-[160px]">
            Stay Informed with <br className="hidden sm:inline" />
            <span className="text-zinc-400 font-extrabold inline-block">
              {typedText}
              <span className="animate-pulse text-white ml-0.5 font-light">|</span>
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-xl text-zinc-400 max-w-3xl mx-auto font-normal leading-relaxed px-2">
            Get breaking updates, 30-second AI summaries, and verified topics delivered directly to your phone.
          </p>

          {/* Store Download Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
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
          <div className="mt-12 sm:mt-16 max-w-4xl mx-auto rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-zinc-900/60 border border-zinc-800 shadow-2xl">
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
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Designed for Modern Readers</h2>
            <p className="text-zinc-400 mt-2 sm:mt-4 text-xs sm:text-base">
              Built with precision typography and minimalist black-and-white design for effortless daily reading.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-magic text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">AI Executive Summaries</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Get bullet-point summaries of complex multi-page articles so you stay fully informed in under 30 seconds.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-bell-o text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Custom Push Notifications</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Follow specific categories, technology topics, or market events and receive real-time mobile alerts.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-cloud-download text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Offline Reading Mode</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Save stories automatically for offline reading during commutes, flights, or remote travels without internet.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-volume-up text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Audio Briefings</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Listen to natural AI-narrated audio summaries of daily top stories while multi-tasking or walking.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 sm:mb-6 border border-zinc-700">
                <i className="fa fa-check-circle-o text-lg sm:text-xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Multi-Source Verification</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Compare coverage across multiple global publishers to get an unbiased perspective on major headlines.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[#0d0f17] border border-zinc-800 hover:border-zinc-600 transition-colors">
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
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Loved by Readers Worldwide</h2>
            <p className="text-zinc-400 mt-2 text-xs sm:text-base">See why millions choose DailyNewsHub for their daily news routine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
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

            <div className="p-5 sm:p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
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

            <div className="p-5 sm:p-6 rounded-2xl bg-[#09090b] border border-zinc-800 flex flex-col justify-between">
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

      {/* Main Download App Call-to-Action Section */}
      <section id="download" className="py-16 sm:py-24 bg-[#050505] border-t border-zinc-800 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
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
      <footer className="py-8 sm:py-12 bg-black border-t border-zinc-900 text-zinc-400 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <i className="fa fa-newspaper-o text-sm"></i>
            </div>
            <span className="font-bold text-white">DailyNewsHub</span>
          </div>

          <p className="text-[11px] sm:text-xs text-zinc-600">
            © {new Date().getFullYear()} DailyNewsHub Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-4 sm:gap-6 text-xs font-semibold text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="https://github.com/officialdb/Dailynewshub/releases/latest/download/DailyNewsHub-v1.0.0.apk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Get App</a>
            <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
