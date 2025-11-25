import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Clock } from "lucide-react";
import type { Article } from "@shared/schema";

interface BulkAddToTimelineDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedArticles: Article[];
    onSuccess: () => void;
}

export function BulkAddToTimelineDialog({
    open,
    onOpenChange,
    selectedArticles,
    onSuccess,
}: BulkAddToTimelineDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<"existing" | "new">("existing");
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
    const [newSeriesTitle, setNewSeriesTitle] = useState<string>("");
    const [timelineTags, setTimelineTags] = useState<string>("");
    const [interestScore, setInterestScore] = useState<number>(4);
    const [selectedCoverImage, setSelectedCoverImage] = useState<string | null>(null);

    // Set default cover image when opening or changing selection
    if (open && !selectedCoverImage && selectedArticles.length > 0) {
        // Default to the most recent article's image (assuming sorted by date, or just first)
        // Better: Find the first one with an image
        const firstWithImage = selectedArticles.find(a => a.imageUrl);
        if (firstWithImage) {
            setSelectedCoverImage(firstWithImage.imageUrl);
        }
    }

    // Fetch active timelines (parent stories)
    const { data: timelines = [], isLoading: timelinesLoading } = useQuery<Article[]>({
        queryKey: ["/api/admin/timelines"],
        enabled: open,
    });

    // Mutation to add articles to an existing timeline
    const addToTimelineMutation = useMutation({
        mutationFn: async ({ seriesId, articleIds }: { seriesId: string; articleIds: string[] }) => {
            // We need to update each article individually
            const promises = articleIds.map((id) =>
                apiRequest("PATCH", `/api/admin/articles/${id}`, { seriesId })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
            toast({
                title: "Articles Added",
                description: `Successfully added ${selectedArticles.length} stories to the timeline.`,
            });
            onSuccess();
            onOpenChange(false);
            // Reset state
            setSelectedSeriesId("");
            setNewSeriesTitle("");
            setMode("existing");
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to Add",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation to create a NEW timeline
    // Ideally, this should create a parent story first, but for now, let's stick to the user's request
    // which implies they might want to create a new timeline container.
    // However, creating a timeline usually requires a parent article.
    // For simplicity and robustness, I'll implement "Create New" by asking the user to 
    // select ONE of the selected articles to be the PARENT, and the rest become children.
    // OR, simpler: just create a shell parent article? No, that's messy.
    // Let's stick to "Add to Existing" for now as it's the primary use case, 
    // and for "New", we can just guide them to use the "Manage Timeline" on a specific story.
    // Wait, the user asked: "or i can 'create new'". 
    // Let's implement "Create New" as: Create a new parent article with the given title, 
    // and add selected articles to it.

    const createTimelineMutation = useMutation({
        mutationFn: async ({ title, articleIds, imageUrl, tags, interestScore }: { title: string; articleIds: string[], imageUrl?: string | null, tags?: string[], interestScore?: number }) => {
            // 1. Create a new parent article
            const res = await apiRequest("POST", "/api/admin/articles", {
                title: title,
                content: "Live updates for " + title,
                excerpt: "Developing story: " + title,
                category: "Local", // Default, maybe let user pick?
                isPublished: true,
                sourceUrl: "manual-timeline",
                imageUrl: imageUrl, // Use selected cover image
                timelineTags: tags, // Save tags
                autoMatchEnabled: !!tags?.length, // Enable auto-match if tags provided
                interestScore: interestScore || 4, // Set interest score
            });
            const parentArticle = await res.json();

            // 2. Initialize it as a timeline
            const timelineRes = await apiRequest("POST", "/api/admin/stories/timeline", {
                parentArticleId: parentArticle.id,
                seriesTitle: title,
                seriesId: crypto.randomUUID(), // Generate a series ID
            });
            const timelineData = await timelineRes.json();

            // 3. Add selected articles to this new timeline
            const promises = articleIds.map((id) =>
                apiRequest("PATCH", `/api/admin/articles/${id}`, { seriesId: timelineData.seriesId })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/timelines"] });
            toast({
                title: "Timeline Created",
                description: `Created "${newSeriesTitle}" and added ${selectedArticles.length} stories.`,
            });
            onSuccess();
            onOpenChange(false);
            setSelectedSeriesId("");
            setNewSeriesTitle("");
            setTimelineTags("");
            setInterestScore(4);
            setSelectedCoverImage(null);
            setMode("existing");
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to Create",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = () => {
        if (mode === "existing") {
            if (!selectedSeriesId) return;
            addToTimelineMutation.mutate({
                seriesId: selectedSeriesId,
                articleIds: selectedArticles.map(a => a.id),
            });
        } else {
            if (!newSeriesTitle) return;
            createTimelineMutation.mutate({
                title: newSeriesTitle,
                articleIds: selectedArticles.map(a => a.id),
                imageUrl: selectedCoverImage,
                tags: timelineTags.split(",").map(t => t.trim()).filter(Boolean),
                interestScore,
            });
        }
    };

    const isPending = addToTimelineMutation.isPending || createTimelineMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add to Timeline</DialogTitle>
                    <DialogDescription>
                        Add {selectedArticles.length} selected stories to a timeline.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant={mode === "existing" ? "default" : "outline"}
                            onClick={() => setMode("existing")}
                            className="flex-1"
                        >
                            Existing Timeline
                        </Button>
                        <Button
                            variant={mode === "new" ? "default" : "outline"}
                            onClick={() => setMode("new")}
                            className="flex-1"
                        >
                            Create New
                        </Button>
                    </div>

                    {mode === "existing" ? (
                        <div className="grid gap-2">
                            <Label>Select Timeline</Label>
                            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a timeline..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {timelinesLoading ? (
                                        <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                                    ) : timelines.length === 0 ? (
                                        <div className="p-2 text-center text-sm text-muted-foreground">No active timelines found</div>
                                    ) : (
                                        timelines.map((t) => (
                                            <SelectItem key={t.seriesId} value={t.seriesId || ""}>
                                                {t.storySeriesTitle || t.title}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            <Label>Timeline Title</Label>
                            <Input
                                placeholder="e.g., Southern Thailand Flood Crisis"
                                value={newSeriesTitle}
                                onChange={(e) => setNewSeriesTitle(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                This will create a new parent story and add the selected articles to it.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                This will create a new parent story and add the selected articles to it.
                            </p>

                            <div className="grid gap-2">
                                <Label>Keywords (for Auto-Match)</Label>
                                <Input
                                    placeholder="e.g., flood, storm, heavy rain"
                                    value={timelineTags}
                                    onChange={(e) => setTimelineTags(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Comma-separated keywords. New stories matching these will be auto-flagged for review.
                                </p>
                            </div>

                            <Label className="mt-2">Cover Image</Label>
                            <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-1">
                                {selectedArticles.filter(a => a.imageUrl).map((article) => (
                                    <div
                                        key={article.id}
                                        className={`relative aspect-video cursor-pointer rounded-md overflow-hidden border-4 transition-all ${selectedCoverImage === article.imageUrl ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-muted"
                                            }`}
                                        onClick={() => setSelectedCoverImage(article.imageUrl)}
                                    >
                                        <img
                                            src={article.imageUrl!}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                        />
                                        {selectedCoverImage === article.imageUrl && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <div className="bg-primary text-primary-foreground rounded-full p-1">
                                                    <Plus className="w-6 h-6" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                                            <p className="text-white text-xs truncate">{article.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Select an image from the stories to use as the timeline cover.
                            </p>

                            <div className="grid gap-2">
                                <Label>Interest Score</Label>
                                <Select value={interestScore.toString()} onValueChange={(v) => setInterestScore(parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5 - Critical (Auto-post to Facebook)</SelectItem>
                                        <SelectItem value="4">4 - High (Auto-post to Facebook)</SelectItem>
                                        <SelectItem value="3">3 - Medium (Publish only)</SelectItem>
                                        <SelectItem value="2">2 - Low (Draft)</SelectItem>
                                        <SelectItem value="1">1 - Very Low (Draft)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Scores 4-5 will auto-post to Facebook when published.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending || (mode === "existing" ? !selectedSeriesId : !newSeriesTitle)}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === "existing" ? "Add to Timeline" : "Create & Add"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
