import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

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
        <div className="relative h-full min-h-[500px] rounded-lg overflow-hidden group cursor-pointer hover-elevate active-elevate-2" data-testid="hero-featured">
          <img
            src={featured.imageUrl}
            alt={featured.title}
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="img-hero-featured"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              {featured.isBreaking && (
                <Badge className="bg-destructive text-destructive-foreground font-bold" data-testid="badge-hero-breaking">
                  BREAKING
                </Badge>
              )}
              <Badge className="bg-white/20 backdrop-blur-md border-white/40 text-white" data-testid="badge-hero-category">
                {featured.category}
              </Badge>
              <div className="flex items-center text-sm text-white/90">
                <Clock className="w-3 h-3 mr-1" />
                <span data-testid="text-hero-time">{formatDistanceToNow(featured.publishedAt, { addSuffix: true })}</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight" data-testid="text-hero-title">
              {featured.title}
            </h1>
            <p className="text-lg text-white/90 max-w-3xl" data-testid="text-hero-excerpt">
              {featured.excerpt}
            </p>
          </div>
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
                  src={article.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23e5e7eb'/%3E%3C/svg%3E"}
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
