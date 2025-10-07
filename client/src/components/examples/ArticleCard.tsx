import { ArticleCard } from "../ArticleCard";
import beachImage from "@assets/generated_images/Phuket_beach_aerial_view_6ce49fc5.png";

export default function ArticleCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <ArticleCard
        id="1"
        title="New Beach Safety Measures Implemented Across Phuket"
        excerpt="Local authorities have announced enhanced safety protocols for all major beaches in Phuket, including increased lifeguard presence and new warning systems."
        imageUrl={beachImage}
        category="Breaking"
        publishedAt={new Date(Date.now() - 1000 * 60 * 30)}
        isBreaking={true}
      />
      <ArticleCard
        id="2"
        title="Tourism Numbers Surge in Q4 2025"
        excerpt="Phuket sees record-breaking tourist arrivals as international travel continues to recover, with projections exceeding pre-pandemic levels."
        imageUrl={beachImage}
        category="Tourism"
        publishedAt={new Date(Date.now() - 1000 * 60 * 60 * 2)}
      />
      <ArticleCard
        id="3"
        title="Local Markets Report Strong Business Growth"
        excerpt="Small businesses in Phuket's traditional markets are experiencing significant growth, driven by both tourism and local demand."
        category="Business"
        publishedAt={new Date(Date.now() - 1000 * 60 * 60 * 5)}
      />
    </div>
  );
}
