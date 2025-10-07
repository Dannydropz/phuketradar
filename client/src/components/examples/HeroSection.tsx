import { HeroSection } from "../HeroSection";
import beachImage from "@assets/generated_images/Phuket_beach_aerial_view_6ce49fc5.png";
import oldTownImage from "@assets/generated_images/Phuket_Old_Town_architecture_fcec7125.png";
import marketImage from "@assets/generated_images/Phuket_night_market_scene_a0022804.png";

export default function HeroSectionExample() {
  const featured = {
    id: "hero-1",
    title: "Major Development Plans Announced for Phuket International Airport",
    excerpt: "The airport authority has unveiled ambitious expansion plans that will increase capacity by 50% and add new international terminals, positioning Phuket as a major regional hub.",
    imageUrl: beachImage,
    category: "Breaking",
    publishedAt: new Date(Date.now() - 1000 * 60 * 15),
    isBreaking: true,
  };

  const sidebar = [
    {
      id: "side-1",
      title: "Old Town Restoration Project Enters Final Phase",
      excerpt: "Historic buildings in Phuket Old Town near completion.",
      imageUrl: oldTownImage,
      category: "Events",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60),
      isBreaking: false,
    },
    {
      id: "side-2",
      title: "Night Markets See Record Visitor Numbers",
      excerpt: "Local vendors report exceptional sales during tourist season.",
      imageUrl: marketImage,
      category: "Business",
      publishedAt: new Date(Date.now() - 1000 * 60 * 90),
      isBreaking: false,
    },
    {
      id: "side-3",
      title: "New Ferry Service Connects Phuket to Nearby Islands",
      excerpt: "Improved connectivity enhances tourism opportunities.",
      imageUrl: beachImage,
      category: "Tourism",
      publishedAt: new Date(Date.now() - 1000 * 60 * 120),
      isBreaking: false,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <HeroSection featured={featured} sidebar={sidebar} />
    </div>
  );
}
