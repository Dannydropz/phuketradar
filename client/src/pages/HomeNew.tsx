import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Search, Menu, Clock, MapPin, Share2, Bookmark } from "lucide-react";
import { SearchDialog } from "@/components/SearchDialog";
import { formatDistanceToNow } from "date-fns";
import type { ArticleListItem, Journalist } from "@shared/schema";
import NotFound from "@/pages/not-found";
import { ArticleImage } from "@/components/ArticleImage";
import { TrendingArticles } from "@/components/TrendingArticles";
import { NewsletterSignup } from "@/components/NewsletterSignup";

import logoWhite from "@assets/logo-white-transparent.png";

// Helper to resolve image URLs
const getImageUrl = (url?: string | null) => {
    if (!url) return "/placeholder-16x9.png";
    if (url.startsWith("http")) return url;
    return `/uploads/${url}`;
};

// Helper to resolve journalist image URLs (usually in assets)
const getJournalistImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    if (url.startsWith("/assets/")) return url;
    return `/assets/${url}`;
};

const VALID_CATEGORIES = ["crime", "local", "tourism", "politics", "economy", "traffic", "weather", "business", "events", "national"];

export default function HomeNew() {
    const [, params] = useRoute("/:category");
    const category = params?.category?.toLowerCase();
    const [activeTab, setActiveTab] = useState("all");
    const [displayCount, setDisplayCount] = useState(12);
    const [searchOpen, setSearchOpen] = useState(false);

    // Validate category
    if (category && !VALID_CATEGORIES.includes(category)) {
        return <NotFound />;
    }

    // Fetch Articles
    const { data: allArticles = [], isLoading } = useQuery<ArticleListItem[]>({
        queryKey: category ? [`/api/articles/category/${category}`] : ["/api/articles"],
    });

    // Fetch Journalists
    const { data: journalists = [] } = useQuery<Journalist[]>({
        queryKey: ["/api/journalists"],
    });

    // Create journalist lookup map
    const journalistMap = useMemo(() => {
        const map = new Map<string, Journalist>();
        journalists.forEach(j => map.set(j.id, j));
        return map;
    }, [journalists]);

    // Sort articles by date (newest first)
    const articles = useMemo(() => {
        return [...allArticles].sort((a, b) => {
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
    }, [allArticles]);

    // Filter out child stories (updates) from the main feed
    const filteredArticles = useMemo(() => {
        return articles.filter(a => !a.mergedIntoId && (!a.seriesId || a.isParentStory));
    }, [articles]);

    // Logic for "Breaking News" (Hero)
    // Priority:
    // 1. Score 5 published within last 6 hours -> "Breaking News"
    // 2. Most recent Score 4+ -> "Top Story"
    // 3. Newest article
    const heroArticle = useMemo(() => {
        if (filteredArticles.length === 0) return null;

        const now = new Date();
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

        // Priority 1: Score 5 published within last 6 hours (fresh breaking news)
        const recentBreaking = filteredArticles.find(a =>
            (a.interestScore ?? 0) >= 5 && new Date(a.publishedAt) > sixHoursAgo
        );
        if (recentBreaking) return recentBreaking;

        // Priority 2: Most recent Score 4+ (includes older Score 5 stories)
        const highInterest = filteredArticles.find(a => (a.interestScore ?? 0) >= 4);
        if (highInterest) return highInterest;

        // Priority 3: Newest article if no high-interest stories
        return filteredArticles[0];
    }, [filteredArticles]);

    // Logic for "Side Stories" (Next 3 important stories)
    const sideStories = useMemo(() => {
        if (!heroArticle) return [];
        return filteredArticles
            .filter(a => a.id !== heroArticle.id)
            .slice(0, 3);
    }, [filteredArticles, heroArticle]);

    // Logic for "On the Radar" (The main feed)
    const radarArticles = useMemo(() => {
        if (!heroArticle) return [];
        const excludeIds = new Set([heroArticle.id, ...sideStories.map(a => a.id)]);

        let filtered = filteredArticles.filter(a => !excludeIds.has(a.id));

        // Client-side tab filtering
        if (activeTab !== "all") {
            filtered = filtered.filter(a => a.category.toLowerCase() === activeTab);
        }

        return filtered.slice(0, displayCount);
    }, [filteredArticles, heroArticle, sideStories, activeTab, displayCount]);

    // Timeline/Live Stories - Only show ACTIVE timelines (autoMatchEnabled = true)
    // Ended timelines (autoMatchEnabled = false) are hidden from the Live Updates section
    const liveStories = useMemo(() => {
        return filteredArticles.filter(a => a.isParentStory && a.seriesId && a.autoMatchEnabled === true).slice(0, 6);
    }, [filteredArticles]);

    const hasMore = filteredArticles.length > (1 + 3 + radarArticles.length);

    // Helper to get article URL
    const getArticleUrl = (article: ArticleListItem) => {
        if (article.seriesId && article.isParentStory) {
            return `/story/${article.seriesId}`;
        }
        return `/${article.category.toLowerCase()}/${article.slug || article.id}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
            {/* Navigation Bar - Glass Effect */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo Area */}
                        <Link href="/">
                            <div className="flex items-center gap-2 cursor-pointer">
                                <img src={logoWhite} alt="Phuket Radar" className="h-14 w-auto object-contain" />
                            </div>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link href="/">
                                <a className={`text-sm font-medium transition-colors relative group ${!category ? "text-white" : "text-zinc-400 hover:text-white"}`}>
                                    Home
                                    <span className={`absolute -bottom-5 left-0 w-full h-0.5 bg-blue-500 transition-transform duration-300 ${!category ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
                                </a>
                            </Link>
                            {["Crime", "Local", "Business", "Tourism", "Politics", "Economy", "Traffic", "Weather"].map((item) => (
                                <Link key={item} href={`/${item.toLowerCase()}`}>
                                    <a className={`text-sm font-medium transition-colors relative group ${category === item.toLowerCase() ? "text-white" : "text-zinc-400 hover:text-white"
                                        }`}>
                                        {item}
                                        <span className={`absolute -bottom-5 left-0 w-full h-0.5 bg-blue-500 transition-transform duration-300 ${category === item.toLowerCase() ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                            }`} />
                                    </a>
                                </Link>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="p-2 text-zinc-400 hover:text-white transition-colors"
                                aria-label="Search articles"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                            <button className="md:hidden p-2 text-zinc-400 hover:text-white">
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* Breaking News - Hero Section */}
                {heroArticle && (
                    <section className="mb-16">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${(heroArticle.interestScore ?? 0) >= 5 ? "bg-red-400" : "bg-blue-400"
                                    }`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${(heroArticle.interestScore ?? 0) >= 5 ? "bg-red-500" : "bg-blue-500"
                                    }`}></span>
                            </span>
                            <h2 className={`text-xs font-bold tracking-widest uppercase ${(heroArticle.interestScore ?? 0) >= 5 ? "text-red-500" : "text-blue-500"
                                }`}>
                                {(heroArticle.interestScore ?? 0) >= 5 ? "Breaking News" : "Top Story"}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Main Hero Card */}
                            <div className="lg:col-span-8 h-full">
                                <Link href={getArticleUrl(heroArticle)}>
                                    <a className="block h-full group cursor-pointer">
                                        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-4 border border-white/10 shadow-2xl shadow-blue-900/10 h-full">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
                                            <img
                                                src={getImageUrl(heroArticle.imageUrl || heroArticle.videoThumbnail)}
                                                alt={heroArticle.title}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 z-20 w-full">
                                                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 text-sm text-blue-400 font-medium flex-wrap">
                                                    <span className="bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 backdrop-blur-md uppercase text-[10px] sm:text-xs">
                                                        {heroArticle.category}
                                                    </span>
                                                    {heroArticle.isDeveloping && (
                                                        <span className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20 backdrop-blur-md uppercase text-[10px] sm:text-xs text-red-500 animate-pulse">
                                                            Live Updates
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 text-zinc-400 text-xs sm:text-sm">
                                                        <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(heroArticle.publishedAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2 sm:mb-3 group-hover:text-blue-100 transition-colors">
                                                    {heroArticle.storySeriesTitle || heroArticle.title}
                                                </h1>
                                                <p className="text-sm sm:text-base md:text-lg text-zinc-300 line-clamp-2 max-w-3xl hidden sm:block">
                                                    {heroArticle.excerpt}
                                                </p>
                                            </div>
                                        </div>
                                    </a>
                                </Link>
                            </div>

                            {/* Side Stories - Compact List */}
                            <div className="lg:col-span-4 flex flex-col gap-6">
                                {sideStories.map((article) => (
                                    <Link key={article.id} href={getArticleUrl(article)}>
                                        <a className="block group cursor-pointer flex gap-4 items-start p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 border border-white/5">
                                                <img
                                                    src={getImageUrl(article.imageUrl || article.videoThumbnail)}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                                                    <span className="text-blue-400 uppercase font-medium">{article.category}</span>
                                                    {article.isDeveloping && (
                                                        <span className="text-red-500 uppercase font-medium animate-pulse">Live</span>
                                                    )}
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                                                </div>
                                                <h3 className="text-sm md:text-base font-semibold text-zinc-100 leading-snug group-hover:text-blue-400 transition-colors line-clamp-3">
                                                    {article.storySeriesTitle || article.title}
                                                </h3>
                                            </div>
                                        </a>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* LIVE Section - Timeline Stories */}
                {liveStories.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-orange-400"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                            </span>
                            <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Live Updates</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {liveStories.map((article) => (
                                <Link key={article.id} href={getArticleUrl(article)}>
                                    <a className="group block h-full bg-zinc-900/40 hover:bg-zinc-900 border border-white/5 hover:border-orange-500/30 rounded-lg overflow-hidden transition-all duration-300 shadow-lg hover:shadow-orange-500/10">
                                        {article.imageUrl && (
                                            <div className="aspect-video overflow-hidden w-full">
                                                <ArticleImage
                                                    src={getImageUrl(article.imageUrl || article.videoThumbnail)}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                                                <span className="text-orange-400 uppercase font-medium">Timeline</span>
                                                <span>•</span>
                                                <span>{article.seriesUpdateCount || 0} updates</span>
                                            </div>
                                            <h3 className="text-base font-semibold text-zinc-100 leading-snug group-hover:text-orange-400 transition-colors line-clamp-2">
                                                {article.storySeriesTitle || article.title}
                                            </h3>
                                        </div>
                                    </a>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Trending Section */}
                {!category && <TrendingArticles />}

                {/* Newsletter Sign-up Section */}
                {!category && <NewsletterSignup />}

                {/* The "Radar" Feed - Mixed Density */}
                <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-white/10 pb-4 gap-4">
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-400"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest">On the Radar</h2>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                            {["All", "Local", "Crime", "Tourism", "Business"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase())}
                                    className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${activeTab === tab.toLowerCase()
                                        ? "bg-white text-black"
                                        : "text-zinc-400 hover:text-white hover:bg-white/10"
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {radarArticles.map((article) => {
                            const journalist = article.journalistId ? journalistMap.get(article.journalistId) : undefined;
                            return (
                                <Link key={article.id} href={getArticleUrl(article)}>
                                    <a className="block h-full">
                                        <div className="group bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col h-full">
                                            <div className="aspect-[3/2] overflow-hidden relative">
                                                <div className="absolute top-3 left-3 z-10 flex gap-2">
                                                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-white/10">
                                                        {article.category}
                                                    </span>
                                                    {article.isDeveloping && (
                                                        <span className="bg-red-600/80 backdrop-blur-md text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-red-500/20 animate-pulse">
                                                            Live
                                                        </span>
                                                    )}
                                                </div>
                                                <img
                                                    src={getImageUrl(article.imageUrl || article.videoThumbnail)}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                            <div className="p-5 flex flex-col flex-grow">
                                                <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-zinc-100 mb-2 leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                                                    {article.storySeriesTitle || article.title}
                                                </h3>
                                                <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-grow">
                                                    {article.excerpt}
                                                </p>
                                                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                                    <div className="flex items-center gap-2">
                                                        {journalist?.headshot ? (
                                                            <img
                                                                src={getJournalistImageUrl(journalist.headshot) || ""}
                                                                className="w-6 h-6 rounded-full object-cover"
                                                                alt={journalist.nickname}
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div className={`w-6 h-6 rounded-full bg-zinc-800 ${journalist?.headshot ? 'hidden' : ''}`} />
                                                        <span className="text-xs text-zinc-400">{journalist?.nickname || "Phuket Radar"}</span>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button className="text-zinc-500 hover:text-white transition-colors"><Share2 className="w-4 h-4" /></button>
                                                        <button className="text-zinc-500 hover:text-white transition-colors"><Bookmark className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                </Link>
                            );
                        })}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center mt-12">
                            <button
                                onClick={() => setDisplayCount(prev => prev + 12)}
                                className="px-8 py-3 bg-white/5 text-white border border-white/10 rounded-full font-medium hover:bg-white/10 transition-colors"
                            >
                                Load More Stories
                            </button>
                        </div>
                    )}
                </section>

            </main>

            {/* Search Dialog */}
            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </div>
    );
}
