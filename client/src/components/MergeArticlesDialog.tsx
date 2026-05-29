import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GitMerge, AlertTriangle, Sparkles, RefreshCw, Globe, FileText } from "lucide-react";
import type { Article, ArticleListItem } from "@shared/schema";

interface MergeArticlesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedArticles: ArticleListItem[];
  onSuccess: () => void;
}

export function MergeArticlesDialog({
  open,
  onOpenChange,
  selectedArticles,
  onSuccess,
}: MergeArticlesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullArticles, setFullArticles] = useState<Article[]>([]);
  const [primaryId, setPrimaryId] = useState<string>("");

  // Fetch full details (including content & originalContent) for all selected articles
  useEffect(() => {
    if (open && selectedArticles.length > 0) {
      const fetchAll = async () => {
        setLoading(true);
        try {
          const promises = selectedArticles.map(a =>
            apiRequest("GET", `/api/admin/articles/${a.id}`).then(res => res.json())
          );
          const results = await Promise.all(promises);
          setFullArticles(results);

          // Determine initial primary selection
          const published = results.filter(r => r.isPublished);
          if (published.length === 1) {
            // Force primary if exactly one is published
            setPrimaryId(published[0].id);
          } else if (published.length > 1) {
            // Multiple published, select the first published by default but let operator change it
            setPrimaryId(published[0].id);
          } else if (results.length > 0) {
            // None are published, select the first article by default
            setPrimaryId(results[0].id);
          }
        } catch (err) {
          console.error("Failed to fetch full articles for merge", err);
          toast({
            variant: "destructive",
            title: "Error Loading Details",
            description: "Could not fetch original source texts for the selected articles."
          });
          onOpenChange(false);
        } finally {
          setLoading(false);
        }
      };
      fetchAll();
    } else {
      setFullArticles([]);
      setPrimaryId("");
    }
  }, [open, selectedArticles, onOpenChange, toast]);

  // Merge Mutation
  const mergeMutation = useMutation({
    mutationFn: async (data: { primaryId: string; supplementaryIds: string[] }) => {
      const res = await apiRequest("POST", "/api/admin/articles/merge", data);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Merge failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✨ Merge Complete!",
        description: `Stories merged successfully into: "${data.article.title.substring(0, 50)}..."`
      });
      // Invalidate articles list to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles/needs-review"] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Merge error:", error);
      toast({
        variant: "destructive",
        title: "Merge Failed",
        description: error.message || "Failed to merge the selected stories."
      });
    }
  });

  const handleMerge = () => {
    if (!primaryId) {
      toast({
        variant: "destructive",
        title: "Primary Story Required",
        description: "Please choose which story will be the primary one."
      });
      return;
    }

    const supplementaryIds = fullArticles
      .map(a => a.id)
      .filter(id => id !== primaryId);

    mergeMutation.mutate({
      primaryId,
      supplementaryIds
    });
  };

  const publishedCount = fullArticles.filter(a => a.isPublished).length;
  const isForcedPrimary = publishedCount === 1;

  return (
    <Dialog open={open} onOpenChange={(val) => !mergeMutation.isPending && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[800px] border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b border-white/5">
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400 flex items-center gap-2">
            <GitMerge className="w-6 h-6 text-amber-400" />
            Merge Duplicate Stories
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 flex-1">
            <RefreshCw className="w-10 h-10 animate-spin text-amber-500" />
            <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading original source details...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {publishedCount > 1 && (
              <div className="flex items-start gap-2.5 p-3.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-0.5">Multiple Published Stories Selected</p>
                  You are merging multiple stories that are already published. Please choose which live URL/slug to preserve. The other published URL(s) will be tombstoned/removed.
                </div>
              </div>
            )}

            {isForcedPrimary && (
              <div className="flex items-start gap-2.5 p-3.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-0.5">Primary Choice Enforced</p>
                  The selected story with <Badge className="bg-primary hover:bg-primary ml-1 h-5 text-[10px]">published</Badge> status is automatically set as the primary story to prevent link breakage (protects SEO continuity).
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-zinc-200">
                1. Select the Primary Article (keeps its live slug/URL)
              </Label>
              <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="space-y-3">
                {fullArticles.map((article) => {
                  const isDisabled = isForcedPrimary && !article.isPublished;
                  return (
                    <div
                      key={article.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 ${
                        primaryId === article.id
                          ? "border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/5"
                          : isDisabled
                          ? "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-white/10 bg-background/50 hover:border-white/20"
                      }`}
                    >
                      <RadioGroupItem
                        value={article.id}
                        id={`primary-${article.id}`}
                        disabled={isDisabled}
                        className="mt-1 border-white/30 text-amber-500 focus:ring-amber-500/50"
                      />
                      <Label
                        htmlFor={`primary-${article.id}`}
                        className={`flex-1 grid gap-1.5 cursor-pointer ${isDisabled ? "cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground leading-snug">
                            {article.title}
                          </span>
                          <Badge variant={article.isPublished ? "default" : "secondary"}>
                            {article.isPublished ? "published" : "pending"}
                          </Badge>
                          {article.isPublished && (
                            <Badge className="bg-emerald-500 text-white flex items-center gap-0.5">
                              <Globe className="w-3 h-3" />
                              Live Link
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {article.excerpt}
                        </p>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
                <FileText className="w-4 h-4 text-amber-400" />
                2. Source Text Comparison
              </Label>
              <p className="text-xs text-muted-foreground">
                Sanity-check the Thai captions/contents below to confirm they belong to the same event. They will be concatenated and synthesized into a single, high-quality, non-duplicated news article.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fullArticles.map((article) => (
                  <Card
                    key={article.id}
                    className={`border-white/10 bg-background/30 overflow-hidden flex flex-col max-h-[220px] ${
                      primaryId === article.id ? "ring-1 ring-amber-500/40" : ""
                    }`}
                  >
                    <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground truncate max-w-[70%]">
                        {article.title}
                      </span>
                      <Badge className="text-[10px] h-4" variant={primaryId === article.id ? "default" : "outline"}>
                        {primaryId === article.id ? "★ Primary" : "Supplementary"}
                      </Badge>
                    </div>
                    <ScrollArea className="flex-1 p-3">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans select-text">
                        {article.originalContent || article.content || "(No source text)"}
                      </p>
                    </ScrollArea>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mergeMutation.isPending}
            className="border-white/10 hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={mergeMutation.isPending || loading || !primaryId}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20 px-6 flex items-center gap-2"
          >
            {mergeMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Merging &amp; Deep Enriching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Merge &amp; Deep Enrich
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
