import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet";
import { ArticleCard } from "@/components/ArticleCard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { ArticleListItem } from "@shared/schema";

export default function TagPage() {
    const { tag } = useParams<{ tag: string }>();

    // Convert slug to display name (e.g., "patong-beach" -> "Patong Beach")
    const tagDisplayName = tag
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const { data: articles, isLoading } = useQuery<ArticleListItem[]>({
        queryKey: ["/api/articles/tag/" + tag],
    });

    return (
        <div className="min-h-screen flex flex-col bg-black text-white">
            <Helmet>
                <title>{tagDisplayName} - Phuket Radar</title>
                <meta name="description" content={`Latest news about ${tagDisplayName} in Phuket`} />
            </Helmet>

            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <div className="mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                        Home
                    </Link>
                    <span className="mx-2 text-gray-600">/</span>
                    <span className="text-white">Tag: {tagDisplayName}</span>
                </div>

                {/* Tag Header */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {tagDisplayName}
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Latest news and updates
                    </p>
                </div>

                {/* Articles Grid */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
                        <p className="mt-4 text-gray-400">Loading articles...</p>
                    </div>
                ) : !articles || articles.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-xl text-gray-400">No articles found for this tag.</p>
                        <Link href="/" className="inline-block mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                            ← Back to Home
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="text-sm text-gray-400 mb-6">
                            {articles.length} {articles.length === 1 ? 'article' : 'articles'} found
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {articles.map((article) => (
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
                                    isDeveloping={article.isDeveloping}
                                    seriesId={article.seriesId}
                                    isParentStory={article.isParentStory}
                                />
                            ))}
                        </div>
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}
