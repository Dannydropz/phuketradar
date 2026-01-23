import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleImage } from "./ArticleImage";
import { mapLegacyCategory, getCategoryBadgeVariant } from "@/lib/utils";
import { buildArticleUrl } from "@shared/category-map";

interface ModernArticleCardProps {
    id: string;
    slug?: string | null;
    title: string;
    excerpt: string;
    imageUrl?: string;
    videoThumbnail?: string;
    category: string;
    publishedAt: Date;
    interestScore?: number | null;
    seriesId?: string | null;
    isParentStory?: boolean | null;
    sourceName?: string | null;
}

export function ModernArticleCard({
    id,
    slug,
    title,
    excerpt,
    imageUrl,
    videoThumbnail,
    category,
    publishedAt,
    interestScore,
    seriesId,
    isParentStory,
    sourceName,
}: ModernArticleCardProps) {
    // Build article URL
    const articleUrl = seriesId
        ? `/story/${isParentStory && slug ? slug : seriesId}`
        : buildArticleUrl({ category, slug: slug || null, id });

    const mappedCategory = mapLegacyCategory(category);
    const categoryVariant = getCategoryBadgeVariant(mappedCategory);

    // Determine card base color based on category
    const getCategoryColor = (cat: string) => {
        switch (cat.toLowerCase()) {
            case 'crime': return '#7f1d1d'; // dark red
            case 'traffic': return '#7c2d12'; // dark orange
            case 'weather': return '#1e3a8a'; // dark blue
            case 'local': return '#064e3b'; // dark emerald
            case 'tourism': return '#4c1d95'; // dark violet
            default: return '#1e293b'; // dark slate
        }
    };

    const cardColor = getCategoryColor(mappedCategory);

    return (
        <div className="card-tile group">
            {/* Premium Floating Badge */}
            <div className="flex justify-center mb-4">
                <div className="badge-glow-container">
                    <span className="badge-glow-text">
                        {interestScore && interestScore >= 4 ? 'RADAR HOT' : mappedCategory.toUpperCase()}
                    </span>
                </div>
            </div>

            <Link href={articleUrl}>
                <div className="flip-card">
                    <div className="flip-card-inner">
                        {/* FRONT: Visual High-Fidelity Card */}
                        <div
                            className="flip-card-front card-radial-texture"
                            style={{ background: `linear-gradient(135deg, ${cardColor}, #050505)` }}
                        >
                            <div className="flex justify-between items-start z-10 w-full">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white box-shadow-sm flex items-center justify-center p-1 overflow-hidden">
                                        <div className="w-full h-full rounded-sm bg-blue-900 flex items-center justify-center">
                                            <span className="text-[6px] text-white font-bold tracking-tighter">RADAR</span>
                                        </div>
                                    </div>
                                    <span className="text-white text-xs font-bold tracking-tight uppercase">Phuket.Radar</span>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    {/* Realistic Silver Chip */}
                                    <div className="w-10 h-8 rounded-md bg-gradient-to-br from-gray-200 via-gray-400 to-gray-500 border border-gray-300/30 relative overflow-hidden shadow-inner">
                                        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-black/10"></div>
                                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/10"></div>
                                        <div className="absolute inset-2 border border-black/5 rounded-sm"></div>
                                    </div>

                                    {/* Contactless Icon */}
                                    <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 18a6 6 0 0 1-6-6M15 18a9 9 0 0 1-9-9M18 18a12 12 0 0 1-12-12" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>

                            <div className="mt-auto z-10 w-full">
                                <div className="card-numbers-dots mb-1">
                                    •••• •••• •••• 4242
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-bold text-white/60 tracking-widest uppercase mb-1">CARD HOLDER</span>
                                        <h4 className="text-white text-[10px] font-black tracking-tight drop-shadow-lg max-w-[120px] truncate uppercase">
                                            {title}
                                        </h4>
                                    </div>
                                    <div className="text-white font-black italic text-xl tracking-tighter opacity-90 drop-shadow-sm">
                                        VISA
                                    </div>
                                </div>
                            </div>

                            {/* Holographic light effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        </div>

                        {/* BACK: Story Intel */}
                        <div className="flip-card-back p-5 bg-[#121212] border-white/5 shadow-2xl">
                            <div>
                                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                    <span className="text-[8px] font-black text-primary tracking-widest uppercase">{mappedCategory} INTEL</span>
                                    <span className="text-[10px] font-medium text-white/40">{formatDistanceToNow(publishedAt, { addSuffix: true })}</span>
                                </div>
                                <h4 className="back-title text-[15px] leading-tight mb-3 font-black text-white">{title}</h4>
                                <p className="back-excerpt text-[11px] opacity-60 leading-relaxed line-clamp-4">{excerpt}</p>
                            </div>

                            <div className="mt-auto pt-4 flex items-center justify-between">
                                <div className="flex items-center text-[9px] font-black text-primary group-hover:translate-x-1 transition-transform tracking-widest uppercase">
                                    Launch Intel <ArrowRight className="w-3 h-3 ml-1" />
                                </div>
                                <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[8px] font-bold opacity-30">
                                    {interestScore || 1}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>

            {/* High-Fidelity Action Buttons */}
            <div className="card-actions-row mt-6">
                <Link href={articleUrl} className="flex-1">
                    <button className="action-btn-mockup btn-orange">VIEW DETAILS</button>
                </Link>
                <button className="action-btn-mockup btn-green">GET INTEL</button>
            </div>
        </div>
    );
}

