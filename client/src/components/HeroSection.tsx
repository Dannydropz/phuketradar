import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import logoImage from "@assets/PhuketRadar_1759933943849.png";

interface HeroArticle {
  id: string;
  slug?: string | null;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  publishedAt: Date;
  isBreaking?: boolean;
}

interface HeroSectionProps {
  featured: HeroArticle;
  sidebar: HeroArticle[];
}

export function HeroSection({ featured, sidebar }: HeroSectionProps) {
  // Check if featured article is fresh (< 8 hours old)
  const featuredIsFresh = (Date.now() - new Date(featured.publishedAt).getTime()) < (8 * 60 * 60 * 1000);
  const featuredIsBreaking = featured.category.toLowerCase() === "breaking";
  const featuredShowRed = featuredIsBreaking && featuredIsFresh;
  
  const featuredUrl = featured.slug ? `/article/${featured.slug}` : `/article/${featured.id}`;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      <Link href={featuredUrl} className="lg:col-span-2">
        <div className="group cursor-pointer" data-testid="hero-featured">
          <div className="rounded-lg overflow-hidden mb-4 bg-muted">
            {featured.imageUrl ? (
              <img
                src={featured.imageUrl}
                alt={featured.title}
                className="w-full h-[400px] object-cover"
                data-testid="img-hero-featured"
              />
            ) : (
              <div className="w-full h-[400px] flex items-center justify-center">
                <img
                  src={logoImage}
                  alt="Phuket Radar"
                  className="w-1/3 h-auto opacity-30"
                  data-testid="img-hero-featured"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <Badge 
              variant={featuredShowRed ? "destructive" : "secondary"} 
              className={featuredShowRed ? "font-bold" : ""}
              data-testid="badge-hero-category"
            >
              {featuredIsBreaking ? (featuredShowRed ? "BREAKING" : "Breaking") : featured.category}
            </Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              <span data-testid="text-hero-time">{formatDistanceToNow(featured.publishedAt, { addSuffix: true })}</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight group-hover:text-primary transition-colors" data-testid="text-hero-title">
            {featured.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl" data-testid="text-hero-excerpt">
            {featured.excerpt}
          </p>
        </div>
      </Link>

      <div className="space-y-6">
        {sidebar.map((article) => {
          const isFresh = (Date.now() - new Date(article.publishedAt).getTime()) < (8 * 60 * 60 * 1000);
          const isBreaking = article.category.toLowerCase() === "breaking";
          const showRed = isBreaking && isFresh;
          const articleUrl = article.slug ? `/article/${article.slug}` : `/article/${article.id}`;
          
          return (
          <Link key={article.id} href={articleUrl}>
            <div className="flex gap-3 group cursor-pointer" data-testid={`card-sidebar-${article.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={showRed ? "destructive" : "secondary"} 
                    className={`text-xs ${showRed ? "font-bold" : ""}`}
                    data-testid={`badge-sidebar-category-${article.id}`}
                  >
                    {isBreaking ? (showRed ? "BREAKING" : "Breaking") : article.category}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors" data-testid={`text-sidebar-title-${article.id}`}>
                  {article.title}
                </h3>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span data-testid={`text-sidebar-time-${article.id}`}>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</span>
                </div>
              </div>
              <div className="w-20 h-20 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={logoImage}
                      alt="Phuket Radar"
                      className="w-3/4 h-auto opacity-30"
                    />
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
        })}
      </div>
    </div>
  );
}
