import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Check, FileText } from "lucide-react";
import type { Article } from "@shared/schema";

export default function AdminInsights() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [generatedInsight, setGeneratedInsight] = useState<any>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedExcerpt, setEditedExcerpt] = useState("");

  // Fetch recent breaking news articles (last 7 days)
  const { data: articles, isLoading: loadingArticles } = useQuery<Article[]>({
    queryKey: ['/api/admin/articles'],
  });

  const recentBreakingNews = articles?.filter(a => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(a.publishedAt) >= sevenDaysAgo && a.articleType === 'breaking';
  }).slice(0, 20) || [];

  // Generate Insight mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/insights/generate', {
        topic,
        sourceArticleIds: Array.from(selectedArticles),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setGeneratedInsight(data.insight);
      setEditedTitle(data.insight.title);
      setEditedContent(data.insight.content);
      setEditedExcerpt(data.insight.excerpt);
      toast({
        title: "Insight Generated!",
        description: "Review and edit before publishing.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate Insight",
      });
    },
  });

  // Publish Insight mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/insights/publish', {
        title: editedTitle,
        content: editedContent,
        excerpt: editedExcerpt,
        relatedArticleIds: generatedInsight.relatedArticleIds,
        sources: generatedInsight.sources,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Insight Published!",
        description: "Your Insight article is now live.",
      });
      // Reset form
      setTopic("");
      setSelectedArticles(new Set());
      setGeneratedInsight(null);
      setEditedTitle("");
      setEditedContent("");
      setEditedExcerpt("");
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Publishing Failed",
        description: error.message || "Failed to publish Insight",
      });
    },
  });

  const toggleArticle = (id: string) => {
    const newSelection = new Set(selectedArticles);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedArticles(newSelection);
  };

  const canGenerate = topic.trim().length > 0 && selectedArticles.size > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          Generate Phuket Radar Insight
        </h1>
        <p className="text-muted-foreground">
          Create a 300-400 word analytical piece combining your breaking news with context from English sources
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Input Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Topic & Source Selection</CardTitle>
              <CardDescription>
                Choose your topic and select related breaking news articles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  data-testid="input-insight-topic"
                  placeholder="e.g., Road accidents in Patong"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Select Source Articles ({selectedArticles.size} selected)</Label>
                <div className="mt-2 border rounded-md max-h-96 overflow-y-auto">
                  {loadingArticles ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                  ) : recentBreakingNews.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No recent breaking news articles found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {recentBreakingNews.map((article) => (
                        <div
                          key={article.id}
                          className="p-3 hover-elevate cursor-pointer"
                          onClick={() => toggleArticle(article.id)}
                          data-testid={`article-select-${article.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedArticles.has(article.id)}
                              onCheckedChange={() => toggleArticle(article.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm line-clamp-2">
                                {article.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(article.publishedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!canGenerate || generateMutation.isPending}
                className="w-full"
                data-testid="button-generate-insight"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Insight...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Insight
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview/Edit */}
        <div>
          {generatedInsight ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Preview & Edit
                </CardTitle>
                <CardDescription>
                  Review and edit before publishing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    data-testid="input-edit-title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-excerpt">Excerpt</Label>
                  <Textarea
                    id="edit-excerpt"
                    data-testid="textarea-edit-excerpt"
                    value={editedExcerpt}
                    onChange={(e) => setEditedExcerpt(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-content">Content (Markdown)</Label>
                  <Textarea
                    id="edit-content"
                    data-testid="textarea-edit-content"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={15}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Word count: {editedContent.split(/\s+/).length}
                  </p>
                </div>

                <div className="pt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Related Articles:</strong> {generatedInsight.relatedArticleIds.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>English Sources:</strong> {generatedInsight.sources.length}
                  </p>
                </div>

                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="w-full"
                  data-testid="button-publish-insight"
                >
                  {publishMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Publish Insight
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Generate an Insight to preview it here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
