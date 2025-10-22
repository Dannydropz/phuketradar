import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Clock, Share2 } from "lucide-react";
import { useRoute } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleCard } from "@/components/ArticleCard";
import { EmailSignup } from "@/components/EmailSignup";
import { useQuery } from "@tanstack/react-query";
import type { Article, ArticleListItem } from "@shared/schema";
import logoImage from "@assets/PhuketRadar_1759933943849.png";
import { SEO } from "@/components/SEO";

export default function ArticleDetail() {
  const [, params] = useRoute("/article/:slugOrId");
  const slugOrId = params?.slugOrId || "";

  const { data: article, isLoading, error, isError } = useQuery<Article>({
    queryKey: ["/api/articles", slugOrId],
    enabled: !!slugOrId,
  });

  // Debug logging
  console.log("ArticleDetail Debug:", { 
    slugOrId, 
    isLoading, 
    isError, 
    hasArticle: !!article,
    error: error?.message 
  });

  const { data: allArticles = [] } = useQuery<ArticleListItem[]>({
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

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h2 className="text-2xl font-bold mb-4">Error Loading Article</h2>
            <p className="text-muted-foreground mb-4">
              {error?.message || "An error occurred while loading the article."}
            </p>
            <p className="text-sm text-muted-foreground">
              Tried to load: {slugOrId}
            </p>
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
  
  const latestArticles = allArticles
    .filter((a) => a.id !== article.id)
    .slice(0, 5);

  // Generate canonical URL for SEO (SSR-safe)
  const baseUrl = import.meta.env.VITE_REPLIT_DEV_DOMAIN 
    ? `https://${import.meta.env.VITE_REPLIT_DEV_DOMAIN}`
    : (typeof window !== 'undefined' ? window.location.origin : 'https://phuketradar.com');
  const canonicalUrl = article.slug 
    ? `${baseUrl}/article/${article.slug}`
    : `${baseUrl}/article/${article.id}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: canonicalUrl,
      });
    } else {
      navigator.clipboard.writeText(canonicalUrl);
      console.log("Link copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title={article.title}
        description={article.excerpt}
        image={article.imageUrl || (article.imageUrls && article.imageUrls[0]) || undefined}
        url={canonicalUrl}
        type="article"
        publishedTime={article.publishedAt.toString()}
        author={article.author}
      />
      
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <article className="lg:col-span-2">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const isFresh = (Date.now() - new Date(article.publishedAt).getTime()) < (8 * 60 * 60 * 1000);
                const isBreaking = article.category.toLowerCase() === "breaking";
                const showRed = isBreaking && isFresh;
                
                return (
                  <Badge 
                    variant={showRed ? "destructive" : "secondary"} 
                    className={showRed ? "font-bold" : ""}
                    data-testid="badge-article-category"
                  >
                    {isBreaking ? (showRed ? "BREAKING" : "Breaking") : article.category}
                  </Badge>
                );
              })()}
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
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300bcd4' stroke-width='2'%3E%3Cpath d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'/%3E%3Cpolyline points='3.27 6.96 12 12.01 20.73 6.96'/%3E%3Cline x1='12' y1='22.08' x2='12' y2='12'/%3E%3C/svg%3E" 
                alt="AI Assisted" 
                className="w-5 h-5"
              />
              <span className="text-sm text-muted-foreground">
                By <span className="text-foreground font-medium" data-testid="text-author">{article.author}</span>
              </span>
            </div>
            <p className="text-xl text-muted-foreground mb-6" data-testid="text-article-excerpt">
              {article.excerpt}
            </p>
            <div className="flex items-center justify-end border-y py-4">
              <Button variant="outline" size="sm" onClick={handleShare} data-testid="button-share">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          <div className="mb-8 rounded-lg overflow-hidden bg-muted">
            {article.imageUrls && article.imageUrls.length > 1 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {article.imageUrls.map((imageUrl, index) => (
                    <CarouselItem key={index}>
                      <div className="relative w-full">
                        <img
                          src={imageUrl}
                          alt={`${article.title} - Image ${index + 1}`}
                          className="w-full h-auto object-cover"
                          data-testid={`img-article-${index}`}
                        />
                        {article.imageUrls && article.imageUrls.length > 1 && (
                          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                            {index + 1} / {article.imageUrls.length}
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </Carousel>
            ) : article.imageUrl || (article.imageUrls && article.imageUrls.length === 1) ? (
              <img
                src={article.imageUrl || (article.imageUrls ? article.imageUrls[0] : '')}
                alt={article.title}
                className="w-full h-auto object-cover"
                data-testid="img-article-main"
              />
            ) : (
              <div className="w-full h-[400px] flex items-center justify-center">
                <img
                  src={logoImage}
                  alt="Phuket Radar"
                  className="w-1/3 h-auto opacity-30"
                  data-testid="img-article-main"
                />
              </div>
            )}
          </div>

          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
            data-testid="content-article-body"
          />
        </article>

        <aside className="lg:col-span-1">
          <div className="sticky top-20">
            <h3 className="text-xl font-bold mb-6">Latest</h3>
            <div className="space-y-4">
              {latestArticles.map((latestArticle) => {
                const latestUrl = latestArticle.slug ? `/article/${latestArticle.slug}` : `/article/${latestArticle.id}`;
                return (
                <a 
                  key={latestArticle.id} 
                  href={latestUrl}
                  className="flex gap-3 group"
                  data-testid={`link-latest-${latestArticle.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {latestArticle.title}
                    </h4>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(latestArticle.publishedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="w-20 h-20 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                    {latestArticle.imageUrl ? (
                      <img
                        src={latestArticle.imageUrl}
                        alt={latestArticle.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img
                          src={logoImage}
                          alt="Phuket Radar"
                          className="w-3/4 h-auto opacity-30"
                        />
                      </div>
                    )}
                  </div>
                </a>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>

    {relatedArticles.length > 0 && (
      <section className="bg-card border-y mt-12 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((relatedArticle) => (
              <ArticleCard
                key={relatedArticle.id}
                id={relatedArticle.id}
                slug={relatedArticle.slug}
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

    <EmailSignup />
      </main>
      <Footer />
    </div>
  );
}
