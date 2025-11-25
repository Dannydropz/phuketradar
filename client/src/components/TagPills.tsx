import { Badge } from "./ui/badge";
import { tagToSlug, getTagUrl } from "@shared/core-tags";

interface TagPillsProps {
    tags: string[];
}

/**
 * Renders clickable tag pills for an article
 * Shows location and topic tags at the bottom of articles
 */
export function TagPills({ tags }: TagPillsProps) {
    if (!tags || tags.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
            <span className="text-sm text-muted-foreground mr-2">Tags:</span>
            {tags.map((tag) => (
                <a
                    key={tag}
                    href={getTagUrl(tag)}
                    className="transition-transform hover:scale-105"
                >
                    <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    >
                        {tag}
                    </Badge>
                </a>
            ))}
        </div>
    );
}
