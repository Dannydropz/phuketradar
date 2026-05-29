
import 'dotenv/config';
import { scraperService } from '../server/services/scraper';

async function testNewshawk() {
  const url = 'https://www.facebook.com/NewshawkPhuket';
  console.log(`Scraping ${url}...`);
  try {
    const posts = await scraperService.scrapeFacebookPage(url);
    console.log(`Found ${posts.length} posts`);
    posts.forEach((post, i) => {
      console.log(`\n--- Post ${i + 1} ---`);
      console.log(`Title: ${post.title}`);
      console.log(`Source URL: ${post.sourceUrl}`);
      console.log(`Is Reshare: ${post.isResharedPost}`);
      console.log(`Content length: ${post.content.length}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

testNewshawk();
