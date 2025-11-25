import type { MouseEvent } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, AlertTriangle, AlertCircle, Info, Car, Shield, Cloud, Heart, Users, Palmtree, Building2, Landmark, Leaf } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleImage } from "./ArticleImage";
import { JournalistByline } from "./JournalistByline";
import { getCategoryBadgeVariant, mapLegacyCategory, getBreakingBadgeState } from "@/lib/utils";
import { buildArticleUrl } from "@shared/category-map";
import type { LucideIcon } from "lucide-react";

interface ArticleCardProps {
  id: string;
  slug?: string | null;
  title: string;
  excerpt: string;
  imageUrl?: string;
  category: string;
  publishedAt: Date;
  interestScore?: number | null;
  eventType?: string | null;
  severity?: string | null;
  isDeveloping?: boolean | null;
  lastEnrichedAt?: Date | null;
  journalist?: {
    id: string;
    nickname: string;
    surname: string;
    headshot: string;
  };
  seriesId?: string | null;
  isParentStory?: boolean | null;
}

// Helper function to get event type icon
function getEventIcon(eventType?: string | null): LucideIcon | null {
  if (!eventType) return null;

  switch (eventType.toLowerCase()) {
    case "accident":
      return Car;
    case "crime":
      return Shield;
    case "weather":
      return Cloud;
    case "health":
      return Heart;
    case "public order":
      return Users;
    case "tourism":
      return Palmtree;
    case "infrastructure":
      return Building2;
    case "government":
      return Landmark;
    case "environment":
      return Leaf;
    default:
      return null;
  }
}

// Helper function to get severity badge styling
function getSeverityStyle(severity?: string | null): { variant: "default" | "destructive" | "secondary" | "outline", className: string } {
  if (!severity) return { variant: "secondary", className: "" };

  switch (severity.toLowerCase()) {
    case "critical":
      return { variant: "destructive", className: "bg-red-600 hover:bg-red-700 text-white font-semibold" };
    case "high":
      return { variant: "default", className: "bg-orange-500 hover:bg-orange-600 text-white font-semibold" };
    case "medium":
      return { variant: "default", className: "bg-yellow-600 hover:bg-yellow-700 text-white" };
    case "low":
      return { variant: "secondary", className: "bg-blue-500 hover:bg-blue-600 text-white" };
    case "info":
    default:
      return { variant: "secondary", className: "" };
  }
}

// Helper function to get severity icon
function getSeverityIcon(severity?: string | null): LucideIcon | null {
  if (!severity) return null;

  switch (severity.toLowerCase()) {
    case "critical":
      return AlertTriangle;
    case "high":
      return AlertCircle;
    case "medium":
    case "low":
    case "info":
    default:
      return Info;
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
  interestScore,
  eventType,
  severity,
  isDeveloping,
  lastEnrichedAt,
  journalist,
  seriesId,
  isParentStory,
}: ArticleCardProps) {
  const [, setLocation] = useLocation();

  // Build article URL with category, or timeline URL if it's a series
  const articleUrl = seriesId
    ? `/story/${seriesId}`
    : buildArticleUrl({ category, slug: slug || null, id });

  // Map legacy categories to new topics
  const mappedCategory = mapLegacyCategory(category);

  // Get category-based badge variant
  const categoryVariant = getCategoryBadgeVariant(mappedCategory);

  // Determine breaking news badge state based on time and interest score
  const breakingBadgeState = getBreakingBadgeState(publishedAt, interestScore);

  const handleCategoryClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(`/${mappedCategory.toLowerCase()}`);
  };

  return (
    <Link href={articleUrl}>
      <Card className="overflow-hidden hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer h-full flex flex-col" data-testid={`card-article-${id}`}>
        <div className="relative w-full aspect-video overflow-hidden">
          <ArticleImage
            src={imageUrl}
            alt={title}
            category={mappedCategory}
            className="w-full h-full object-cover"
            testId={`img-article-${id}`}
          />
        </div>
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {breakingBadgeState === "red" && (
              <Badge
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold animate-pulse"
                data-testid={`badge-breaking-${id}`}
              >
                Breaking News
              </Badge>
            )}
            {breakingBadgeState === "grey" && (
              <Badge
                variant="secondary"
                className="bg-gray-500 dark:bg-gray-600 text-white font-semibold"
                data-testid={`badge-breaking-${id}`}
              >
                Breaking News
              </Badge>
            )}
            {isDeveloping && (
              <Badge
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold animate-pulse"
                data-testid={`badge-developing-${id}`}
              >
                Live Updates
              </Badge>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              <span data-testid={`text-time-${id}`}>
                {isDeveloping && lastEnrichedAt
                  ? `Updated ${formatDistanceToNow(new Date(lastEnrichedAt), { addSuffix: true })}`
                  : formatDistanceToNow(publishedAt, { addSuffix: true })}
              </span>
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-3 line-clamp-2" data-testid={`text-title-${id}`}>
            {title}
          </h3>
          <p className="text-muted-foreground line-clamp-3 mb-4 flex-1" data-testid={`text-excerpt-${id}`}>
            {excerpt}
          </p>
          {journalist && (
            <div className="mb-3">
              <JournalistByline
                journalistId={journalist.id}
                nickname={journalist.nickname}
                surname={journalist.surname}
                headshot={journalist.headshot}
                size="sm"
                asLink={false}
              />
            </div>
          )}
          <div className="flex items-center text-primary font-medium text-sm">
            Read more <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
