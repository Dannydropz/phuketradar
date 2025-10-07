
export interface ScrapedPost {
  title: string;
  content: string;
  imageUrl?: string;
  sourceUrl: string;
  publishedAt: Date;
}

export class ScraperService {
  private jinaApiUrl = "https://r.jina.ai";

  async scrapeFacebookPage(pageUrl: string): Promise<ScrapedPost[]> {
    try {
      // Use JINA AI's reader API to scrape the Facebook page
      const response = await fetch(`${this.jinaApiUrl}/${pageUrl}`, {
        headers: {
          'Accept': 'text/plain',
          'X-Return-Format': 'markdown'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      console.log("=== RAW JINA RESPONSE (first 1000 chars) ===");
      console.log(data.substring(0, 1000));
      console.log("=== END RAW RESPONSE ===");
      const posts = this.parseJinaResponse(data, pageUrl);
      return posts;
    } catch (error) {
      console.error("Error scraping Facebook page:", error);
      throw new Error("Failed to scrape Facebook page");
    }
  }

  private parseJinaResponse(content: string, sourceUrl: string): ScrapedPost[] {
    // Parse the JINA markdown response and extract news posts
    const posts: ScrapedPost[] = [];

    try {
      // Split content into sections that look like posts
      // Facebook posts are often separated by multiple newlines
      const sections = content.split('\n\n').filter((section: string) => section.trim().length > 100);

      console.log(`Found ${sections.length} potential sections in scraped content`);

      for (const section of sections.slice(0, 10)) { // Limit to 10 most recent posts
        // Extract title (usually the first line or heading)
        const lines = section.split('\n').filter((line: string) => line.trim());
        if (lines.length === 0) continue;

        const title = lines[0].replace(/^#+\s*/, '').trim();
        const postContent = lines.slice(1).join('\n').trim();

        // Skip if content is too short (likely not a real article)
        if (postContent.length < 50) continue;

        // Check if it's actual news content (contains certain keywords)
        const newsKeywords = ['phuket', 'news', 'announced', 'reported', 'today', 'breaking', 'update', 'police', 'tourist', 'beach', 'accident'];
        const lowerContent = (title + ' ' + postContent).toLowerCase();
        const isNews = newsKeywords.some(keyword => lowerContent.includes(keyword));

        if (isNews) {
          console.log(`Found potential news article: ${title.substring(0, 50)}...`);
          console.log(`Content preview: ${postContent.substring(0, 200)}...`);
          posts.push({
            title: title.substring(0, 200), // Limit title length
            content: postContent,
            sourceUrl,
            publishedAt: new Date(),
          });
        }
      }

      console.log(`Extracted ${posts.length} news posts from content`);
      return posts;
    } catch (error) {
      console.error("Error parsing JINA response:", error);
      return [];
    }
  }

  // Alternative method using a different scraping approach if JINA doesn't work well
  async scrapeWithFallback(pageUrl: string): Promise<ScrapedPost[]> {
    // This could use scrapecreators.com or another service
    // For now, return empty array as fallback
    console.log("Using fallback scraper for:", pageUrl);
    return [];
  }
}

export const scraperService = new ScraperService();
