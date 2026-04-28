import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { ScraperService } from "../server/services/scraper";

async function runDryRun() {
  const scraper = new ScraperService();
  const pageUrl = "https://www.facebook.com/PhuketTimeNews";
  
  console.log(`\n🔍 TESTING SCRAPER with ${pageUrl}...\n`);
  
  try {
    const posts = await scraper.scrapeFacebookPageWithPagination(pageUrl, 1);
    console.log(`Got ${posts.length} posts from ${pageUrl}`);
    
    if (posts.length > 0) {
      console.log("Sample post title:", posts[0].title);
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runDryRun();
