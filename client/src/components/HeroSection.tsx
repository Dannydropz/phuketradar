import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleImage } from "./ArticleImage";

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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
      <Link href={featuredUrl} className="lg:col-span-3">
        <div className="group cursor-pointer" data-testid="hero-featured">
          <div className="rounded-lg overflow-hidden mb-4">
            <ArticleImage
              src={featured.imageUrl}
              alt={featured.title}
              category={featured.category}
              className="w-full h-[450px] object-cover"
              testId="img-hero-featured"
            />
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
          const isFresh = (Date.now() - new Date(article.publishedAt).getTime()) < (8 * 60 * 60 * 1000);
          const isBreaking = article.category.toLowerCase() === "breaking";
          const showRed = isBreaking && isFresh;
          const articleUrl = article.slug ? `/article/${article.slug}` : `/article/${article.id}`;
          
          return (
          <Link key={article.id} href={articleUrl}>
            <div className="flex gap-4 group cursor-pointer" data-testid={`card-sidebar-${article.id}`}>
              <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden">
                <ArticleImage
                  src={article.imageUrl}
                  alt={article.title}
                  category={article.category}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base mb-1.5 line-clamp-3 group-hover:text-primary transition-colors" data-testid={`text-sidebar-title-${article.id}`}>
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
