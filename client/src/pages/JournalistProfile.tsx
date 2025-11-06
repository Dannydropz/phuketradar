import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Journalist } from "@shared/schema";
import { ArticleCard } from "@/components/ArticleCard";
import { EmailSignup } from "@/components/EmailSignup";
import { SEO } from "@/components/SEO";
import { Sparkles } from "lucide-react";

interface JournalistWithArticles extends Journalist {
  articles: Array<{
    id: string;
    slug?: string | null;
    title: string;
    excerpt: string;
    imageUrl?: string | null;
    category: string;
    publishedAt: Date;
    eventType?: string | null;
    severity?: string | null;
  }>;
}

export default function JournalistProfile() {
  const [, params] = useRoute("/journalist/:id");
  const journalistId = params?.id || "";

  const { data: journalist, isLoading, isError } = useQuery<JournalistWithArticles>({
    queryKey: ["/api/journalists", journalistId],
    enabled: !!journalistId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">Loading journalist profile...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !journalist) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Journalist Not Found</h1>
            <p className="text-muted-foreground">The journalist profile you're looking for doesn't exist.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const publishedArticles = journalist.articles.filter(a => a.publishedAt);

  return (
    <div className="flex flex-col min-h-screen">
      <SEO
        title={`${journalist.nickname} ${journalist.surname} - Reporter | Phuket Radar`}
        description={journalist.bio}
      />
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-12">
        {/* Journalist Header */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Large headshot */}
            <Avatar className="w-48 h-48 border-4 border-border rounded-xl" data-testid="img-journalist-avatar">
              <AvatarImage src={journalist.headshot} alt={`${journalist.nickname} ${journalist.surname}`} className="object-cover object-top" />
              <AvatarFallback className="text-4xl rounded-xl">{journalist.nickname[0]}</AvatarFallback>
            </Avatar>

            {/* Bio section */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-2" data-testid="text-journalist-name">
                {journalist.nickname} {journalist.surname}
                <Sparkles className="w-5 h-5 text-muted-foreground/60" />
              </h1>
              <Badge variant="secondary" className="mb-4" data-testid="badge-journalist-beat">
                {journalist.beat}
              </Badge>
              
              <p className="text-lg text-muted-foreground mb-4" data-testid="text-journalist-bio">
                {journalist.bio}
              </p>
              
              <p className="text-sm italic text-muted-foreground" data-testid="text-journalist-fun-fact">
                <span className="font-semibold">Fun fact:</span> {journalist.funFact}
              </p>
            </div>
          </div>
        </div>

        {/* Articles section */}
        <div>
          <h2 className="text-2xl font-bold mb-6" data-testid="text-articles-heading">
            Articles by {journalist.nickname} ({publishedArticles.length})
          </h2>
          
          {publishedArticles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No published articles yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  id={article.id}
                  slug={article.slug}
                  title={article.title}
                  excerpt={article.excerpt}
                  imageUrl={article.imageUrl || undefined}
                  category={article.category}
                  publishedAt={new Date(article.publishedAt)}
                  eventType={article.eventType}
                  severity={article.severity}
                />
              ))}
            </div>
          )}
        </div>

        {/* Newsletter signup */}
        <div className="mt-16">
          <EmailSignup />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
