import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Check, X, Eye, RefreshCw, LogOut, EyeOff, Trash2, Facebook, Instagram, MessageCircle, Sparkles, AlertTriangle, Plus, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Article, Category } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { ArticleImage } from "@/components/ArticleImage";
import { ArticleEditor } from "@/components/ArticleEditor";

type ScrapeJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ScrapeJob {
  id: string;
  status: ScrapeJobStatus;
  startedAt: string;
  completedAt?: string;
  progress: {
    totalPosts: number;
    processedPosts: number;
    createdArticles: number;
    skippedNotNews: number;
  };
  error?: string;
}

// TODO: Re-enable 'needsReview' once database columns are added
type FilterType = 'all' | 'pending'; // | 'needsReview';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { logout, isAuthenticated } = useAdminAuth();
  const [currentJob, setCurrentJob] = useState<ScrapeJob | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const { data: articles = [], isLoading, error } = useQuery<Article[]>({
    queryKey: ["/api/admin/articles"],
    enabled: isAuthenticated,
    retry: 1,
  });

  // Debug: Log authentication state immediately
  console.log('[AUTH DEBUG] isAuthenticated:', isAuthenticated);

  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ["/api/admin/categories"],
    enabled: true, // Force it to always run
    retry: 2,
    staleTime: 0, // Don't cache
    refetchOnMount: true,
  });

  // Debug logging for categories
  useEffect(() => {
    console.log('[CATEGORIES] Query state:', {
      isAuthenticated,
      categoriesLoading,
      categoriesCount: categories.length,
      categoriesData: categories,
      hasError: !!categoriesError,
      errorMessage: categoriesError instanceof Error ? categoriesError.message : categoriesError
    });
  }, [isAuthenticated, categoriesLoading, categories, categoriesError]);

  // Log query errors for debugging
  useEffect(() => {
    if (error) {
      console.error("Admin articles query error:", error);
      toast({
        title: "Failed to Load Articles",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handle categories errors
  useEffect(() => {
    if (categoriesError) {
      console.error("Admin categories query error:", categoriesError);
      toast({
        title: "Failed to Load Categories",
        description: categoriesError instanceof Error ? categoriesError.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [categoriesError, toast]);

  // Poll for job status when there's an active job
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiRequest("GET", `/api/admin/scrape/status/${currentJob.id}`);
        const job = await res.json() as ScrapeJob;
        setCurrentJob(job);

        if (job.status === 'completed') {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
          toast({
            title: "Scraping Complete",
            description: `Created ${job.progress.createdArticles} new articles`,
          });
        } else if (job.status === 'failed') {
          toast({
            title: "Scraping Failed",
            description: job.error || "Unknown error",
            variant: "destructive",
          });
        }
      } catch (error) {
        // If 404, the job is gone from memory, which means it completed successfully
        if (error instanceof Error && error.message.includes('404')) {
          setCurrentJob(prev => prev ? { ...prev, status: 'completed', progress: { ...prev.progress, processedPosts: prev.progress.totalPosts } } : null);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
          toast({
            title: "Scraping Complete",
            description: "The scraping job has finished.",
          });
        } else {
          console.error("Error polling job status:", error);
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentJob?.id, currentJob?.status, toast]);

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scrape");
      return await res.json();
    },
    onSuccess: (data: { jobId: string }) => {
      setCurrentJob({
        id: data.jobId,
        status: 'pending',
        startedAt: new Date().toISOString(),
        progress: {
          totalPosts: 0,
          processedPosts: 0,
          createdArticles: 0,
          skippedNotNews: 0,
        },
      });
      toast({
        title: "Scraping Started",
        description: "Processing in background...",
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
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Article Published",
        description: article.facebookPostId
          ? "The article is now live on the site and has been posted to Facebook"
          : "The article is now live on the site. Use the Facebook button to post to social media.",
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
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Article Deleted",
        description: "The article has been removed",
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/articles/${id}`, { isPublished: false });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Article Unpublished",
        description: "The article has been hidden from the site",
      });
    },
  });

  const facebookPostMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/articles/${id}/facebook`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      toast({
        title: "Posted to Facebook",
        description: "The article has been shared on your Facebook page",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Facebook Post Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const batchFacebookPostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/facebook/batch-post");
      return await res.json();
    },
    onSuccess: (data: { total: number; successful: number; failed: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Batch Facebook Posting Complete",
        description: `Successfully posted ${data.successful} of ${data.total} articles to Facebook`,
      });
      if (data.failed > 0) {
        console.error("Failed posts:", data.errors);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Batch Facebook Post Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const instagramPostMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/articles/${id}/instagram`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      toast({
        title: "Posted to Instagram",
        description: "The article has been shared on your Instagram account",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Instagram Post Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const threadsPostMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/articles/${id}/threads`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      toast({
        title: "Posted to Threads",
        description: "The article has been shared on your Threads account",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Threads Post Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createArticleMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      excerpt: string;
      category: string;
      imageUrl?: string;
      imageUrls?: string[];
    }) => {
      const res = await apiRequest("POST", "/api/admin/articles", {
        ...data,
        sourceUrl: "manual-creation",
        isPublished: false,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      setEditorOpen(false);
      setEditingArticle(null);
      toast({
        title: "Article Created",
        description: "The article has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Article",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        title: string;
        content: string;
        excerpt: string;
        category: string;
        imageUrl?: string;
        imageUrls?: string[];
      };
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/articles/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      setEditorOpen(false);
      setEditingArticle(null);
      toast({
        title: "Article Updated",
        description: "The article has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Article",
        description: error.message,
        variant: "destructive",
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

  const handleUnpublish = (id: string) => {
    unpublishMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handlePreview = (article: Article) => {
    setPreviewArticle(article);
  };

  const handlePostToFacebook = (id: string) => {
    facebookPostMutation.mutate(id);
  };

  const handlePostToInstagram = (id: string) => {
    instagramPostMutation.mutate(id);
  };

  const handlePostToThreads = (id: string) => {
    threadsPostMutation.mutate(id);
  };

  const handleBatchFacebookPost = () => {
    batchFacebookPostMutation.mutate();
  };

  const seedCategoriesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/categories/seed");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      toast({
        title: "Categories Created",
        description: `Successfully created ${data.created} new categories`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Categories",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSeedCategories = () => {
    seedCategoriesMutation.mutate();
  };

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setEditorOpen(true);
    // Refetch categories to ensure they're loaded
    refetchCategories();
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setEditorOpen(true);
    // Refetch categories to ensure they're loaded
    refetchCategories();
  };

  const handleSaveArticle = async (data: {
    title: string;
    content: string;
    excerpt: string;
    category: string;
    imageUrl?: string;
    imageUrls?: string[];
    interestScore?: number;
  }) => {
    if (editingArticle) {
      await updateArticleMutation.mutateAsync({ id: editingArticle.id, data });
    } else {
      await createArticleMutation.mutateAsync(data);
    }
  };

  const handleCancelEdit = () => {
    setEditorOpen(false);
    setEditingArticle(null);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedArticles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const unpublishedArticles = filteredArticles.filter((a) => !a.isPublished);
    if (selectedArticles.size === unpublishedArticles.length && unpublishedArticles.length > 0) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(unpublishedArticles.map((a) => a.id)));
    }
  };

  const handleBulkHide = async () => {
    const selectedIds = Array.from(selectedArticles);
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await updateMutation.mutateAsync({ id, updates: { isPublished: false } });
        successCount++;
      } catch (error) {
        console.error(`Failed to hide article ${id}:`, error);
      }
    }
    setSelectedArticles(new Set());
    toast({
      title: "Bulk Hide Complete",
      description: `Successfully hid ${successCount} of ${selectedIds.length} articles`,
    });
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedArticles);
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await deleteMutation.mutateAsync(id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete article ${id}:`, error);
      }
    }
    setSelectedArticles(new Set());
    toast({
      title: "Bulk Delete Complete",
      description: `Successfully deleted ${successCount} of ${selectedIds.length} articles`,
    });
  };

  const handleLogout = async () => {
    await logout();
    // Clear all admin queries to prevent stale data
    queryClient.removeQueries({ queryKey: ["/api/admin"] });
    setLocation("/admin/login");
  };

  const stats = {
    pending: articles.filter((a) => !a.isPublished).length,
    // TODO: Re-enable once database columns are added
    // needsReview: articles.filter((a) => a.needsReview).length,
    total: articles.length,
  };

  // Filter articles based on active filter
  const filteredArticles = articles.filter((article) => {
    if (activeFilter === 'pending') return !article.isPublished;
    // TODO: Re-enable once database columns are added
    // if (activeFilter === 'needsReview') return article.needsReview;
    return true; // 'all'
  });

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
      <main className="flex-1 bg-background relative min-h-screen overflow-hidden">
        {/* Premium Background Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Review and manage scraped articles before publishing
              </p>
            </div>
            <div className="flex flex-col items-stretch md:items-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size={undefined}
                  onClick={() => setLocation("/admin/insights")}
                  data-testid="button-insights"
                  className="flex-1 md:flex-none h-11 px-4 py-2"
                  aria-label="Generate Insight"
                >
                  <Sparkles className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Generate Insight</span>
                </Button>
                <Button
                  variant="outline"
                  size={undefined}
                  onClick={handleLogout}
                  data-testid="button-logout"
                  className="flex-1 md:flex-none h-11 px-4 py-2"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
                <Button
                  variant="outline"
                  size={undefined}
                  onClick={handleBatchFacebookPost}
                  disabled={batchFacebookPostMutation.isPending}
                  data-testid="button-batch-facebook"
                  className="flex-1 md:flex-none h-11 px-4 py-2"
                  aria-label="Post Missing to Facebook"
                >
                  {batchFacebookPostMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 md:mr-2 animate-spin" />
                      <span className="hidden md:inline">Posting...</span>
                    </>
                  ) : (
                    <>
                      <Facebook className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Post Missing to Facebook</span>
                    </>
                  )}
                </Button>
                <Button
                  size={undefined}
                  onClick={handleScrape}
                  disabled={scrapeMutation.isPending || !!(currentJob && currentJob.status !== 'completed' && currentJob.status !== 'failed')}
                  data-testid="button-scrape"
                  className="flex-1 md:flex-none h-11 px-8 py-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all duration-300"
                  aria-label="Scrape New Articles"
                >
                  {currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing') ? (
                    <>
                      <RefreshCw className="w-4 h-4 md:mr-2 animate-spin" />
                      <span className="hidden md:inline">Scraping...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Scrape New Articles</span>
                    </>
                  )}
                </Button>
              </div>
              {currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing') && (
                <div className="text-xs md:text-sm text-muted-foreground">
                  {currentJob.progress.totalPosts > 0 ? (
                    <span>
                      Processing {currentJob.progress.processedPosts}/{currentJob.progress.totalPosts} posts
                      ({currentJob.progress.createdArticles} articles created)
                    </span>
                  ) : (
                    <span>Initializing scraper...</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards with Glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              className={`p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] border-white/10 bg-white/5 backdrop-blur-md shadow-xl ${activeFilter === 'all' ? 'ring-1 ring-primary/50 bg-primary/10' : 'hover:bg-white/10'
                }`}
              onClick={() => setActiveFilter('all')}
              data-testid="filter-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">All Articles</p>
                  <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60" data-testid="stat-total">{stats.total}</p>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${activeFilter === 'all' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'}`}>
                  <Download className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card
              className={`p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] border-white/10 bg-white/5 backdrop-blur-md shadow-xl ${activeFilter === 'pending' ? 'ring-1 ring-orange-500/50 bg-orange-500/10' : 'hover:bg-white/10'
                }`}
              onClick={() => setActiveFilter('pending')}
              data-testid="filter-pending"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Pending Review</p>
                  <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-200" data-testid="stat-pending">{stats.pending}</p>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${activeFilter === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-muted-foreground'}`}>
                  <EyeOff className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-white/10 bg-card/40 backdrop-blur-xl shadow-2xl">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl md:text-2xl font-bold">Articles</h2>
                  {activeFilter !== 'all' && (
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Showing {filteredArticles.length} {activeFilter} article{filteredArticles.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleCreateArticle}
                    data-testid="button-create-article"
                    className="h-11 px-4 py-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Post
                  </Button>
                  {categories.length === 0 && (
                    <Button
                      onClick={handleSeedCategories}
                      data-testid="button-seed-categories"
                      className="h-11 px-4 py-2"
                      variant="outline"
                      disabled={seedCategoriesMutation.isPending}
                    >
                      {seedCategoriesMutation.isPending ? (
                        <>Creating...</>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Default Categories
                        </>
                      )}
                    </Button>
                  )}
                  {filteredArticles.some((a) => !a.isPublished) && (
                    <>
                      {selectedArticles.size > 0 && (
                        <>
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {selectedArticles.size} selected
                          </span>
                          <Button
                            variant="outline"
                            size={undefined}
                            onClick={handleBulkHide}
                            data-testid="button-bulk-hide"
                            className="h-11 px-4 py-2"
                            aria-label="Hide Selected"
                          >
                            <EyeOff className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">Hide Selected</span>
                          </Button>
                          <Button
                            variant="outline"
                            size={undefined}
                            onClick={handleBulkDelete}
                            className="border-destructive text-destructive h-11 px-4 py-2"
                            data-testid="button-bulk-delete"
                            aria-label="Delete Selected"
                          >
                            <Trash2 className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">Delete Selected</span>
                          </Button>
                        </>
                      )}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={
                            selectedArticles.size > 0 &&
                            selectedArticles.size === filteredArticles.filter((a) => !a.isPublished).length
                          }
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                        <label className="text-xs md:text-sm font-medium whitespace-nowrap">Select All</label>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {articles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No articles yet. Click "Scrape New Articles" to get started.</p>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No {activeFilter} articles found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4 p-4 border border-border rounded-lg hover-elevate"
                      data-testid={`article-row-${article.id}`}
                    >
                      <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                        {!article.isPublished && (
                          <div className="flex items-center pt-1">
                            <Checkbox
                              checked={selectedArticles.has(article.id)}
                              onCheckedChange={() => handleToggleSelect(article.id)}
                              data-testid={`checkbox-article-${article.id}`}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                            {article.interestScore !== null && article.interestScore !== undefined && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    className={
                                      article.interestScore >= 4
                                        ? "bg-orange-500 text-white"
                                        : article.interestScore === 3
                                          ? "bg-yellow-500 text-white"
                                          : "bg-gray-500 text-white"
                                    }
                                    data-testid={`badge-interest-${article.id}`}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    {article.interestScore}/5
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Interest Score: {article.interestScore}/5 {article.interestScore >= 4 ? "(Auto-posted to Facebook)" : article.interestScore === 3 ? "(Published, manual post)" : "(Draft only)"}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {/* TODO: Re-enable once database columns are added
                            {article.needsReview && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center" data-testid={`icon-needs-review-${article.id}`}>
                                    <AlertTriangle className="w-4 h-4 text-destructive" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{article.reviewReason || "This article needs manual review"}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            */}
                            <span className="text-xs md:text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                            </span>
                          </div>
                          <h3 className="font-semibold mb-1 text-base md:text-lg" data-testid={`text-title-${article.id}`}>
                            {article.title}
                          </h3>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2">
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
                      </div>
                      <div className="flex items-center gap-2 justify-end md:justify-start">
                        <Button
                          variant="outline"
                          onClick={() => handleEditArticle(article)}
                          data-testid={`button-edit-${article.id}`}
                          className="h-11 w-11 p-0"
                          aria-label="Edit article"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handlePreview(article)}
                          data-testid={`button-preview-${article.id}`}
                          className="h-11 w-11 p-0"
                          aria-label="Preview article"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!article.isPublished ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleApprove(article.id)}
                              className="border-primary text-primary h-11 w-11 p-0"
                              disabled={publishMutation.isPending}
                              data-testid={`button-approve-${article.id}`}
                              aria-label="Publish article"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleReject(article.id)}
                              className="border-destructive text-destructive h-11 w-11 p-0"
                              disabled={deleteMutation.isPending}
                              data-testid={`button-reject-${article.id}`}
                              aria-label="Reject and delete article"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  onClick={() => handlePostToFacebook(article.id)}
                                  className="border-blue-500 text-blue-500 h-11 w-11 p-0"
                                  disabled={facebookPostMutation.isPending}
                                  data-testid={`button-facebook-${article.id}`}
                                  aria-label={
                                    article.facebookPostId?.startsWith('LOCK:')
                                      ? "Retry posting to Facebook"
                                      : article.facebookPostId
                                        ? "Post again to Facebook"
                                        : "Post to Facebook"
                                  }
                                >
                                  <Facebook className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {article.facebookPostId?.startsWith('LOCK:')
                                    ? "Retry posting to Facebook (previous attempt failed)"
                                    : article.facebookPostId
                                      ? "Post again to Facebook (already posted)"
                                      : "Post to Facebook"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  onClick={() => handlePostToInstagram(article.id)}
                                  className="border-pink-500 text-pink-500 h-11 w-11 p-0"
                                  disabled={instagramPostMutation.isPending}
                                  data-testid={`button-instagram-${article.id}`}
                                  aria-label={
                                    article.instagramPostId?.startsWith('IG-LOCK:')
                                      ? "Retry posting to Instagram"
                                      : article.instagramPostId
                                        ? "Post again to Instagram"
                                        : "Post to Instagram"
                                  }
                                >
                                  <Instagram className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {article.instagramPostId?.startsWith('IG-LOCK:')
                                    ? "Retry posting to Instagram (previous attempt failed)"
                                    : article.instagramPostId
                                      ? "Post again to Instagram (already posted)"
                                      : "Post to Instagram"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  onClick={() => handlePostToThreads(article.id)}
                                  className="border-purple-500 text-purple-500 h-11 w-11 p-0"
                                  disabled={threadsPostMutation.isPending}
                                  data-testid={`button-threads-${article.id}`}
                                  aria-label={
                                    article.threadsPostId?.startsWith('THREADS-LOCK:')
                                      ? "Retry posting to Threads"
                                      : article.threadsPostId
                                        ? "Post again to Threads"
                                        : "Post to Threads"
                                  }
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {article.threadsPostId?.startsWith('THREADS-LOCK:')
                                    ? "Retry posting to Threads (previous attempt failed)"
                                    : article.threadsPostId
                                      ? "Post again to Threads (already posted)"
                                      : "Post to Threads"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Button
                              variant="outline"
                              onClick={() => handleUnpublish(article.id)}
                              className="border-orange-500 text-orange-500 h-11 w-11 p-0"
                              disabled={unpublishMutation.isPending}
                              data-testid={`button-unpublish-${article.id}`}
                              aria-label="Unpublish article"
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDelete(article.id)}
                              className="border-destructive text-destructive h-11 w-11 p-0"
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${article.id}`}
                              aria-label="Delete article"
                            >
                              <Trash2 className="w-4 h-4" />
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

      <Dialog open={!!previewArticle} onOpenChange={(open) => !open && setPreviewArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-preview">
          {previewArticle && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl" data-testid="text-preview-title">
                  {previewArticle.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" data-testid="badge-preview-category">
                    {previewArticle.category}
                  </Badge>
                  <Badge
                    className={previewArticle.isPublished ? "bg-primary text-primary-foreground" : ""}
                    data-testid="badge-preview-status"
                  >
                    {previewArticle.isPublished ? "published" : "pending"}
                  </Badge>
                  <span className="text-sm text-muted-foreground" data-testid="text-preview-time">
                    {formatDistanceToNow(new Date(previewArticle.publishedAt), { addSuffix: true })}
                  </span>
                </div>

                {previewArticle.imageUrls && previewArticle.imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-4" data-testid="container-preview-images">
                    {previewArticle.imageUrls.map((url, idx) => (
                      <ArticleImage
                        key={idx}
                        src={url}
                        alt={`${previewArticle.title} - Image ${idx + 1}`}
                        className="w-full rounded-lg"
                        data-testid={`img-preview-${idx}`}
                      />
                    ))}
                  </div>
                )}

                <div className="prose prose-sm max-w-none dark:prose-invert" data-testid="container-preview-content">
                  <p className="text-lg text-muted-foreground" data-testid="text-preview-excerpt">
                    {previewArticle.excerpt}
                  </p>
                  <div
                    className="mt-4"
                    data-testid="text-preview-body"
                    dangerouslySetInnerHTML={{ __html: previewArticle.content }}
                  />
                </div>

                <div className="pt-4 border-t">
                  <a
                    href={previewArticle.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                    data-testid="link-preview-source"
                  >
                    View original source →
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="dialog-article-editor">
          <DialogHeader>
            <DialogTitle data-testid="text-editor-title">
              {editingArticle ? "Edit Article" : "Create New Article"}
            </DialogTitle>
          </DialogHeader>
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading editor...</p>
            </div>
          ) : categories.length > 0 ? (
            <ArticleEditor
              article={editingArticle || undefined}
              categories={categories}
              onSave={handleSaveArticle}
              onCancel={handleCancelEdit}
              isSaving={createArticleMutation.isPending || updateArticleMutation.isPending}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive">No categories available. Please create categories first.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
