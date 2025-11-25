import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArticleImage } from "@/components/ArticleImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, Share2, ArrowLeft, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow, format, differenceInHours, isToday, isYesterday } from "date-fns";
import type { Article } from "@shared/schema";
import { useState } from "react";
import { Helmet } from "react-helmet";

// Format time for articles older than 24 hours
const formatTimeAgo = (date: Date) => {
    const hoursDifference = differenceInHours(new Date(), date);
    if (hoursDifference >= 24) {
        return `${hoursDifference} hours ago`;
    }
    return formatDistanceToNow(date, { addSuffix: true });
};

// Format time label for timeline (left side)
const formatTimeLabel = (date: Date) => {
    const hoursDifference = differenceInHours(new Date(), date);

    if (hoursDifference < 24) {
        // Less than 24 hours: show time
        return format(date, "HH:mm");
    } else if (hoursDifference < 48) {
        // 24-48 hours: show "Yesterday"
        return "Yesterday";
    } else {
        // Older: show date
        return format(date, "MMM d");
    }
};

interface TimelineResponse {
    seriesId: string;
    parentStory: Article;
    updates: Article[];
    updateCount: number;
}

export function TimelineStory() {
    const [, params] = useRoute("/story/:seriesId");
    const seriesId = params?.seriesId;
    const [expandedUpdates, setExpandedUpdates] = useState<Set<string>>(new Set());

    const { data: timeline, isLoading, error } = useQuery<TimelineResponse>({
        queryKey: ["/api/stories", seriesId, "timeline"],
        enabled: !!seriesId,
    });

    const toggleUpdate = (id: string) => {
        setExpandedUpdates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !timeline) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Timeline Not Found</h1>
                    <p className="text-muted-foreground mb-4">The requested story timeline could not be found.</p>
                    <Button onClick={() => window.history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </main>
                <Footer />
            </div>
        );
    }

    const { parentStory, updates } = timeline;

    // Filter out the parent story from updates if it's included (it shouldn't be, but safety first)
    const timelineUpdates = updates.filter(u => u.id !== parentStory.id);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Helmet>
                <title>{parentStory.storySeriesTitle || parentStory.title} - Live Updates | Phuket Radar</title>
                <meta name="description" content={`Live updates: ${parentStory.excerpt}`} />
            </Helmet>

            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <div className="relative bg-muted/30 border-b">
                    <div className="container mx-auto px-4 py-8 md:py-12">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <Badge className="bg-red-600 hover:bg-red-700 text-white animate-pulse px-3 py-1 text-sm font-bold tracking-wider uppercase">
                                    Live Updates
                                </Badge>
                                <span className="text-muted-foreground font-medium">
                                    Developing Story
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                                {parentStory.storySeriesTitle || parentStory.title}
                            </h1>

                            <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                                {parentStory.excerpt}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Last updated {formatDistanceToNow(new Date(updates[0]?.publishedAt || parentStory.publishedAt), { addSuffix: true })}
                                </div>
                                <Separator orientation="vertical" className="h-4" />
                                <div>
                                    {updates.length} updates
                                </div>
                            </div>

                            {parentStory.imageUrl && (
                                <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg mb-8">
                                    <ArticleImage
                                        src={parentStory.imageUrl}
                                        alt={parentStory.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Timeline Content */}
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-3xl mx-auto relative">
                        {/* Vertical Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border md:left-8" />

                        <div className="space-y-8">
                            {timelineUpdates.map((update, index) => (
                                <div key={update.id} className="relative pl-12 md:pl-28">
                                    {/* Timeline Dot */}
                                    <div className="absolute left-2.5 md:left-[55px] top-6 w-3 h-3 rounded-full bg-primary border-4 border-background shadow-sm z-10" />

                                    {/* Time Label - Desktop Only, moved further left */}
                                    <div className="absolute left-[-50px] top-5 w-16 text-right hidden md:block pr-6">
                                        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                                            {formatTimeLabel(new Date(update.publishedAt))}
                                        </span>
                                    </div>

                                    <Card className={`overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 ${index === 0 ? 'border-l-primary' : 'border-l-transparent'}`}>
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2 md:hidden">
                                                        <span className="text-xs font-bold text-muted-foreground">
                                                            {format(new Date(update.publishedAt), "HH:mm")}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            · {format(new Date(update.publishedAt), "MMM d")}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold leading-snug hover:text-primary transition-colors">
                                                        {update.title}
                                                    </h3>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="shrink-0"
                                                    onClick={() => toggleUpdate(update.id)}
                                                >
                                                    {expandedUpdates.has(update.id) ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>

                                            <div className={`prose prose-sm dark:prose-invert max-w-none ${expandedUpdates.has(update.id) ? '' : 'line-clamp-3'}`}>
                                                <div dangerouslySetInnerHTML={{ __html: update.content }} />
                                            </div>

                                            {!expandedUpdates.has(update.id) && (
                                                <Button
                                                    variant="ghost"
                                                    className="p-0 h-auto mt-2 text-primary hover:bg-transparent hover:underline"
                                                    onClick={() => toggleUpdate(update.id)}
                                                >
                                                    Read more
                                                </Button>
                                            )}

                                            {update.imageUrl && (
                                                <div className="mt-4 rounded-lg overflow-hidden bg-muted">
                                                    <img
                                                        src={update.imageUrl}
                                                        alt={update.title}
                                                        className="w-full h-auto object-cover max-h-96"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTimeAgo(new Date(update.publishedAt))}
                                                </span>
                                                <Button variant="ghost" size="sm" className="h-8 text-xs">
                                                    <Share2 className="w-3 h-3 mr-2" />
                                                    Share
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
