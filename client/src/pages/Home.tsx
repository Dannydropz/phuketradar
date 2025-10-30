import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ArticleCard } from "@/components/ArticleCard";
import { EmailSignup } from "@/components/EmailSignup";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, AlertTriangle } from "lucide-react";
import type { ArticleListItem } from "@shared/schema";

// Helper function to get severity ranking for sorting
function getSeverityRank(severity?: string | null): number {
  if (!severity) return 999;
  
  switch (severity.toLowerCase()) {
    case "critical":
      return 1;
    case "high":
      return 2;
    case "medium":
      return 3;
    case "low":
      return 4;
    case "info":
      return 5;
    default:
      return 999;
  }
}

export default function Home() {
  const [, params] = useRoute("/category/:category");
  const category = params?.category;
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  
  const { data: allArticles = [], isLoading } = useQuery<ArticleListItem[]>({
    queryKey: category ? [`/api/articles/category/${category}`] : ["/api/articles"],
  });

  // Sort articles by severity (Critical first), then by date
  const sortedArticles = useMemo(() => {
    return [...allArticles].sort((a, b) => {
      const severityDiff = getSeverityRank(a.severity) - getSeverityRank(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [allArticles]);

  // Filter articles based on selected filters
  const articles = useMemo(() => {
    return sortedArticles.filter(article => {
      const matchesEventType = eventTypeFilter === "all" || article.eventType === eventTypeFilter;
      const matchesSeverity = severityFilter === "all" || article.severity === severityFilter;
      return matchesEventType && matchesSeverity;
    });
  }, [sortedArticles, eventTypeFilter, severityFilter]);

  // Get urgent news (Critical and High severity)
  const urgentNews = useMemo(() => {
    return articles.filter(article => 
      article.severity && 
      (article.severity.toLowerCase() === "critical" || article.severity.toLowerCase() === "high")
    ).slice(0, 3); // Limit to 3 urgent stories
  }, [articles]);

  // Get unique event types and severities for filter dropdowns
  const eventTypes = useMemo(() => {
    const types = new Set(allArticles.map(a => a.eventType).filter(Boolean));
    return Array.from(types).sort();
  }, [allArticles]);

  const severities = useMemo(() => {
    const sevs = new Set(allArticles.map(a => a.severity).filter(Boolean));
    return Array.from(sevs).sort();
  }, [allArticles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading latest news...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Separate featured article and sidebar articles
  const featured = articles[0];
  const sidebar = articles.slice(1, 4);
  const latestArticles = articles.slice(4, 10);

  if (!featured) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h2 className="text-2xl font-bold mb-4">No Articles Yet</h2>
            <p className="text-muted-foreground mb-6">
              Articles will appear here once the scraper runs. Visit the admin dashboard to scrape new content.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const categoryTitle = category 
    ? category.charAt(0).toUpperCase() + category.slice(1) 
    : "All News";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {category && (
            <div className="mb-8">
              <h1 className="text-4xl font-bold" data-testid="text-category-title">{categoryTitle}</h1>
              <p className="text-muted-foreground mt-2">Latest {categoryTitle.toLowerCase()} news from Phuket</p>
            </div>
          )}
          
          <HeroSection
            featured={{
              id: featured.id,
              slug: featured.slug,
              title: featured.title,
              excerpt: featured.excerpt,
              imageUrl: featured.imageUrl || "",
              category: featured.category,
              publishedAt: new Date(featured.publishedAt),
              isBreaking: featured.category.toLowerCase() === "breaking",
            }}
            sidebar={sidebar.map((article) => ({
              id: article.id,
              slug: article.slug,
              title: article.title,
              excerpt: article.excerpt,
              imageUrl: article.imageUrl || "",
              category: article.category,
              publishedAt: new Date(article.publishedAt),
              isBreaking: article.category.toLowerCase() === "breaking",
            }))}
          />

          {urgentNews.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h2 className="text-3xl font-bold">Urgent News</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {urgentNews.map((article) => (
                  <ArticleCard
                    key={article.id}
                    id={article.id}
                    slug={article.slug}
                    title={article.title}
                    excerpt={article.excerpt}
                    imageUrl={article.imageUrl || undefined}
                    category={article.category}
                    publishedAt={new Date(article.publishedAt)}
                    isBreaking={article.category.toLowerCase() === "breaking"}
                    eventType={article.eventType}
                    severity={article.severity}
                  />
                ))}
              </div>
            </section>
          )}

          <EmailSignup />

          {latestArticles.length > 0 && (
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-3xl font-bold">{category ? "More Stories" : "Latest News"}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filter:</span>
                  </div>
                  {eventTypes.length > 0 && (
                    <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-event-type-filter">
                        <SelectValue placeholder="Event Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {eventTypes.map((type) => (
                          <SelectItem key={type} value={type!}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {severities.length > 0 && (
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-severity-filter">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        {severities.map((sev) => (
                          <SelectItem key={sev} value={sev!}>
                            {sev}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    id={article.id}
                    slug={article.slug}
                    title={article.title}
                    excerpt={article.excerpt}
                    imageUrl={article.imageUrl || undefined}
                    category={article.category}
                    publishedAt={new Date(article.publishedAt)}
                    isBreaking={article.category.toLowerCase() === "breaking"}
                    eventType={article.eventType}
                    severity={article.severity}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
