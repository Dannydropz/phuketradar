import { Footer } from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Journalist } from "@shared/schema";
import { ArticleCard } from "@/components/ArticleCard";
import { SEO } from "@/components/SEO";
import { Sparkles, Search } from "lucide-react";
import logoWhite from "@assets/logo-white-transparent.png";
import { useState } from "react";
import { SearchDialog } from "@/components/SearchDialog";

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
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: journalist, isLoading, isError } = useQuery<JournalistWithArticles>({
    queryKey: ["/api/journalists", journalistId],
    enabled: !!journalistId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError || !journalist) {
    return (
      <div className="flex flex-col min-h-screen bg-[#050505] text-white">
        {/* Navigation Bar - Glass Effect */}
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo Area */}
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer">
                  <img src={logoWhite} alt="Phuket Radar" className="h-14 w-auto object-contain" />
                </div>
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1 container max-w-6xl mx-auto px-4 py-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Journalist Not Found</h1>
          <p className="text-zinc-400">The journalist profile you're looking for doesn't exist.</p>
          <Link href="/">
            <a className="inline-block mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors">
              Back to Home
            </a>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const publishedArticles = journalist.articles.filter(a => a.publishedAt);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      <SEO
        title={`${journalist.nickname} ${journalist.surname} - Reporter | Phuket Radar`}
        description={journalist.bio}
      />

      {/* Navigation Bar - Glass Effect */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Area */}
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <img src={logoWhite} alt="Phuket Radar" className="h-14 w-auto object-contain" />
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {["News", "Business", "Tourism", "Events", "Crime", "National"].map((item) => (
                <Link key={item} href={`/${item.toLowerCase()}`}>
                  <a className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group">
                    {item}
                    <span className="absolute -bottom-5 left-0 w-full h-0.5 bg-blue-500 transition-transform duration-300 scale-x-0 group-hover:scale-x-100" />
                  </a>
                </Link>
              ))}
            </div>

            {/* Search Icon */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 container max-w-6xl mx-auto px-4 pt-32 pb-12">
        {/* Journalist Header */}
        <div className="mb-16 relative">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
            {/* Large headshot with ring */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full opacity-70 blur group-hover:opacity-100 transition duration-500"></div>
              <Avatar className="w-48 h-48 border-4 border-[#050505] rounded-full relative z-10" data-testid="img-journalist-avatar">
                <AvatarImage src={journalist.headshot} alt={`${journalist.nickname} ${journalist.surname}`} className="object-cover object-top" />
                <AvatarFallback className="text-4xl bg-zinc-800 text-zinc-400">{journalist.nickname[0]}</AvatarFallback>
              </Avatar>
            </div>

            {/* Bio section */}
            <div className="flex-1 max-w-2xl">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-4">
                <h1 className="text-5xl font-bold tracking-tight flex items-center gap-3" data-testid="text-journalist-name">
                  {journalist.nickname} {journalist.surname}
                  <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
                </h1>
              </div>

              <Badge variant="secondary" className="mb-6 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-1 text-sm uppercase tracking-wider" data-testid="badge-journalist-beat">
                {journalist.beat}
              </Badge>

              <p className="text-xl text-zinc-300 mb-6 leading-relaxed" data-testid="text-journalist-bio">
                {journalist.bio}
              </p>

              <div className="inline-block bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-sm text-zinc-400 italic" data-testid="text-journalist-fun-fact">
                  <span className="font-semibold text-blue-400 not-italic block mb-1">Fun Fact</span>
                  "{journalist.funFact}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Articles section */}
        <div className="border-t border-white/5 pt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2" data-testid="text-articles-heading">
              <span className="w-1 h-8 bg-blue-500 rounded-full block"></span>
              Latest Stories
              <span className="text-zinc-500 font-normal text-lg ml-2">({publishedArticles.length})</span>
            </h2>
          </div>

          {publishedArticles.length === 0 ? (
            <div className="text-center py-24 bg-zinc-900/30 rounded-2xl border border-white/5">
              <p className="text-zinc-500 text-lg">No published articles yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      </main>

      <Footer />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
