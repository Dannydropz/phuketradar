import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ArticleCard } from "@/components/ArticleCard";
import { EmailSignup } from "@/components/EmailSignup";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import type { Article } from "@shared/schema";

export default function Home() {
  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <HeroSection
            featured={{
              id: featured.id,
              title: featured.title,
              excerpt: featured.excerpt,
              imageUrl: featured.imageUrl || "",
              category: featured.category,
              publishedAt: new Date(featured.publishedAt),
              isBreaking: featured.category.toLowerCase() === "breaking",
            }}
            sidebar={sidebar.map((article) => ({
              id: article.id,
              title: article.title,
              excerpt: article.excerpt,
              imageUrl: article.imageUrl || "",
              category: article.category,
              publishedAt: new Date(article.publishedAt),
              isBreaking: article.category.toLowerCase() === "breaking",
            }))}
          />

          {latestArticles.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold mb-6">Latest News</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    id={article.id}
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
      </main>
      <Footer />
    </div>
  );
}
