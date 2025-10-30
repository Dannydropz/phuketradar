import { db } from "../server/db";
import { articles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { postArticleToFacebook } from "../server/lib/facebook-service";
import { storage } from "../server/storage";

// IDs of the 4 articles that were created with wrong facebookPostId
const missingArticleIds = [
  '3c7ff5b9-ed9c-4646-8366-596f12c0800f',
  '87b61cbf-16e3-400b-96fe-51a32e9a559b',
  'b3e2bf9c-d7b4-4f95-9520-02eb57c86aec',
  'da10dd1d-d83c-4ebe-8ca8-a7f9ba42c2d6',
];

async function postMissingArticles() {
  console.log("🔧 Starting manual Facebook posting for 4 missing articles...\n");
  
  for (const articleId of missingArticleIds) {
    try {
      console.log(`\n📝 Processing article: ${articleId}`);
      
      // Clear the incorrect facebookPostId
      await db
        .update(articles)
        .set({ facebookPostId: null })
        .where(eq(articles.id, articleId));
      
      console.log("  ✅ Cleared incorrect facebookPostId");
      
      // Get the fresh article
      const article = await storage.getArticleById(articleId);
      
      if (!article) {
        console.error(`  ❌ Article not found: ${articleId}`);
        continue;
      }
      
      console.log(`  📄 Title: ${article.title.substring(0, 60)}...`);
      
      // Post to Facebook
      const result = await postArticleToFacebook(article, storage);
      
      if (result) {
        console.log(`  ✅ Posted to Facebook: ${result.postUrl}`);
        console.log(`  📘 Post ID: ${result.postId}\n`);
      } else {
        console.error(`  ❌ Failed to post to Facebook\n`);
      }
      
      // Wait 2 seconds between posts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  ❌ Error processing article ${articleId}:`, error);
    }
  }
  
  console.log("\n✅ Completed manual Facebook posting!");
  process.exit(0);
}

postMissingArticles().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
