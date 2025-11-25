import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, Sparkles, Plus, X, Check, AlertCircle, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Article } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TimelineSuggestion {
    articleId: string;
    title: string;
    publishedAt: Date;
    similarityScore: number;
    reasoning: string;
}

interface TimelineManagerProps {
    article: Article;
    onClose: () => void;
}

export function TimelineManager({ article, onClose }: TimelineManagerProps) {
    const { toast } = useToast();
    const [createMode, setCreateMode] = useState(false);
    const [seriesTitle, setSeriesTitle] = useState("");
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [keywordInput, setKeywordInput] = useState("");

    // Fetch AI suggestions for this article
    const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery<TimelineSuggestion[]>({
        queryKey: ["/api/admin/stories", article.id, "suggest-related"],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/admin/stories/${article.id}/suggest-related`);
            return await res.json();
        },
        enabled: !!article.id,
    });

    // Search articles
    const { data: searchResults = [], isLoading: isSearching } = useQuery<Article[]>({
        queryKey: ["/api/admin/articles/search", searchQuery],
        queryFn: async () => {
            if (!searchQuery.trim()) return [];
            const res = await apiRequest("GET", `/api/admin/articles/search?q=${encodeURIComponent(searchQuery)}`);
            return await res.json();
        },
        enabled: searchQuery.trim().length > 2,
    });

    // Create new timeline mutation
    const createTimelineMutation = useMutation({
        mutationFn: async (data: { parentArticleId: string; seriesTitle: string }) => {
            const res = await apiRequest("POST", "/api/admin/stories/timeline", data);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
            toast({
                title: "Timeline Created",
                description: "Story timeline created successfully",
            });
            setCreateMode(false);
            setSeriesTitle("");
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to Create Timeline",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Add to timeline mutation
    const addToTimelineMutation = useMutation({
        mutationFn: async ({ articleId, seriesId }: { articleId: string; seriesId: string }) => {
            const res = await apiRequest("PATCH", `/api/admin/stories/${articleId}/add-to-timeline`, {
                seriesId,
            });
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
            toast({
                title: "Added to Timeline",
                description: "Article added to timeline successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to Add to Timeline",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Update timeline settings mutation
    const updateTimelineSettingsMutation = useMutation({
        mutationFn: async (data: { timelineTags: string[]; autoMatchEnabled: boolean }) => {
            const res = await apiRequest("PATCH", `/api/admin/articles/${article.id}`, data);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
            toast({
                title: "Settings Updated",
                description: "Timeline auto-match settings updated",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleCreateTimeline = () => {
        if (!seriesTitle.trim()) {
            toast({
                title: "Title Required",
                description: "Please enter a timeline title",
                variant: "destructive",
            });
            return;
        }

        createTimelineMutation.mutate({
            parentArticleId: article.id,
            seriesTitle: seriesTitle.trim(),
        });
    };

    const handleAddSuggestion = async (suggestionId: string) => {
        if (!article.seriesId) {
            toast({
                title: "No Timeline",
                description: "Please create a timeline first",
                variant: "destructive",
            });
            return;
        }

        await addToTimelineMutation.mutateAsync({
            articleId: suggestionId,
            seriesId: article.seriesId,
        });

        setSelectedSuggestions((prev) => {
            const newSet = new Set(prev);
            newSet.add(suggestionId);
            return newSet;
        });
    };

    const handleBulkAddSuggestions = async () => {
        if (!article.seriesId || selectedSuggestions.size === 0) return;

        for (const suggestionId of Array.from(selectedSuggestions)) {
            try {
                await addToTimelineMutation.mutateAsync({
                    articleId: suggestionId,
                    seriesId: article.seriesId!,
                });
            } catch (error) {
                console.error(`Failed to add ${suggestionId}:`, error);
            }
        }

        setSelectedSuggestions(new Set());
    };

    const toggleSuggestionSelection = (articleId: string) => {
        setSelectedSuggestions((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(articleId)) {
                newSet.delete(articleId);
            } else {
                newSet.add(articleId);
            }
            return newSet;
        });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Timeline Manager
                    </DialogTitle>
                    <DialogDescription>
                        {article.isParentStory
                            ? `Managing timeline: ${article.storySeriesTitle || "Untitled Timeline"}`
                            : article.seriesId
                                ? "This article is part of a timeline"
                                : "Create or add to a timeline"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Current Status */}
                    <Card className="p-4 bg-muted/50">
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Current Article</h3>
                            <p className="text-sm">{article.title}</p>
                            <div className="flex gap-2 flex-wrap">
                                {article.isParentStory && (
                                    <Badge className="bg-blue-500">Parent Story</Badge>
                                )}
                                {article.seriesId && !article.isParentStory && (
                                    <Badge variant="secondary">Timeline Update</Badge>
                                )}
                                {article.isDeveloping && (
                                    <Badge className="bg-orange-500">Developing Story</Badge>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Auto-Match Settings (Parent Story Only) */}
                    {article.isParentStory && (
                        <Card className="p-4 border-primary/20">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-purple-500" />
                                            <div>
                                                <h3 className="font-semibold text-sm">Auto-Match Settings</h3>
                                                <p className="text-xs text-muted-foreground">Automatically flag new stories for this timeline</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {article.autoMatchEnabled && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => updateTimelineSettingsMutation.mutate({
                                                        timelineTags: article.timelineTags || [],
                                                        autoMatchEnabled: false
                                                    })}
                                                >
                                                    Close Timeline
                                                </Button>
                                            )}
                                            <Label htmlFor="auto-match" className="text-sm">Enable Auto-Match</Label>
                                            <input
                                                id="auto-match"
                                                type="checkbox"
                                                className="toggle toggle-primary"
                                                checked={article.autoMatchEnabled || false}
                                                onChange={(e) => updateTimelineSettingsMutation.mutate({
                                                    timelineTags: article.timelineTags || [],
                                                    autoMatchEnabled: e.target.checked
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Match Keywords (Tags)</Label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {article.timelineTags?.map((tag, idx) => (
                                            <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                                                {tag}
                                                <button
                                                    onClick={() => {
                                                        const newTags = article.timelineTags?.filter((_, i) => i !== idx) || [];
                                                        updateTimelineSettingsMutation.mutate({
                                                            timelineTags: newTags,
                                                            autoMatchEnabled: article.autoMatchEnabled || false
                                                        });
                                                    }}
                                                    className="hover:bg-muted rounded-full p-0.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={keywordInput}
                                            onChange={(e) => setKeywordInput(e.target.value)}
                                            placeholder="Add keyword (e.g., 'flood', 'storm')"
                                            className="h-8 text-sm flex-1"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = keywordInput.trim();
                                                    if (val && !article.timelineTags?.includes(val)) {
                                                        const newTags = [...(article.timelineTags || []), val];
                                                        updateTimelineSettingsMutation.mutate({
                                                            timelineTags: newTags,
                                                            autoMatchEnabled: article.autoMatchEnabled || false
                                                        });
                                                        setKeywordInput('');
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            className="h-8"
                                            onClick={() => {
                                                const val = keywordInput.trim();
                                                if (val && !article.timelineTags?.includes(val)) {
                                                    const newTags = [...(article.timelineTags || []), val];
                                                    updateTimelineSettingsMutation.mutate({
                                                        timelineTags: newTags,
                                                        autoMatchEnabled: article.autoMatchEnabled || false
                                                    });
                                                    setKeywordInput('');
                                                }
                                            }}
                                            disabled={!keywordInput.trim() || article.timelineTags?.includes(keywordInput.trim())}
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {article.timelineTags && article.timelineTags.length > 0
                                            ? `New stories containing ${article.timelineTags.map(t => `"${t}"`).join(", ")} will be flagged for review.`
                                            : "Add keywords to automatically flag matching stories for review."}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Create Timeline Section */}
                    {!article.seriesId && (
                        <div className="space-y-4">
                            {!createMode ? (
                                <Button
                                    onClick={() => setCreateMode(true)}
                                    className="w-full"
                                    variant="outline"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create New Timeline
                                </Button>
                            ) : (
                                <Card className="p-4 border-primary/50">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="series-title">Timeline Title</Label>
                                            <Input
                                                id="series-title"
                                                placeholder="e.g., Southern Thailand Flooding Crisis"
                                                value={seriesTitle}
                                                onChange={(e) => setSeriesTitle(e.target.value)}
                                                className="mt-1"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                This will be the display title for the entire timeline
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleCreateTimeline}
                                                disabled={createTimelineMutation.isPending || !seriesTitle.trim()}
                                                className="flex-1"
                                            >
                                                {createTimelineMutation.isPending ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4 mr-2" />
                                                        Create Timeline
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setCreateMode(false);
                                                    setSeriesTitle("");
                                                }}
                                                variant="outline"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* AI Suggestions & Manual Search */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold">Add Related Articles</h3>
                            </div>
                            {selectedSuggestions.size > 0 && article.seriesId && (
                                <Button
                                    size="sm"
                                    onClick={handleBulkAddSuggestions}
                                    disabled={addToTimelineMutation.isPending}
                                >
                                    Add Selected ({selectedSuggestions.size})
                                </Button>
                            )}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search for articles to add..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Search Results */}
                        {searchQuery.trim().length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Results</h4>
                                {isSearching ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No articles found matching "{searchQuery}"</p>
                                ) : (
                                    <div className="space-y-2">
                                        {searchResults.map((result) => (
                                            <Card
                                                key={result.id}
                                                className={`p-3 transition-all hover:border-primary/50 ${selectedSuggestions.has(result.id) ? "border-primary bg-primary/5" : ""}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {article.seriesId && (
                                                        <div className="pt-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedSuggestions.has(result.id)}
                                                                onChange={() => toggleSuggestionSelection(result.id)}
                                                                className="w-4 h-4 rounded border-gray-300"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm mb-1 line-clamp-1">{result.title}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>{formatDistanceToNow(new Date(result.publishedAt), { addSuffix: true })}</span>
                                                            {result.seriesId && <Badge variant="outline" className="text-[10px] h-5">Already in timeline</Badge>}
                                                        </div>
                                                    </div>
                                                    {article.seriesId && !result.seriesId && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleAddSuggestion(result.id)}
                                                            disabled={addToTimelineMutation.isPending}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AI Suggestions */}
                        {!searchQuery && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Suggestions</h4>
                                {suggestionsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        <span className="ml-2 text-muted-foreground">Finding related articles...</span>
                                    </div>
                                ) : suggestions.length === 0 ? (
                                    <Card className="p-8 text-center bg-muted/20">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            No related articles found. Use search to find articles manually.
                                        </p>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
                                        {suggestions.map((suggestion) => (
                                            <Card
                                                key={suggestion.articleId}
                                                className={`p-4 transition-all hover:border-primary/50 ${selectedSuggestions.has(suggestion.articleId) ? "border-primary bg-primary/5" : ""
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {article.seriesId && (
                                                        <div className="pt-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedSuggestions.has(suggestion.articleId)}
                                                                onChange={() => toggleSuggestionSelection(suggestion.articleId)}
                                                                className="w-4 h-4 rounded border-gray-300"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm mb-1 line-clamp-2">{suggestion.title}</h4>
                                                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                                            <span>{formatDistanceToNow(new Date(suggestion.publishedAt), { addSuffix: true })}</span>
                                                            <span>•</span>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {Math.round(suggestion.similarityScore * 100)}% similar
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs text-xs">{suggestion.reasoning}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                    {article.seriesId && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAddSuggestion(suggestion.articleId)}
                                                            disabled={addToTimelineMutation.isPending}
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" />
                                                            Add
                                                        </Button>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose} variant="outline">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
