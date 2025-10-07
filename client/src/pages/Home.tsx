import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ArticleCard } from "@/components/ArticleCard";
import { Footer } from "@/components/Footer";
import beachImage from "@assets/generated_images/Phuket_beach_aerial_view_6ce49fc5.png";
import oldTownImage from "@assets/generated_images/Phuket_Old_Town_architecture_fcec7125.png";
import marketImage from "@assets/generated_images/Phuket_night_market_scene_a0022804.png";

export default function Home() {
  // TODO: remove mock functionality - replace with real API data
  const featured = {
    id: "1",
    title: "Major Development Plans Announced for Phuket International Airport",
    excerpt: "The airport authority has unveiled ambitious expansion plans that will increase capacity by 50% and add new international terminals, positioning Phuket as a major regional hub for Southeast Asian travel.",
    imageUrl: beachImage,
    category: "Breaking",
    publishedAt: new Date(Date.now() - 1000 * 60 * 15),
    isBreaking: true,
  };

  const sidebar = [
    {
      id: "2",
      title: "Old Town Restoration Project Enters Final Phase",
      excerpt: "Historic buildings in Phuket Old Town near completion.",
      imageUrl: oldTownImage,
      category: "Events",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60),
    },
    {
      id: "3",
      title: "Night Markets See Record Visitor Numbers",
      excerpt: "Local vendors report exceptional sales during tourist season.",
      imageUrl: marketImage,
      category: "Business",
      publishedAt: new Date(Date.now() - 1000 * 60 * 90),
    },
    {
      id: "4",
      title: "New Ferry Service Connects Phuket to Nearby Islands",
      excerpt: "Improved connectivity enhances tourism opportunities.",
      imageUrl: beachImage,
      category: "Tourism",
      publishedAt: new Date(Date.now() - 1000 * 60 * 120),
    },
  ];

  const latestArticles = [
    {
      id: "5",
      title: "Sustainable Tourism Initiative Launched",
      excerpt: "Local government partners with businesses to promote eco-friendly tourism practices across Phuket, focusing on beach conservation and waste reduction programs.",
      imageUrl: beachImage,
      category: "Tourism",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    },
    {
      id: "6",
      title: "New Restaurant District Opens in Old Town",
      excerpt: "A collection of boutique restaurants brings international cuisine to Phuket's historic district, blending traditional architecture with modern dining experiences.",
      imageUrl: oldTownImage,
      category: "Business",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      id: "7",
      title: "Annual Vegetarian Festival Dates Announced",
      excerpt: "Phuket's famous vegetarian festival returns with expanded program of cultural performances, street processions, and traditional ceremonies throughout the island.",
      imageUrl: marketImage,
      category: "Events",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
    {
      id: "8",
      title: "Beach Safety Campaign Launched for High Season",
      excerpt: "Authorities increase lifeguard presence and install new warning systems across popular beaches as tourist season reaches peak levels.",
      imageUrl: beachImage,
      category: "Breaking",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    },
    {
      id: "9",
      title: "Local Schools Implement New English Programs",
      excerpt: "Education initiative aims to improve English language skills among local students to better serve Phuket's international community and tourism industry.",
      imageUrl: oldTownImage,
      category: "Events",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 7),
    },
    {
      id: "10",
      title: "Property Market Shows Strong Growth",
      excerpt: "Real estate sector sees increased foreign investment as international buyers return to Phuket, with luxury villa sales leading the market recovery.",
      imageUrl: marketImage,
      category: "Business",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <HeroSection featured={featured} sidebar={sidebar} />
          
          <section>
            <h2 className="text-3xl font-bold mb-6">Latest News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} {...article} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
