import { useQuery } from "@tanstack/react-query";
import { ArticleCard } from "./ArticleCard";
import { Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ArticleListItem } from "@shared/schema";
import { buildArticleUrl } from "@shared/category-map";

interface SmartContextResult {
    type: 'TIMELINE' | 'FRESH_GRID' | 'TRENDING_LIST' | 'NULL';
    stories: ArticleListItem[];
    metadata?: {
        seriesId?: string;
        category?: string;
        timeframe?: string;
    };
}

interface SmartContextWidgetProps {
    articleId: string;
    currentArticleId: string;
}

/**
 * Smart Context Widget
 * Priority-based system to show relevant stories:
 * 1. Timeline (if part of a series)
 * 2. Fresh category news (48 hours)
 * 3. Trending stories (24 hours, most-viewed)
 * 4. Null (hide completely)
 */
export function SmartContextWidget({ articleId, currentArticleId }: SmartContextWidgetProps) {
    const { data: contextResult, isLoading } = useQuery<SmartContextResult>({
        queryKey: [`/api/articles/${articleId}/smart-context`],
        enabled: !!articleId,
    });

    if (isLoading) {
        return (
            <section className="bg-card border-y mt-12 py-12">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="animate-pulse">
                        <div className="h-8 bg-muted rounded w-48 mb-6"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-64 bg-muted rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Null state - completely hide the widget
    if (!contextResult || contextResult.type === 'NULL' || contextResult.stories.length === 0) {
        return null;
    }

    // Timeline View (Priority 1)
    if (contextResult.type === 'TIMELINE') {
        return (
            <section className="bg-card border-y mt-12 py-12">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h2 className="text-3xl font-bold mb-2">Developing Story</h2>
                    <p className="text-muted-foreground mb-8">Follow this story as it unfolds</p>

                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>

                        <div className="space-y-6">
                            {contextResult.stories.map((story) => {
                                const isCurrentStory = story.id === currentArticleId;
                                const articleUrl = buildArticleUrl({ category: story.category, slug: story.slug || null, id: story.id });

                                return (
                                    <div key={story.id} className="relative pl-10">
                                        {/* Timeline dot */}
                                        <div className={`absolute left-0 top-2 w-8 h-8 rounded-full flex items-center justify-center ${isCurrentStory
                                            ? 'bg-primary ring-4 ring-primary/20'
                                            : 'bg-muted border-2 border-border'
                                            }`}>
                                            <Clock className={`w-4 h-4 ${isCurrentStory ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                        </div>

                                        <a
                                            href={articleUrl}
                                            className={`block p-4 rounded-lg transition-colors ${isCurrentStory
                                                ? 'bg-primary/10 border-2 border-primary'
                                                : 'hover:bg-muted'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                                <Clock className="w-3 h-3" />
                                                <span>
                                                    {formatDistanceToNow(new Date(story.publishedAt), { addSuffix: true })}
                                                </span>
                                                {isCurrentStory && (
                                                    <span className="ml-auto text-primary font-semibold">You are here</span>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-lg mb-1">{story.title}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{story.excerpt}</p>
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Fresh Category News Grid (Priority 2)
    if (contextResult.type === 'FRESH_GRID') {
        const categoryName = contextResult.metadata?.category || 'this category';

        return (
            <section className="bg-card border-y mt-12 py-12">
                <div className="container mx-auto px-4 max-w-6xl">
                    <h2 className="text-3xl font-bold mb-2">Latest in {categoryName}</h2>
                    <p className="text-muted-foreground mb-6">Fresh stories from the past 48 hours</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contextResult.stories.map((story) => (
                            <ArticleCard
                                key={story.id}
                                id={story.id}
                                slug={story.slug}
                                title={story.title}
                                excerpt={story.excerpt}
                                imageUrl={story.imageUrl || undefined}
                                category={story.category}
                                publishedAt={new Date(story.publishedAt)}
                            />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Trending Stories List (Priority 3)
    if (contextResult.type === 'TRENDING_LIST') {
        return (
            <section className="bg-card border-y mt-12 py-12">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        <h2 className="text-3xl font-bold">Trending on Radar</h2>
                    </div>
                    <p className="text-muted-foreground mb-8">Most-viewed stories in the last 24 hours</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {contextResult.stories.map((story) => (
                            <ArticleCard
                                key={story.id}
                                id={story.id}
                                slug={story.slug}
                                title={story.title}
                                excerpt={story.excerpt}
                                imageUrl={story.imageUrl || undefined}
                                category={story.category}
                                publishedAt={new Date(story.publishedAt)}
                            />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return null;
}
