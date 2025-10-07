import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Share2, Facebook } from "lucide-react";
import { useRoute } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArticleCard } from "@/components/ArticleCard";
import beachImage from "@assets/generated_images/Phuket_beach_aerial_view_6ce49fc5.png";
import oldTownImage from "@assets/generated_images/Phuket_Old_Town_architecture_fcec7125.png";
import marketImage from "@assets/generated_images/Phuket_night_market_scene_a0022804.png";

export default function ArticleDetail() {
  const [, params] = useRoute("/article/:id");

  // TODO: remove mock functionality - fetch real article by ID
  const article = {
    id: params?.id || "1",
    title: "Major Development Plans Announced for Phuket International Airport",
    content: `
      <p>The Phuket Airport Authority has unveiled comprehensive expansion plans that will transform the island's main gateway into one of Southeast Asia's premier aviation hubs. The ambitious project, estimated at 15 billion baht, aims to increase passenger capacity by 50% over the next five years.</p>

      <p>Airport Director Thanee Chuangchoo announced the plans at a press conference today, highlighting several key components of the development. "This expansion is crucial for Phuket's continued growth as a world-class tourist destination," he stated. "We're not just adding capacity—we're reimagining the entire passenger experience."</p>

      <h2>Key Features of the Expansion</h2>

      <p>The development includes construction of a new international terminal building spanning 150,000 square meters, equipped with state-of-the-art facilities and sustainable design features. The terminal will house 24 additional boarding gates, premium lounges, and an expanded duty-free shopping area.</p>

      <p>Infrastructure improvements will also extend to the airfield, with plans for two additional taxiways and upgraded runway lighting systems to enhance operational efficiency and safety. The cargo handling area will be expanded to accommodate growing freight demands, particularly for seafood and agricultural exports.</p>

      <h2>Impact on Tourism</h2>

      <p>Tourism industry leaders have welcomed the announcement, noting that airport capacity has been a limiting factor during peak seasons. The Tourism Authority of Thailand projects that the expansion could support an additional 5 million international arrivals annually once completed.</p>

      <p>Local businesses anticipate significant economic benefits from increased visitor numbers. Hotel associations report strong booking trends for the upcoming high season, with many properties already at capacity for major holidays.</p>

      <h2>Environmental Considerations</h2>

      <p>The airport authority has committed to incorporating green building standards throughout the project. Solar panels will be installed on terminal roofs, rainwater harvesting systems will reduce water consumption, and energy-efficient cooling systems will minimize environmental impact.</p>

      <p>Construction is scheduled to begin in the third quarter of 2026, with phased completion planned to minimize disruption to current operations. The first phase, focusing on the new terminal building, is expected to be operational by late 2028.</p>
    `,
    excerpt: "The airport authority has unveiled ambitious expansion plans that will increase capacity by 50% and add new international terminals.",
    imageUrl: beachImage,
    category: "Breaking",
    publishedAt: new Date(Date.now() - 1000 * 60 * 15),
    sourceUrl: "https://www.facebook.com/PhuketTimeNews",
    isBreaking: true,
  };

  const relatedArticles = [
    {
      id: "5",
      title: "Sustainable Tourism Initiative Launched",
      excerpt: "Local government partners with businesses to promote eco-friendly tourism practices across Phuket.",
      imageUrl: beachImage,
      category: "Tourism",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    },
    {
      id: "6",
      title: "New Restaurant District Opens in Old Town",
      excerpt: "A collection of boutique restaurants brings international cuisine to Phuket's historic district.",
      imageUrl: oldTownImage,
      category: "Business",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      id: "7",
      title: "Annual Vegetarian Festival Dates Announced",
      excerpt: "Phuket's famous vegetarian festival returns with expanded program of cultural performances.",
      imageUrl: marketImage,
      category: "Events",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
  ];

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
              {article.isBreaking && (
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
                  {formatDistanceToNow(article.publishedAt, { addSuffix: true })}
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

          {article.imageUrl && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-auto"
                data-testid="img-article-main"
              />
            </div>
          )}

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

        <section className="bg-card border-y mt-12 py-12">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((relatedArticle) => (
                <ArticleCard key={relatedArticle.id} {...relatedArticle} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
