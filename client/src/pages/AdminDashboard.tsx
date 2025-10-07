import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Check, X, Eye, RefreshCw } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Article } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/admin/articles"],
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scrape");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      toast({
        title: "Scraping Complete",
        description: `Successfully processed ${data.articlesProcessed} articles`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Article> }) => {
      const res = await apiRequest("PATCH", `/api/admin/articles/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/articles/${id}/publish`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Article Published",
        description: "The article is now live on the site",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/articles/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      toast({
        title: "Article Deleted",
        description: "The article has been removed",
      });
    },
  });

  const handleScrape = () => {
    scrapeMutation.mutate();
  };

  const handleApprove = (id: string) => {
    publishMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handlePreview = (id: string) => {
    setLocation(`/article/${id}`);
  };

  const stats = {
    pending: articles.filter((a) => !a.isPublished).length,
    approved: articles.filter((a) => a.isPublished).length,
    total: articles.length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Review and manage scraped articles before publishing
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleScrape}
              disabled={scrapeMutation.isPending}
              data-testid="button-scrape"
            >
              {scrapeMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Scrape New Articles
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Review</p>
                  <p className="text-3xl font-bold" data-testid="stat-pending">{stats.pending}</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {stats.pending}
                </Badge>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Published</p>
                  <p className="text-3xl font-bold" data-testid="stat-approved">{stats.approved}</p>
                </div>
                <Badge className="bg-primary text-primary-foreground text-lg px-4 py-2">
                  {stats.approved}
                </Badge>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Articles</p>
                  <p className="text-3xl font-bold" data-testid="stat-total">{stats.total}</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {stats.total}
                </Badge>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Articles</h2>
              {articles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No articles yet. Click "Scrape New Articles" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-start gap-4 p-4 border border-border rounded-lg hover-elevate"
                      data-testid={`article-row-${article.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" data-testid={`badge-category-${article.id}`}>
                            {article.category}
                          </Badge>
                          <Badge
                            className={
                              article.isPublished
                                ? "bg-primary text-primary-foreground"
                                : ""
                            }
                            data-testid={`badge-status-${article.id}`}
                          >
                            {article.isPublished ? "published" : "pending"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-1 text-lg" data-testid={`text-title-${article.id}`}>
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {article.excerpt}
                        </p>
                        <a
                          href={article.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                          data-testid={`link-source-${article.id}`}
                        >
                          View original source
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePreview(article.id)}
                          data-testid={`button-preview-${article.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!article.isPublished && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleApprove(article.id)}
                              className="border-primary text-primary"
                              disabled={publishMutation.isPending}
                              data-testid={`button-approve-${article.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleReject(article.id)}
                              className="border-destructive text-destructive"
                              disabled={deleteMutation.isPending}
                              data-testid={`button-reject-${article.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
