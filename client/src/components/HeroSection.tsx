import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { PLACEHOLDER_HERO, PLACEHOLDER_THUMBNAIL } from "@/lib/placeholders";

interface HeroArticle {
  id: string;
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      <Link href={`/article/${featured.id}`} className="lg:col-span-2">
        <div className="group cursor-pointer" data-testid="hero-featured">
          <div className="rounded-lg overflow-hidden mb-4 bg-muted">
            <img
              src={featured.imageUrl || PLACEHOLDER_HERO}
              alt={featured.title}
              className="w-full h-[400px] object-cover"
              data-testid="img-hero-featured"
            />
          </div>
          <div className="flex items-center gap-3 mb-3">
            {featured.isBreaking && (
              <Badge className="bg-destructive text-destructive-foreground font-bold" data-testid="badge-hero-breaking">
                BREAKING
              </Badge>
            )}
            <Badge variant="secondary" data-testid="badge-hero-category">
              {featured.category}
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
        {sidebar.map((article) => (
          <Link key={article.id} href={`/article/${article.id}`}>
            <div className="flex gap-3 group cursor-pointer" data-testid={`card-sidebar-${article.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {article.isBreaking && (
                    <Badge className="bg-destructive text-destructive-foreground text-xs font-bold">
                      BREAKING
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-sidebar-category-${article.id}`}>
                    {article.category}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors" data-testid={`text-sidebar-title-${article.id}`}>
                  {article.title}
                </h3>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span data-testid={`text-sidebar-time-${article.id}`}>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</span>
                </div>
              </div>
              <div className="w-20 h-20 flex-shrink-0">
                <img
                  src={article.imageUrl || PLACEHOLDER_THUMBNAIL}
                  alt={article.title}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
