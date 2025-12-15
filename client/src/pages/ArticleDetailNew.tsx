import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Search, Menu, Clock, Share2, ChevronLeft } from "lucide-react";
import { SearchDialog } from "@/components/SearchDialog";
import { SiFacebook } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import type { Article, ArticleListItem, Journalist } from "@shared/schema";
import { ArticleImage } from "@/components/ArticleImage";
import { FacebookEmbed } from "@/components/FacebookEmbed";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildArticleUrl } from "@shared/category-map";
import { TagPills } from "@/components/TagPills";
import logoWhite from "@assets/logo-white-transparent.png";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";

// Helper to resolve journalist image URLs
const getJournalistImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    if (url.startsWith("/assets/")) return url;
    return `/assets/${url}`;
};

export default function ArticleDetailNew() {
    const [, params] = useRoute("/:category/:slugOrId");
    const slugOrId = params?.slugOrId || "";
    const category = params?.category?.toLowerCase();
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);

    const { data: article, isLoading, error, isError } = useQuery<Article>({
        queryKey: ["/api/articles", slugOrId],
        enabled: !!slugOrId,
    });

    // Use lightweight sidebar endpoint instead of fetching ALL articles
    const { data: sidebarData } = useQuery<{ latestArticles: ArticleListItem[], relatedArticles: ArticleListItem[] }>({
        queryKey: [`/api/articles/${article?.id}/sidebar`],
        enabled: !!article?.id,
    });

    const { data: journalist } = useQuery<Journalist>({
        queryKey: ["/api/journalists", article?.journalistId],
        enabled: !!article?.journalistId,
    });

    // Track carousel current slide
    useEffect(() => {
        if (!api) return;
        setCurrent(api.selectedScrollSnap());
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap());
        });
    }, [api]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (isError || !article) {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                    <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
                    <p className="text-zinc-400 mb-6">
                        {error?.message || "The article you're looking for doesn't exist or has been removed."}
                    </p>
                    <Link href="/">
                        <a className="text-blue-400 hover:text-blue-300">← Back to Home</a>
                    </Link>
                </div>
            </div>
        );
    }

    // Use sidebar data from lightweight endpoint
    const relatedArticles = sidebarData?.relatedArticles || [];
    const latestArticles = sidebarData?.latestArticles || [];

    const baseUrl = import.meta.env.VITE_REPLIT_DEV_DOMAIN
        ? `https://${import.meta.env.VITE_REPLIT_DEV_DOMAIN}`
        : (typeof window !== 'undefined' ? window.location.origin : 'https://phuketradar.com');
    const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
    const canonicalUrl = `${baseUrl}${articlePath}`;

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: article.title,
                text: article.excerpt,
                url: canonicalUrl,
            });
        } else {
            navigator.clipboard.writeText(canonicalUrl);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
            <SEO
                title={article.title}
                description={article.excerpt}
                image={article.imageUrl || (article.imageUrls && article.imageUrls[0]) || undefined}
                url={canonicalUrl}
                type="article"
                publishedTime={article.publishedAt.toString()}
                author={journalist ? `${journalist.nickname} ${journalist.surname}` : undefined}
            />

            {/* JSON-LD Structured Data */}
            <JsonLd data={{
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                "headline": article.title,
                "image": article.imageUrl || (article.imageUrls && article.imageUrls[0]) || undefined,
                "datePublished": article.publishedAt.toString(),
                "dateModified": article.publishedAt.toString(),
                "author": journalist ? {
                    "@type": "Person",
                    "name": `${journalist.nickname} ${journalist.surname}`
                } : undefined,
                "publisher": {
                    "@type": "Organization",
                    "name": "Phuket Radar",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://phuketradar.com/logo-white.png"
                    }
                },
                "description": article.excerpt,
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": canonicalUrl
                }
            }} />

            {/* Navigation Bar - Glass Effect */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/">
                            <div className="flex items-center gap-2 cursor-pointer">
                                <img src={logoWhite} alt="Phuket Radar" className="h-14 w-auto object-contain" />
                            </div>
                        </Link>

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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Article Content */}
                    <article className="lg:col-span-8">
                        {/* Back Button */}
                        <Link href="/">
                            <a className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                                Back to Home
                            </a>
                        </Link>

                        {/* Breadcrumbs */}
                        <Breadcrumbs items={[
                            { label: "Home", href: "/" },
                            { label: article.category.charAt(0).toUpperCase() + article.category.slice(1), href: `/${article.category.toLowerCase()}` },
                            { label: article.title, href: `/${article.category.toLowerCase()}/${article.slug || article.id}` }
                        ]} />

                        {/* Article Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                {(() => {
                                    const publishedTime = new Date(article.publishedAt).getTime();
                                    const hoursSincePublish = (Date.now() - publishedTime) / (1000 * 60 * 60);
                                    const showBreakingBadge = (article.interestScore ?? 0) >= 4 && hoursSincePublish < 24;
                                    const showRedBadge = showBreakingBadge && hoursSincePublish < 6;

                                    if (showBreakingBadge) {
                                        return (
                                            <span className={`text-xs font-bold tracking-widest uppercase px-2 py-1 rounded ${showRedBadge ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                                }`}>
                                                Breaking News
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                                {article.isDeveloping && (
                                    <span className="text-xs font-bold tracking-widest uppercase px-2 py-1 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                        Developing Story
                                    </span>
                                )}
                                <span className="text-xs font-bold tracking-widest uppercase px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {article.category}
                                </span>
                                <div className="flex items-center text-sm text-zinc-500">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                                {article.title}
                            </h1>

                            {journalist && (
                                <Link href={`/journalist/${journalist.id}`}>
                                    <a className="flex items-center gap-3 mb-6 group cursor-pointer hover:opacity-80 transition-opacity">
                                        {journalist.headshot ? (
                                            <img
                                                src={getJournalistImageUrl(journalist.headshot) || ""}
                                                className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:border-blue-500/50 transition-colors"
                                                alt={journalist.nickname}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 group-hover:border-blue-500/50 transition-colors" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                                {journalist.nickname} {journalist.surname}
                                            </p>
                                            <p className="text-xs text-zinc-500">{journalist.beat}</p>
                                        </div>
                                    </a>
                                </Link>
                            )}

                            <p className="text-xl text-zinc-300 mb-6 leading-relaxed">
                                {article.excerpt}
                            </p>

                            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </button>
                            </div>
                        </div>

                        {/* Article Media - Facebook Embed > Native Video > Images */}
                        <div className="mb-8">
                            {/* Priority 1: Facebook Embed (for reels and videos that can't be scraped directly) */}
                            {(article as any).facebookEmbedUrl ? (
                                <FacebookEmbed
                                    url={(article as any).facebookEmbedUrl}
                                    sourceName={article.sourceName || undefined}
                                />
                            ) : article.videoUrl ? (
                                <div className="space-y-2">
                                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
                                        <video
                                            src={article.videoUrl}
                                            poster={article.videoThumbnail || article.imageUrl || (article.imageUrls ? article.imageUrls[0] : undefined)}
                                            controls
                                            playsInline
                                            className="w-full max-h-[600px] object-contain mx-auto"
                                        />
                                    </div>
                                    {/* Video Source Credit */}
                                    <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 py-2">
                                        <SiFacebook className="w-4 h-4 text-[#1877F2]" />
                                        <span>
                                            Video source:{" "}
                                            <a
                                                href={article.sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
                                            >
                                                {article.sourceName || "Facebook"}
                                            </a>
                                        </span>
                                    </div>
                                </div>
                            ) : article.imageUrls && article.imageUrls.length > 1 ? (
                                <div className="space-y-4">
                                    <Carousel className="w-full rounded-2xl overflow-hidden relative border border-white/10" setApi={setApi}>
                                        <CarouselContent>
                                            {article.imageUrls.map((imageUrl, index) => (
                                                <CarouselItem key={index}>
                                                    <div className="relative w-full">
                                                        <ArticleImage
                                                            src={imageUrl}
                                                            alt={`${article.title} - Image ${index + 1}`}
                                                            category={article.category}
                                                            className="w-full max-h-[600px] object-contain"
                                                        />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        <CarouselPrevious className="left-4" />
                                        <CarouselNext className="right-4" />
                                        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm z-10">
                                            {current + 1} / {article.imageUrls?.length ?? 0}
                                        </div>
                                    </Carousel>

                                    <div className="flex items-center justify-center gap-1">
                                        {article.imageUrls.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => api?.scrollTo(index)}
                                                className="p-2"
                                            >
                                                <div
                                                    className={`h-2 rounded-full transition-all ${index === current ? 'w-8 bg-blue-500' : 'w-2 bg-zinc-600'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : article.imageUrl || (article.imageUrls && article.imageUrls.length === 1) ? (
                                <div className="rounded-2xl overflow-hidden border border-white/10">
                                    <ArticleImage
                                        src={article.imageUrl || (article.imageUrls ? article.imageUrls[0] : '')}
                                        alt={article.title}
                                        category={article.category}
                                        className="w-full max-h-[600px] object-contain"
                                    />
                                </div>
                            ) : null}
                        </div>

                        {/* Article Content */}
                        <div
                            className="prose prose-lg prose-invert max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-a:text-blue-400 prose-strong:text-white prose-code:text-blue-400"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                        />

                        {/* Tags */}
                        {article.tags && article.tags.length > 0 && (
                            <TagPills tags={article.tags} />
                        )}

                        {/* Source */}
                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-sm text-zinc-500">
                            <SiFacebook className="w-5 h-5 text-[#1877F2]" />
                            <span>
                                Source: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">{article.sourceName || "Facebook"}</a> - translated from Thai
                            </span>
                        </div>
                    </article>

                    {/* Sidebar */}
                    <aside className="lg:col-span-4">
                        <div className="sticky top-24">
                            <h3 className="text-xl font-bold mb-6">Latest</h3>
                            <div className="space-y-4">
                                {latestArticles.map((latestArticle) => {
                                    const latestUrl = buildArticleUrl({ category: latestArticle.category, slug: latestArticle.slug || null, id: latestArticle.id });
                                    return (
                                        <a
                                            key={latestArticle.id}
                                            href={latestUrl}
                                            className="flex gap-3 group p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                                        >
                                            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 border border-white/5">
                                                <ArticleImage
                                                    src={latestArticle.imageUrl || undefined}
                                                    alt={latestArticle.title}
                                                    category={latestArticle.category}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm mb-1 line-clamp-2 text-zinc-100 group-hover:text-blue-400 transition-colors">
                                                    {latestArticle.title}
                                                </h4>
                                                <div className="flex items-center text-xs text-zinc-500">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {formatDistanceToNow(new Date(latestArticle.publishedAt), { addSuffix: true })}
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                    <section className="mt-16 pt-12 border-t border-white/10">
                        <h2 className="text-3xl font-bold mb-8">Related Articles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedArticles.map((relatedArticle) => {
                                const relatedUrl = buildArticleUrl({ category: relatedArticle.category, slug: relatedArticle.slug || null, id: relatedArticle.id });
                                return (
                                    <a
                                        key={relatedArticle.id}
                                        href={relatedUrl}
                                        className="group bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300"
                                    >
                                        <div className="aspect-[3/2] overflow-hidden relative">
                                            <ArticleImage
                                                src={relatedArticle.imageUrl || undefined}
                                                alt={relatedArticle.title}
                                                category={relatedArticle.category}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                        <div className="p-5">
                                            <h3 className="text-lg font-bold text-zinc-100 mb-2 leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                                                {relatedArticle.title}
                                            </h3>
                                            <p className="text-sm text-zinc-400 line-clamp-2">
                                                {relatedArticle.excerpt}
                                            </p>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </section>
                )}
            </main>

            {/* Search Dialog */}
            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </div>
    );
}
