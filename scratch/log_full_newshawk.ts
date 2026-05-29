
import 'dotenv/config';

async function logFullNewshawk() {
  const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY;
  const PAGE_POSTS_API = 'https://api.scrapecreators.com/v1/facebook/profile/posts';
  const url = 'https://www.facebook.com/NewshawkPhuket';
  
  const response = await fetch(`${PAGE_POSTS_API}?url=${encodeURIComponent(url)}`, {
    headers: { 'x-api-key': SCRAPECREATORS_API_KEY! }
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

logFullNewshawk();
