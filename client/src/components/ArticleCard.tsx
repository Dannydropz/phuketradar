import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface ArticleCardProps {
  id: string;
  title: string;
  excerpt: string;
  imageUrl?: string;
  category: string;
  publishedAt: Date;
  isBreaking?: boolean;
}

export function ArticleCard({
  id,
  title,
  excerpt,
  imageUrl,
  category,
  publishedAt,
  isBreaking,
}: ArticleCardProps) {
  return (
    <Link href={`/article/${id}`}>
      <Card className="overflow-hidden hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer h-full flex flex-col" data-testid={`card-article-${id}`}>
        {imageUrl && (
          <div className="relative w-full aspect-video overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              data-testid={`img-article-${id}`}
            />
            {isBreaking && (
              <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground font-bold" data-testid="badge-breaking">
                BREAKING
              </Badge>
            )}
          </div>
        )}
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="secondary" data-testid={`badge-category-${id}`}>
              {category}
            </Badge>
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
