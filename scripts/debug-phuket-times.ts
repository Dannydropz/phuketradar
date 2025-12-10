import { scraperService } from "../server/services/scraper";

async function debugScrape() {
  console.log("Scraping Phuket Times...");
  
  const posts = await scraperService.scrapeFacebookPage("https://www.facebook.com/PhuketTimeNews");
  
  console.log(`\nFound ${posts.length} posts:\n`);
  
  for (const post of posts) {
    console.log("---");
    console.log(`Title: ${post.title.substring(0, 80)}...`);
    console.log(`Content: ${post.content.substring(0, 100)}...`);
    console.log(`Images: ${post.imageUrls?.length || (post.imageUrl ? 1 : 0)}`);
    console.log(`Video: ${post.isVideo}`);
    console.log(`Published: ${post.publishedAt}`);
  }
}

debugScrape().catch(console.error);
