import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleImage } from "./ArticleImage";

interface ArticleCardProps {
  id: string;
  slug?: string | null;
  title: string;
  excerpt: string;
  imageUrl?: string;
  category: string;
  publishedAt: Date;
  isBreaking?: boolean;
  eventType?: string | null;
  severity?: string | null;
}

// Helper function to get severity badge color
function getSeverityVariant(severity?: string | null): "default" | "destructive" | "secondary" | "outline" {
  if (!severity) return "secondary";
  
  switch (severity.toLowerCase()) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    case "medium":
    case "low":
    case "info":
    default:
      return "secondary";
  }
}

export function ArticleCard({
  id,
  slug,
  title,
  excerpt,
  imageUrl,
  category,
  publishedAt,
  isBreaking,
  eventType,
  severity,
}: ArticleCardProps) {
  // Check if article is fresh (< 8 hours old) for time-based badge styling
  const isFresh = (Date.now() - new Date(publishedAt).getTime()) < (8 * 60 * 60 * 1000);
  const isBreakingCategory = category.toLowerCase() === "breaking";
  const showRedBadge = isBreakingCategory && isFresh;
  
  // Use slug for URL if available, fallback to ID
  const articleUrl = slug ? `/article/${slug}` : `/article/${id}`;
  
  return (
    <Link href={articleUrl}>
      <Card className="overflow-hidden hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer h-full flex flex-col" data-testid={`card-article-${id}`}>
        <div className="relative w-full aspect-video overflow-hidden">
          <ArticleImage
            src={imageUrl}
            alt={title}
            category={category}
            className="w-full h-full object-cover"
            testId={`img-article-${id}`}
          />
        </div>
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge 
              variant={showRedBadge ? "destructive" : "secondary"} 
              className={showRedBadge ? "font-bold" : ""}
              data-testid={`badge-category-${id}`}
            >
              {isBreakingCategory ? (showRedBadge ? "BREAKING" : "Breaking") : category}
            </Badge>
            {severity && (
              <Badge 
                variant={getSeverityVariant(severity)}
                data-testid={`badge-severity-${id}`}
              >
                {severity}
              </Badge>
            )}
            {eventType && (
              <Badge 
                variant="outline"
                data-testid={`badge-event-type-${id}`}
              >
                {eventType}
              </Badge>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              <span data-testid={`text-time-${id}`}>{formatDistanceToNow(publishedAt, { addSuffix: true })}</span>
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-3 line-clamp-2" data-testid={`text-title-${id}`}>
            {title}
          </h3>
          <p className="text-muted-foreground line-clamp-3 mb-4 flex-1" data-testid={`text-excerpt-${id}`}>
            {excerpt}
          </p>
          <div className="flex items-center text-primary font-medium text-sm">
            Read more <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
