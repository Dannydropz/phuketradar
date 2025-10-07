import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Share2, Facebook } from "lucide-react";
import { useRoute } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleCard } from "@/components/ArticleCard";
import { useQuery } from "@tanstack/react-query";
import type { Article } from "@shared/schema";

export default function ArticleDetail() {
  const [, params] = useRoute("/article/:id");
  const articleId = params?.id || "";

  const { data: article, isLoading } = useQuery<Article>({
    queryKey: ["/api/articles", articleId],
    enabled: !!articleId,
  });

  const { data: allArticles = [] } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading article...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
            <p className="text-muted-foreground">
              The article you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedArticles = allArticles
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      console.log("Link copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {article.category.toLowerCase() === "breaking" && (
                <Badge className="bg-destructive text-destructive-foreground font-bold" data-testid="badge-article-breaking">
                  BREAKING
                </Badge>
              )}
              <Badge variant="secondary" data-testid="badge-article-category">
                {article.category}
              </Badge>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                <span data-testid="text-article-time">
                  {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-article-title">
              {article.title}
            </h1>
            <p className="text-xl text-muted-foreground mb-6" data-testid="text-article-excerpt">
              {article.excerpt}
            </p>
            <div className="flex items-center justify-between border-y py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Facebook className="w-4 h-4" />
                <span>Source: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" data-testid="link-source">Phuket Time News</a></span>
              </div>
              <Button variant="outline" size="sm" onClick={handleShare} data-testid="button-share">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          <div className="mb-8 rounded-lg overflow-hidden bg-muted">
            <img
              src={article.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675'%3E%3Crect width='1200' height='675' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='%236b7280'%3EPhuket Radar%3C/text%3E%3C/svg%3E"}
              alt={article.title}
              className="w-full h-auto"
              data-testid="img-article-main"
            />
          </div>

          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
            data-testid="content-article-body"
          />

          <div className="mt-12 pt-8 border-t">
            <p className="text-sm text-muted-foreground italic">
              This article was translated and adapted from Thai language sources using AI technology. 
              Original reporting by Phuket Time News.
            </p>
          </div>
        </article>

        {relatedArticles.length > 0 && (
          <section className="bg-card border-y mt-12 py-12">
            <div className="container mx-auto px-4 max-w-6xl">
              <h2 className="text-3xl font-bold mb-6">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((relatedArticle) => (
                  <ArticleCard
                    key={relatedArticle.id}
                    id={relatedArticle.id}
                    title={relatedArticle.title}
                    excerpt={relatedArticle.excerpt}
                    imageUrl={relatedArticle.imageUrl || undefined}
                    category={relatedArticle.category}
                    publishedAt={new Date(relatedArticle.publishedAt)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
