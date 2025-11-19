
import { storage } from "../server/storage";

async function main() {
  console.log("🔍 Checking Database Status...");

  try {
    const allArticles = await storage.getAllArticles();
    console.log(`\n📊 Total Articles: ${allArticles.length}`);

    // Check recent articles (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentArticles = allArticles.filter(a => new Date(a.publishedAt) > twoWeeksAgo);
    console.log(`\n📅 Articles in last 14 days: ${recentArticles.length}`);

    if (recentArticles.length === 0) {
      console.log("⚠️  No articles found in the last 14 days. Scraper might be down.");
    } else {
      // Analyze recent articles
      const published = recentArticles.filter(a => a.isPublished);
      const drafts = recentArticles.filter(a => !a.isPublished);

      console.log(`   ✅ Published: ${published.length}`);
      console.log(`   📝 Drafts (Unpublished): ${drafts.length}`);

      // Category breakdown
      const categories: Record<string, number> = {};
      recentArticles.forEach(a => {
        categories[a.category] = (categories[a.category] || 0) + 1;
      });

      console.log("\n🏷️  Category Distribution (Last 14 Days):");
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count}`);
      });

      // Interest Score breakdown
      console.log("\n⭐ Interest Score Stats (Last 14 Days):");
      const scores = recentArticles.map(a => a.interestScore || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      console.log(`   Average Score: ${avgScore.toFixed(2)}`);
      console.log(`   Min Score: ${Math.min(...scores)}`);
      console.log(`   Max Score: ${Math.max(...scores)}`);

      // Check for missing images
      const missingImages = recentArticles.filter(a => !a.imageUrl && (!a.imageUrls || a.imageUrls.length === 0));
      console.log(`\n🖼️  Articles with NO images: ${missingImages.length}`);
    }

  } catch (error) {
    console.error("❌ Error checking database:", error);
  }
  process.exit(0);
}

main();
