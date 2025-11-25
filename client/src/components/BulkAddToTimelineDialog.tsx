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
    selectedArticleIds: string[];
    onSuccess: () => void;
}

export function BulkAddToTimelineDialog({
    open,
    onOpenChange,
    selectedArticleIds,
    onSuccess,
}: BulkAddToTimelineDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<"existing" | "new">("existing");
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
    const [newSeriesTitle, setNewSeriesTitle] = useState<string>("");

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
                description: `Successfully added ${selectedArticleIds.length} stories to the timeline.`,
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
        mutationFn: async ({ title, articleIds }: { title: string; articleIds: string[] }) => {
            // 1. Create a new parent article
            const res = await apiRequest("POST", "/api/admin/articles", {
                title: title,
                content: "Live updates for " + title,
                excerpt: "Developing story: " + title,
                category: "Local", // Default, maybe let user pick?
                isPublished: true,
                sourceUrl: "manual-timeline",
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
                description: `Created "${newSeriesTitle}" and added ${selectedArticleIds.length} stories.`,
            });
            onSuccess();
            onOpenChange(false);
            setSelectedSeriesId("");
            setNewSeriesTitle("");
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
                articleIds: selectedArticleIds,
            });
        } else {
            if (!newSeriesTitle) return;
            createTimelineMutation.mutate({
                title: newSeriesTitle,
                articleIds: selectedArticleIds,
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
                        Add {selectedArticleIds.length} selected stories to a timeline.
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
