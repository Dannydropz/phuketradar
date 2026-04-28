import dotenv from "dotenv";
import path from "path";
// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { ScraperService } from "../server/services/scraper";

async function runDryRun() {
  const scraper = new ScraperService();
  const pageUrl = "https://www.facebook.com/NewshawkPhuket";
  
  console.log(`\n🔍 DRY RUN: Scraping last 20 posts from ${pageUrl}...\n`);
  
  try {
    // We use maxPages=1 since the first page usually has ~10-20 posts
    const posts = await scraper.scrapeFacebookPageWithPagination(pageUrl, 1);
    const limit = posts.slice(0, 20);
    
    console.log(`| Post URL | Words | Chars | Reshare? | Publish? | Reason |`);
    console.log(`| :--- | :--- | :--- | :--- | :--- | :--- |`);
    
    const MIN_CONTENT_WORDS = 30;
    const MIN_CONTENT_CHARS = 120;
    
    for (const post of limit) {
      const combinedText = `${post.title} ${post.content}`.trim();
      const wordCount = combinedText.split(/\s+/).filter(w => w.length > 0).length;
      const charCount = combinedText.length;
      
      // Check if it was tagged as a reshare during scraping
      // (The scraper logs this, but we'll check if it has the hidden reshare info if I can access it)
      // Actually, resolveResharedPostsInBatch already ran. If it resolved, content is long.
      // If it failed, content is short.
      
      let wouldPublish = "✅ YES";
      let reason = "-";
      
      if (wordCount < MIN_CONTENT_WORDS || charCount < MIN_CONTENT_CHARS) {
        wouldPublish = "❌ NO";
        reason = `Too thin (${wordCount}w/${charCount}c)`;
      }
      
      // Note: In the real scheduler, if resolution succeeded, wordCount would be > 30.
      // If it failed, it's caught here.
      
      console.log(`| ${post.sourceUrl.substring(0, 50)}... | ${wordCount} | ${charCount} | ${post.sourceName !== "Newshawk Phuket" ? "YES" : "NO"} | ${wouldPublish} | ${reason} |`);
    }
    
  } catch (error) {
    console.error("Dry run failed:", error);
  }
}

runDryRun();
