import { useState, useEffect } from "react";
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
  type CarouselApi,
} from "@/components/ui/carousel";
import { Clock, Share2, AlertTriangle, AlertCircle, Info, Car, Shield, Cloud, Heart, Users, Palmtree, Building2, Landmark, Leaf } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { useRoute } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleCard } from "@/components/ArticleCard";
import { EmailSignup } from "@/components/EmailSignup";
import { useQuery } from "@tanstack/react-query";
import type { Article, ArticleListItem, Journalist } from "@shared/schema";
import { ArticleImage } from "@/components/ArticleImage";
import { SEO } from "@/components/SEO";
import { JournalistByline } from "@/components/JournalistByline";
import { buildArticleUrl } from "@shared/category-map";

// Helper functions for event icons and severity styling
function getEventIcon(eventType?: string | null): LucideIcon | null {
  if (!eventType) return null;
  
  switch (eventType.toLowerCase()) {
    case "accident":
      return Car;
    case "crime":
      return Shield;
    case "weather":
      return Cloud;
    case "health":
      return Heart;
    case "public order":
      return Users;
    case "tourism":
      return Palmtree;
    case "infrastructure":
      return Building2;
    case "government":
      return Landmark;
    case "environment":
      return Leaf;
    default:
      return null;
  }
}

function getSeverityStyle(severity?: string | null): { variant: "default" | "destructive" | "secondary" | "outline", className: string } {
  if (!severity) return { variant: "secondary", className: "" };
  
  switch (severity.toLowerCase()) {
    case "critical":
      return { variant: "destructive", className: "bg-red-600 hover:bg-red-700 text-white font-semibold" };
    case "high":
      return { variant: "default", className: "bg-orange-500 hover:bg-orange-600 text-white font-semibold" };
    case "medium":
      return { variant: "default", className: "bg-yellow-600 hover:bg-yellow-700 text-white" };
    case "low":
      return { variant: "secondary", className: "bg-blue-500 hover:bg-blue-600 text-white" };
    case "info":
    default:
      return { variant: "secondary", className: "" };
  }
}

function getSeverityIcon(severity?: string | null): LucideIcon | null {
  if (!severity) return null;
  
  switch (severity.toLowerCase()) {
    case "critical":
      return AlertTriangle;
    case "high":
      return AlertCircle;
    case "medium":
    case "low":
    case "info":
    default:
      return Info;
  }
}

export default function ArticleDetail() {
  const [, params] = useRoute("/:category/:slugOrId");
  const slugOrId = params?.slugOrId || "";
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

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

  const { data: journalist } = useQuery<Journalist>({
    queryKey: ["/api/journalists", article?.journalistId],
    enabled: !!article?.journalistId,
  });

  // Track carousel current slide for dots
  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

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
  const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
  const canonicalUrl = `${baseUrl}${articlePath}`;

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
        author={journalist ? `${journalist.nickname} ${journalist.surname}` : undefined}
      />
      
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <article className="lg:col-span-2">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {(() => {
                const publishedTime = new Date(article.publishedAt).getTime();
                const hoursSincePublish = (Date.now() - publishedTime) / (1000 * 60 * 60);
                const showBreakingBadge = (article.interestScore ?? 0) >= 4 && hoursSincePublish < 24;
                const showRedBadge = showBreakingBadge && hoursSincePublish < 6;
                
                if (showBreakingBadge) {
                  return (
                    <Badge 
                      variant={showRedBadge ? "destructive" : "secondary"} 
                      className={showRedBadge ? "bg-red-600 hover:bg-red-700 text-white font-semibold animate-pulse" : "bg-gray-500 dark:bg-gray-600 text-white font-semibold"}
                      data-testid="badge-article-breaking"
                    >
                      Breaking News
                    </Badge>
                  );
                }
                return null;
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
            {journalist && (
              <div className="mb-6">
                <JournalistByline
                  journalistId={journalist.id}
                  nickname={journalist.nickname}
                  surname={journalist.surname}
                  headshot={journalist.headshot}
                  size="md"
                />
              </div>
            )}
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

          <div className="mb-8">
            {article.imageUrls && article.imageUrls.length > 1 ? (
              <div className="space-y-4">
                <Carousel className="w-full rounded-lg overflow-hidden relative" setApi={setApi}>
                  <CarouselContent>
                    {article.imageUrls.map((imageUrl, index) => (
                      <CarouselItem key={index}>
                        <div className="relative w-full flex items-center justify-center">
                          <ArticleImage
                            src={imageUrl}
                            alt={`${article.title} - Image ${index + 1}`}
                            category={article.category}
                            className="w-full max-h-[400px] md:max-h-[600px] object-contain"
                            testId={`img-article-${index}`}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm z-10">
                    {current + 1} / {article.imageUrls?.length ?? 0}
                  </div>
                </Carousel>
                
                <div className="flex items-center justify-center gap-1">
                  {article.imageUrls.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
                      className="flex items-center justify-center min-w-11 min-h-11 hover-elevate active-elevate-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                      aria-label={`Go to image ${index + 1}`}
                      aria-current={index === current ? "true" : "false"}
                      data-testid={`dot-carousel-${index}`}
                    >
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          index === current 
                            ? 'w-8 bg-primary' 
                            : 'w-2 bg-muted-foreground/30'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : article.imageUrl || (article.imageUrls && article.imageUrls.length === 1) ? (
              <div className="rounded-lg overflow-hidden flex items-center justify-center">
                <ArticleImage
                  src={article.imageUrl || (article.imageUrls ? article.imageUrls[0] : '')}
                  alt={article.title}
                  category={article.category}
                  className="w-full max-h-[400px] md:max-h-[600px] object-contain"
                  testId="img-article-main"
                />
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden">
                <ArticleImage
                  src={undefined}
                  alt={article.title}
                  category={article.category}
                  className="w-full h-[400px]"
                  testId="img-article-main"
                />
              </div>
            )}
          </div>

          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
            data-testid="content-article-body"
          />

          <div className="mt-8 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <SiFacebook className="w-5 h-5 text-[#1877F2]" />
            <span data-testid="text-article-source">Source: Facebook - translated from Thai</span>
          </div>
        </article>

        <aside className="lg:col-span-1">
          <div className="sticky top-20">
            <h3 className="text-xl font-bold mb-6">Latest</h3>
            <div className="space-y-4">
              {latestArticles.map((latestArticle) => {
                const latestUrl = buildArticleUrl({ category: latestArticle.category, slug: latestArticle.slug || null, id: latestArticle.id });
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
                  <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
                    <ArticleImage
                      src={latestArticle.imageUrl || undefined}
                      alt={latestArticle.title}
                      category={latestArticle.category}
                      className="w-full h-full object-cover"
                    />
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
