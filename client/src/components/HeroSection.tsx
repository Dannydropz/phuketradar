import type { MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleImage } from "./ArticleImage";
import { getCategoryBadgeVariant, mapLegacyCategory, getBreakingBadgeState } from "@/lib/utils";

interface HeroArticle {
  id: string;
  slug?: string | null;
  title: string;
  excerpt: string;
  imageUrl: string;
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
  const featuredUrl = featured.slug ? `/article/${featured.slug}` : `/article/${featured.id}`;
  const featuredMappedCategory = mapLegacyCategory(featured.category);
  const featuredCategoryVariant = getCategoryBadgeVariant(featuredMappedCategory);
  const featuredBadgeState = getBreakingBadgeState(featured.publishedAt, featured.interestScore);
  
  const handleFeaturedCategoryClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(`/category/${featuredMappedCategory.toLowerCase()}`);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
      <Link href={featuredUrl} className="lg:col-span-3">
        <div className="group cursor-pointer" data-testid="hero-featured">
          <div className="rounded-lg overflow-hidden mb-4">
            <ArticleImage
              src={featured.imageUrl}
              alt={featured.title}
              category={featuredMappedCategory}
              className="w-full h-[450px] object-cover"
              testId="img-hero-featured"
            />
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
            <Badge 
              variant={featuredCategoryVariant} 
              className="cursor-pointer"
              onClick={handleFeaturedCategoryClick}
              data-testid="badge-hero-category"
            >
              {featuredMappedCategory}
            </Badge>
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

      <div className="lg:col-span-2 flex flex-col gap-6">
        {sidebar.slice(0, 5).map((article) => {
          const articleUrl = article.slug ? `/article/${article.slug}` : `/article/${article.id}`;
          const mappedCategory = mapLegacyCategory(article.category);
          const categoryVariant = getCategoryBadgeVariant(mappedCategory);
          const badgeState = getBreakingBadgeState(article.publishedAt, article.interestScore);
          
          return (
          <Link key={article.id} href={articleUrl}>
            <div className="flex gap-4 group cursor-pointer" data-testid={`card-sidebar-${article.id}`}>
              <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden">
                <ArticleImage
                  src={article.imageUrl}
                  alt={article.title}
                  category={mappedCategory}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  {badgeState === "red" && (
                    <Badge 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold animate-pulse"
                      data-testid={`badge-sidebar-breaking-${article.id}`}
                    >
                      Breaking
                    </Badge>
                  )}
                  {badgeState === "grey" && (
                    <Badge 
                      variant="secondary"
                      className="bg-gray-500 dark:bg-gray-600 text-white text-xs font-semibold"
                      data-testid={`badge-sidebar-breaking-${article.id}`}
                    >
                      Breaking
                    </Badge>
                  )}
                  <Badge 
                    variant={categoryVariant} 
                    className="cursor-pointer text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLocation(`/category/${mappedCategory.toLowerCase()}`);
                    }}
                    data-testid={`badge-sidebar-category-${article.id}`}
                  >
                    {mappedCategory}
                  </Badge>
                </div>
                <h3 className="font-semibold text-base mb-1.5 line-clamp-2 group-hover:text-primary transition-colors" data-testid={`text-sidebar-title-${article.id}`}>
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
