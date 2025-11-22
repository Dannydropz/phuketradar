import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Search, Menu, Bell, Clock, MapPin, Share2, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ArticleListItem, Journalist } from "@shared/schema";
import NotFound from "@/pages/not-found";

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

const VALID_CATEGORIES = ["crime", "local", "tourism", "politics", "economy", "traffic", "weather", "business", "events"];

export default function HomeNew() {
    const [, params] = useRoute("/:category");
    const category = params?.category?.toLowerCase();
    const [activeTab, setActiveTab] = useState("all");
    const [displayCount, setDisplayCount] = useState(12);

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

    // Logic for "Breaking News" (Hero)
    // Priority: Score 5 -> Score 4 -> Newest
    const heroArticle = useMemo(() => {
        if (articles.length === 0) return null;
        const breaking = articles.find(a => (a.interestScore ?? 0) >= 5);
        if (breaking) return breaking;
        const highInterest = articles.find(a => (a.interestScore ?? 0) >= 4);
        if (highInterest) return highInterest;
        return articles[0];
    }, [articles]);

    // Logic for "Side Stories" (Next 3 important stories)
    const sideStories = useMemo(() => {
        if (!heroArticle) return [];
        return articles
            .filter(a => a.id !== heroArticle.id)
            .slice(0, 3);
    }, [articles, heroArticle]);

    // Logic for "On the Radar" (The main feed)
    const radarArticles = useMemo(() => {
        if (!heroArticle) return [];
        const excludeIds = new Set([heroArticle.id, ...sideStories.map(a => a.id)]);

        let filtered = articles.filter(a => !excludeIds.has(a.id));

        // Client-side tab filtering
        if (activeTab !== "all") {
            filtered = filtered.filter(a => a.category.toLowerCase() === activeTab);
        }

        return filtered.slice(0, displayCount);
    }, [articles, heroArticle, sideStories, activeTab, displayCount]);

    const hasMore = articles.length > (1 + 3 + radarArticles.length);

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
                                <img src={logoWhite} alt="Phuket Radar" className="h-10 w-auto object-contain" />
                            </div>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            {["News", "Business", "Tourism", "Events", "Crime"].map((item) => (
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
                            <button className="p-2 text-zinc-400 hover:text-white transition-colors">
                                <Search className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
                                <Bell className="w-5 h-5" />
                                {/* Show dot if there are high interest stories */}
                                {articles.some(a => (a.interestScore ?? 0) >= 4) && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050505]" />
                                )}
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
                                <Link href={`/${heroArticle.category.toLowerCase()}/${heroArticle.slug || heroArticle.id}`}>
                                    <a className="block h-full group cursor-pointer">
                                        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-4 border border-white/10 shadow-2xl shadow-blue-900/10 h-full">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
                                            <img
                                                src={getImageUrl(heroArticle.imageUrl)}
                                                alt={heroArticle.title}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                                                <div className="flex items-center gap-3 mb-3 text-sm text-blue-400 font-medium">
                                                    <span className="bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 backdrop-blur-md uppercase text-xs">
                                                        {heroArticle.category}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-zinc-400">
                                                        <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(heroArticle.publishedAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3 group-hover:text-blue-100 transition-colors">
                                                    {heroArticle.title}
                                                </h1>
                                                <p className="text-base md:text-lg text-zinc-300 line-clamp-2 max-w-3xl">
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
                                    <Link key={article.id} href={`/${article.category.toLowerCase()}/${article.slug || article.id}`}>
                                        <a className="block group cursor-pointer flex gap-4 items-start p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 border border-white/5">
                                                <img
                                                    src={getImageUrl(article.imageUrl)}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                                                    <span className="text-blue-400 uppercase font-medium">{article.category}</span>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                                                </div>
                                                <h3 className="text-sm md:text-base font-semibold text-zinc-100 leading-snug group-hover:text-blue-400 transition-colors line-clamp-3">
                                                    {article.title}
                                                </h3>
                                            </div>
                                        </a>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* The "Radar" Feed - Mixed Density */}
                <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-white/10 pb-4 gap-4">
                        <h2 className="text-2xl font-bold text-white">On the Radar</h2>
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
                                <Link key={article.id} href={`/${article.category.toLowerCase()}/${article.slug || article.id}`}>
                                    <a className="block h-full">
                                        <div className="group bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col h-full">
                                            <div className="aspect-[3/2] overflow-hidden relative">
                                                <div className="absolute top-3 left-3 z-10">
                                                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-white/10">
                                                        {article.category}
                                                    </span>
                                                </div>
                                                <img
                                                    src={getImageUrl(article.imageUrl)}
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
                                                    {article.title}
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
        </div>
    );
}
