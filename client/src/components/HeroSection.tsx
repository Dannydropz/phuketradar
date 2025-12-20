import type { MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleImage } from "./ArticleImage";
import { getCategoryBadgeVariant, mapLegacyCategory, getBreakingBadgeState } from "@/lib/utils";
import { buildArticleUrl } from "@shared/category-map";

interface HeroArticle {
  id: string;
  slug?: string | null;
  title: string;
  excerpt: string;
  imageUrl: string;
  videoThumbnail?: string | null;
  facebookEmbedUrl?: string | null;
  category: string;
  publishedAt: Date;
  interestScore?: number | null;
}

interface HeroSectionProps {
  featured: HeroArticle;
  sidebar: HeroArticle[];
}

export function HeroSection({ featured, sidebar }: HeroSectionProps) {
  const [, setLocation] = useLocation();
  const featuredUrl = buildArticleUrl({ category: featured.category, slug: featured.slug || null, id: featured.id });
  const featuredMappedCategory = mapLegacyCategory(featured.category);
  const featuredCategoryVariant = getCategoryBadgeVariant(featuredMappedCategory);
  const featuredBadgeState = getBreakingBadgeState(featured.publishedAt, featured.interestScore);

  const isFeaturedVideo = !!featured.videoThumbnail || !!featured.facebookEmbedUrl;

  const handleFeaturedCategoryClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(`/${featuredMappedCategory.toLowerCase()}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
      <Link href={featuredUrl} className="md:col-span-3">
        <div className="group cursor-pointer" data-testid="hero-featured">
          <div className="relative rounded-lg overflow-hidden mb-4 aspect-video md:h-[450px]">
            {/* Category Badge Overlay - Top Right */}
            <div className="absolute top-4 right-4 z-10">
              <Badge
                variant={featuredCategoryVariant}
                className="font-bold tracking-tight shadow-xl backdrop-blur-lg bg-opacity-90 px-3 py-1.5 uppercase text-xs"
              >
                {featuredMappedCategory === "Foreigner Incident" ? "Expats" : featuredMappedCategory}
              </Badge>
            </div>

            <ArticleImage
              src={(featured.imageUrl || featured.videoThumbnail) ?? undefined}
              alt={featured.title}
              category={featuredMappedCategory}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 contrast-[1.12] brightness-[1.05]"
              testId="img-hero-featured"
              priority={true}
            />

            {/* Video Play Overlay */}
            {isFeaturedVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl transition-all group-hover:scale-110 group-hover:bg-white/30">
                  <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2" />
                </div>
                <div className="absolute bottom-6 left-6">
                  <Badge className="bg-red-600 text-white font-bold px-3 py-1 shadow-lg ring-2 ring-white/20">
                    🎬 VIDEO STORY
                  </Badge>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mb-3">
            {featuredBadgeState === "red" && (
              <Badge
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold animate-pulse"
                data-testid="badge-hero-breaking"
              >
                Breaking News
              </Badge>
            )}
            {featuredBadgeState === "grey" && (
              <Badge
                variant="secondary"
                className="bg-gray-500 dark:bg-gray-600 text-white font-semibold"
                data-testid="badge-hero-breaking"
              >
                Breaking News
              </Badge>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              <span data-testid="text-hero-time">{formatDistanceToNow(featured.publishedAt, { addSuffix: true })}</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors" data-testid="text-hero-title">
            {featured.title}
          </h1>
          <p className="text-base text-muted-foreground line-clamp-2" data-testid="text-hero-excerpt">
            {featured.excerpt}
          </p>
        </div>
      </Link>

      <div className="md:col-span-2 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Trending</h2>
          <div className="h-px flex-1 bg-border mx-4" />
        </div>
        {sidebar.slice(0, 5).map((article) => {
          const articleUrl = buildArticleUrl({ category: article.category, slug: article.slug || null, id: article.id });
          const mappedCategory = mapLegacyCategory(article.category);
          const badgeState = getBreakingBadgeState(article.publishedAt, article.interestScore);
          const isVideo = !!article.videoThumbnail || !!article.facebookEmbedUrl;

          return (
            <Link key={article.id} href={articleUrl}>
              <div className="flex gap-4 group cursor-pointer" data-testid={`card-sidebar-${article.id}`}>
                <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                  <ArticleImage
                    src={(article.imageUrl || article.videoThumbnail) ?? undefined}
                    alt={article.title}
                    category={mappedCategory}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 contrast-[1.10]"
                  />
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {badgeState === "red" && (
                      <Badge
                        variant="destructive"
                        className="bg-red-600 text-white text-[10px] font-bold h-4 px-1.5 animate-pulse"
                      >
                        LIVE
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground border-muted-foreground/30 h-4 px-1">
                      {mappedCategory === "Foreigner Incident" ? "Expats" : mappedCategory}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors leading-snug" data-testid={`text-sidebar-title-${article.id}`}>
                    {article.title}
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span data-testid={`text-sidebar-time-${article.id}`}>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
