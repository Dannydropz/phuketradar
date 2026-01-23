import { Header } from "@/components/Header";
import { ModernArticleCard } from "@/components/ModernArticleCard";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useMemo } from "react";
import type { ArticleListItem } from "@shared/schema";
import NotFound from "@/pages/not-found";
import { Footer } from "@/components/Footer";

const VALID_CATEGORIES = ["crime", "local", "tourism", "politics", "economy", "traffic", "weather"];

export default function Home() {
  const [, params] = useRoute("/:category");
  const category = params?.category?.toLowerCase();
  const [displayCount, setDisplayCount] = useState(20);

  // Validate category
  if (category && !VALID_CATEGORIES.includes(category)) {
    return <NotFound />;
  }

  const { data: allArticles = [], isLoading } = useQuery<ArticleListItem[]>({
    queryKey: category ? [`/api/articles/category/${category}`] : ["/api/articles"],
  });

  // Sort articles by date
  const articles = useMemo(() => {
    return [...allArticles].sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [allArticles]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="shapes-container flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-4xl font-black text-muted-foreground uppercase opacity-20 tracking-tighter">
            RADAR LOADING...
          </div>
        </div>
      </div>
    );
  }

  const latestArticles = articles.slice(0, displayCount);
  const hasMore = articles.length > displayCount;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="shapes-container">
        <header className="shapes-header">
          <h1 className="shapes-title">RADAR</h1>
          <p className="shapes-subtitle">
            Phuket's high-interest news radar. Breaking incidents, real-time tracking,
            and deep-dive reporting for the island.
          </p>
          {category && (
            <div className="mt-8 flex items-center gap-4">
              <div className="h-1 w-12 bg-primary"></div>
              <span className="text-2xl font-black uppercase tracking-tight text-primary">
                {category}
              </span>
            </div>
          )}
        </header>

        <section className="shapes-grid">
          {latestArticles.map((article) => (
            <ModernArticleCard
              key={article.id}
              id={article.id}
              slug={article.slug}
              title={article.title}
              excerpt={article.excerpt}
              imageUrl={article.imageUrl || undefined}
              videoThumbnail={article.videoThumbnail || undefined}
              category={article.category}
              publishedAt={new Date(article.publishedAt)}
              interestScore={article.interestScore}
              seriesId={article.seriesId}
              isParentStory={article.isParentStory}
              sourceName={article.sourceName}
            />
          ))}
        </section>

        {hasMore && (
          <div className="flex justify-start pt-8">
            <button
              onClick={() => setDisplayCount(prev => prev + 20)}
              className="text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors border-b-2 border-muted hover:border-primary pb-1"
            >
              Load More Intel +
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
