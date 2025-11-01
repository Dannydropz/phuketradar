import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ArticleCard } from "@/components/ArticleCard";
import { EmailSignup } from "@/components/EmailSignup";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { ArticleListItem } from "@shared/schema";

export default function Home() {
  const [, params] = useRoute("/category/:category");
  const category = params?.category;
  const [displayCount, setDisplayCount] = useState(12);
  
  const { data: allArticles = [], isLoading } = useQuery<ArticleListItem[]>({
    queryKey: category ? [`/api/articles/category/${category}`] : ["/api/articles"],
  });

  // Sort articles by date (newest first)
  const articles = useMemo(() => {
    return [...allArticles].sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [allArticles]);

  // Get urgent news (Breaking + Fresh, < 4 hours old)
  const urgentNews = useMemo(() => {
    const now = Date.now();
    const fourHoursAgo = now - (4 * 60 * 60 * 1000);
    
    return articles.filter(article => {
      const isFresh = new Date(article.publishedAt).getTime() > fourHoursAgo;
      const isBreaking = article.category.toLowerCase() === "breaking";
      return isBreaking && isFresh;
    }).slice(0, 3); // Limit to 3 urgent stories
  }, [articles]);

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
  const sidebar = articles.slice(1, 6); // Show 5 trending stories
  const latestArticles = articles.slice(6, 6 + displayCount); // Start after hero+sidebar (6 articles)
  const hasMore = articles.length > 6 + displayCount;

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
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <EmailSignup />

        <div className="container mx-auto px-4 py-8">
          {latestArticles.length > 0 && (
            <section className="mt-16">
              <div className="mb-8">
                <h2 className="text-3xl font-bold">{category ? "More Stories" : "Latest News"}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setDisplayCount(prev => prev + 12)}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover-elevate active-elevate-2 transition-colors"
                    data-testid="button-load-more"
                  >
                    Load More Stories
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
