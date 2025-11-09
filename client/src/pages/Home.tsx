import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ArticleCard } from "@/components/ArticleCard";
import { EmailSignup } from "@/components/EmailSignup";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useMemo } from "react";
import type { ArticleListItem, Journalist } from "@shared/schema";
import NotFound from "@/pages/not-found";

const VALID_CATEGORIES = ["crime", "local", "tourism", "politics", "economy", "traffic", "weather"];

export default function Home() {
  const [, params] = useRoute("/:category");
  const category = params?.category?.toLowerCase();
  const [displayCount, setDisplayCount] = useState(12);

  // Validate category - if invalid, show 404
  if (category && !VALID_CATEGORIES.includes(category)) {
    return <NotFound />;
  }
  
  const { data: allArticles = [], isLoading } = useQuery<ArticleListItem[]>({
    queryKey: category ? [`/api/articles/category/${category}`] : ["/api/articles"],
  });

  const { data: journalists = [] } = useQuery<Journalist[]>({
    queryKey: ["/api/journalists"],
  });

  // Create journalist lookup map
  const journalistMap = useMemo(() => {
    const map = new Map<string, Journalist>();
    journalists.forEach(j => map.set(j.id, j));
    return map;
  }, [journalists]);

  // Sort articles by date (newest first)
  const articles = useMemo(() => {
    return [...allArticles].sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [allArticles]);

  // Get high-interest articles (score >= 4) for hero section
  const highInterestArticles = useMemo(() => {
    return articles.filter(article => (article.interestScore ?? 0) >= 4);
  }, [articles]);

  // Hero section: Prioritize high-interest articles (score >= 4), but fall back to recent articles if none exist
  const heroArticles = useMemo(() => {
    return highInterestArticles.length > 0 ? highInterestArticles : articles;
  }, [highInterestArticles, articles]);
  
  // Get breaking news (High Interest + Fresh, < 24 hours old), excluding hero articles
  const urgentNews = useMemo(() => {
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    
    // Get hero article IDs to exclude
    const heroIds = new Set([
      heroArticles[0]?.id,
      ...heroArticles.slice(1, 6).map(a => a.id)
    ].filter(Boolean));
    
    return highInterestArticles.filter(article => {
      const isFresh = new Date(article.publishedAt).getTime() > twentyFourHoursAgo;
      const notInHero = !heroIds.has(article.id);
      return isFresh && notInHero;
    }).slice(0, 3); // Limit to 3 breaking stories
  }, [highInterestArticles, heroArticles]);

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

  const featured = heroArticles[0];
  const sidebar = heroArticles.slice(1, 6); // Show 5 trending stories
  
  // Get IDs of articles already shown in hero section
  const heroArticleIds = new Set([
    featured?.id,
    ...sidebar.map(a => a.id)
  ].filter(Boolean));
  
  // Get IDs of articles shown in hero and urgent news sections to avoid duplicates
  const excludedArticleIds = new Set([
    ...Array.from(heroArticleIds),
    ...urgentNews.map(a => a.id)
  ]);
  
  // Latest articles: Show ALL recent articles, excluding those already in hero/urgent sections
  const latestArticles = articles
    .filter(article => !excludedArticleIds.has(article.id))
    .slice(0, displayCount);
  const hasMore = articles.filter(article => !excludedArticleIds.has(article.id)).length > displayCount;

  // If no articles at all, show empty state
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
              interestScore: featured.interestScore,
            }}
            sidebar={sidebar.map((article) => ({
              id: article.id,
              slug: article.slug,
              title: article.title,
              excerpt: article.excerpt,
              imageUrl: article.imageUrl || "",
              category: article.category,
              publishedAt: new Date(article.publishedAt),
              interestScore: article.interestScore,
            }))}
          />

          {urgentNews.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <div className="absolute w-3 h-3 bg-red-600 rounded-full animate-ping opacity-75"></div>
                </div>
                <h2 className="text-3xl font-bold">Breaking News</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {urgentNews.map((article) => {
                  const journalist = article.journalistId ? journalistMap.get(article.journalistId) : undefined;
                  return (
                    <ArticleCard
                      key={article.id}
                      id={article.id}
                      slug={article.slug}
                      title={article.title}
                      excerpt={article.excerpt}
                      imageUrl={article.imageUrl || undefined}
                      category={article.category}
                      publishedAt={new Date(article.publishedAt)}
                      interestScore={article.interestScore}
                      eventType={article.eventType}
                      severity={article.severity}
                      journalist={journalist ? {
                        id: journalist.id,
                        nickname: journalist.nickname,
                        surname: journalist.surname,
                        headshot: journalist.headshot,
                      } : undefined}
                    />
                  );
                })}
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
                {latestArticles.map((article) => {
                  const journalist = article.journalistId ? journalistMap.get(article.journalistId) : undefined;
                  return (
                    <ArticleCard
                      key={article.id}
                      id={article.id}
                      slug={article.slug}
                      title={article.title}
                      excerpt={article.excerpt}
                      imageUrl={article.imageUrl || undefined}
                      category={article.category}
                      publishedAt={new Date(article.publishedAt)}
                      interestScore={article.interestScore}
                      eventType={article.eventType}
                      severity={article.severity}
                      journalist={journalist ? {
                        id: journalist.id,
                        nickname: journalist.nickname,
                        surname: journalist.surname,
                        headshot: journalist.headshot,
                      } : undefined}
                    />
                  );
                })}
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
