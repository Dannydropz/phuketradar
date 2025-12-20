import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Flame, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Article } from "@shared/schema";

export function TrendingArticles() {
    const { data: trendingArticles = [], isLoading } = useQuery<Article[]>({
        queryKey: ["/api/articles/trending", { limit: 5 }],
        queryFn: async () => {
            const res = await fetch("/api/articles/trending?limit=5");
            if (!res.ok) throw new Error("Failed to fetch trending articles");
            return res.json();
        },
    });

    if (isLoading || trendingArticles.length === 0) return null;

    return (
        <section className="mb-12">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-purple-400"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </span>
                <h2 className="text-xs font-bold text-purple-500 uppercase tracking-widest">Trending Now</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {trendingArticles.map((article, index) => {
                    const isVideo = !!article.videoThumbnail || !!article.facebookEmbedUrl;
                    return (
                        <Link key={article.id} href={`/article/${article.slug}`}>
                            <div className="block group h-full cursor-pointer">
                                <div className="h-full bg-zinc-900/40 hover:bg-zinc-900 border border-white/5 hover:border-purple-500/30 rounded-lg overflow-hidden transition-all duration-300 shadow-lg hover:shadow-purple-500/10 flex flex-col">
                                    <div className="relative aspect-[4/3] overflow-hidden mb-3">
                                        {article.imageUrl || article.videoThumbnail ? (
                                            <img
                                                src={article.imageUrl || article.videoThumbnail || ""}
                                                alt={article.title}
                                                className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100 contrast-[1.10] saturate-[1.10]"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                <span className="text-zinc-500 text-xs">No Image</span>
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 z-10">
                                            <span className="bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                                                #{index + 1}
                                            </span>
                                        </div>
                                        {isVideo && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 flex items-center justify-center">
                                                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[9px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 pt-0 flex flex-col flex-grow">
                                        <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
                                            <span className="uppercase tracking-wider font-semibold text-[10px] text-purple-400">
                                                {article.category}
                                            </span>
                                            <span>•</span>
                                            <div className="flex items-center gap-1 text-purple-400">
                                                <Flame className="w-3 h-3" />
                                                <span className="font-medium">Hot</span>
                                            </div>
                                        </div>

                                        <h3 className="font-semibold text-sm leading-tight text-zinc-100 group-hover:text-purple-400 transition-colors line-clamp-3">
                                            {article.title}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
