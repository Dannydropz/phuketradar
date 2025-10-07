import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Check, X, Eye, RefreshCw } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface ScrapedArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  sourceUrl: string;
  scrapedAt: Date;
  status: "pending" | "approved" | "rejected";
  originalLanguage: string;
}

export default function AdminDashboard() {
  // TODO: remove mock functionality - replace with real API data
  const [articles, setArticles] = useState<ScrapedArticle[]>([
    {
      id: "1",
      title: "New Beach Safety Measures Implemented",
      excerpt: "Enhanced safety protocols announced for major beaches...",
      content: "Full article content here...",
      category: "Breaking",
      sourceUrl: "https://facebook.com/PhuketTimeNews/posts/123",
      scrapedAt: new Date(Date.now() - 1000 * 60 * 5),
      status: "pending",
      originalLanguage: "Thai",
    },
    {
      id: "2",
      title: "Tourism Numbers Surge in Q4 2025",
      excerpt: "Record-breaking tourist arrivals reported...",
      content: "Full article content here...",
      category: "Tourism",
      sourceUrl: "https://facebook.com/PhuketTimeNews/posts/124",
      scrapedAt: new Date(Date.now() - 1000 * 60 * 15),
      status: "approved",
      originalLanguage: "Thai",
    },
    {
      id: "3",
      title: "Local Markets Report Strong Business",
      excerpt: "Small businesses experiencing significant growth...",
      content: "Full article content here...",
      category: "Business",
      sourceUrl: "https://facebook.com/PhuketTimeNews/posts/125",
      scrapedAt: new Date(Date.now() - 1000 * 60 * 30),
      status: "rejected",
      originalLanguage: "Thai",
    },
  ]);

  const [isScrapingActive, setIsScrapingActive] = useState(false);

  const handleScrape = () => {
    setIsScrapingActive(true);
    console.log("Scraping triggered");
    setTimeout(() => {
      setIsScrapingActive(false);
      console.log("Scraping completed");
    }, 3000);
  };

  const handleApprove = (id: string) => {
    setArticles((prev) =>
      prev.map((article) =>
        article.id === id ? { ...article, status: "approved" as const } : article
      )
    );
    console.log(`Article ${id} approved`);
  };

  const handleReject = (id: string) => {
    setArticles((prev) =>
      prev.map((article) =>
        article.id === id ? { ...article, status: "rejected" as const } : article
      )
    );
    console.log(`Article ${id} rejected`);
  };

  const handlePreview = (id: string) => {
    console.log(`Preview article ${id}`);
  };

  const stats = {
    pending: articles.filter((a) => a.status === "pending").length,
    approved: articles.filter((a) => a.status === "approved").length,
    rejected: articles.filter((a) => a.status === "rejected").length,
  };

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
              disabled={isScrapingActive}
              data-testid="button-scrape"
            >
              {isScrapingActive ? (
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
                  <p className="text-sm text-muted-foreground mb-1">Approved</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Rejected</p>
                  <p className="text-3xl font-bold" data-testid="stat-rejected">{stats.rejected}</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {stats.rejected}
                </Badge>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Scraped Articles</h2>
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
                            article.status === "approved"
                              ? "bg-primary text-primary-foreground"
                              : article.status === "rejected"
                              ? "bg-muted text-muted-foreground"
                              : ""
                          }
                          data-testid={`badge-status-${article.id}`}
                        >
                          {article.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(article.scrapedAt, { addSuffix: true })}
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
                      {article.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleApprove(article.id)}
                            className="border-primary text-primary"
                            data-testid={`button-approve-${article.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleReject(article.id)}
                            className="border-destructive text-destructive"
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
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
