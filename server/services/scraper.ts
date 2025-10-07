
export interface ScrapedPost {
  title: string;
  content: string;
  imageUrl?: string;
  sourceUrl: string;
  publishedAt: Date;
}

interface ScrapeCreatorsPost {
  id: string;
  text: string;
  url: string;
  permalink: string;
  author?: {
    name: string;
    id: string;
  };
  created_time?: string;
  attachments?: {
    data?: Array<{
      media?: {
        image?: {
          src: string;
        };
      };
      type?: string;
      media_type?: string;
      url?: string;
      subattachments?: {
        data?: Array<{
          media?: {
            image?: {
              src: string;
            };
          };
        }>;
      };
    }>;
  };
  full_picture?: string;
  videoDetails?: {
    sdUrl?: string;
    hdUrl?: string;
    thumbnail?: string;
  };
}

interface ScrapeCreatorsResponse {
  success: boolean;
  posts: ScrapeCreatorsPost[];
  cursor?: string;
}

export class ScraperService {
  private scrapeCreatorsApiUrl = "https://api.scrapecreators.com/v1/facebook/profile/posts";
  private apiKey = process.env.SCRAPECREATORS_API_KEY;

  async scrapeFacebookPage(pageUrl: string): Promise<ScrapedPost[]> {
    try {
      if (!this.apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured");
      }

      console.log(`Scraping Facebook page: ${pageUrl}`);
      
      // Fetch posts from scrapecreators API
      const response = await fetch(`${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ScrapeCreators API error (${response.status}):`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ScrapeCreatorsResponse = await response.json();
      
      console.log(`ScrapeCreators returned ${data.posts?.length || 0} posts`);
      
      // Log first post structure to understand the API response
      if (data.posts && data.posts.length > 0) {
        console.log("First post structure:", JSON.stringify(data.posts[0], null, 2));
      }
      
      if (!data.success || !data.posts || data.posts.length === 0) {
        console.log("No posts found in response");
        return [];
      }

      const scrapedPosts = this.parseScrapeCreatorsResponse(data.posts, pageUrl);
      console.log(`Successfully parsed ${scrapedPosts.length} posts`);
      
      return scrapedPosts;
    } catch (error) {
      console.error("Error scraping Facebook page:", error);
      throw new Error("Failed to scrape Facebook page");
    }
  }

  private parseScrapeCreatorsResponse(posts: ScrapeCreatorsPost[], sourceUrl: string): ScrapedPost[] {
    const scrapedPosts: ScrapedPost[] = [];

    for (const post of posts) {
      try {
        // Skip posts without text content
        if (!post.text || post.text.trim().length < 20) {
          console.log(`Skipping post ${post.id} - insufficient text content`);
          continue;
        }

        // Extract the first line as title (or use first 100 chars)
        const lines = post.text.split('\n').filter(line => line.trim());
        const title = lines[0]?.substring(0, 200) || post.text.substring(0, 100);
        const content = post.text;

        // Extract image URL - try multiple possible locations
        let imageUrl: string | undefined;
        
        // Try full_picture first (most common for posts with images)
        if (post.full_picture) {
          imageUrl = post.full_picture;
          console.log(`Found image via full_picture: ${imageUrl.substring(0, 50)}...`);
        }
        // Try video thumbnail
        else if (post.videoDetails?.thumbnail) {
          imageUrl = post.videoDetails.thumbnail;
          console.log(`Found image via video thumbnail: ${imageUrl.substring(0, 50)}...`);
        }
        // Try attachments
        else if (post.attachments?.data) {
          for (const attachment of post.attachments.data) {
            // Try direct media image
            if (attachment.media?.image?.src) {
              imageUrl = attachment.media.image.src;
              console.log(`Found image via attachment media: ${imageUrl.substring(0, 50)}...`);
              break;
            }
            // Try attachment URL
            else if (attachment.url && (attachment.type === 'photo' || attachment.media_type === 'photo')) {
              imageUrl = attachment.url;
              console.log(`Found image via attachment url: ${imageUrl.substring(0, 50)}...`);
              break;
            }
            // Try subattachments (for multi-image posts)
            else if (attachment.subattachments?.data?.[0]?.media?.image?.src) {
              imageUrl = attachment.subattachments.data[0].media.image.src;
              console.log(`Found image via subattachment: ${imageUrl.substring(0, 50)}...`);
              break;
            }
          }
        }

        if (!imageUrl) {
          console.log(`No image found for post ${post.id}`);
        }

        // Parse timestamp if available
        const publishedAt = post.created_time ? new Date(post.created_time) : new Date();

        console.log(`Extracted post: "${title.substring(0, 50)}..." (${content.length} chars, image: ${imageUrl ? 'yes' : 'no'})`);

        scrapedPosts.push({
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          sourceUrl: post.permalink || post.url || sourceUrl,
          publishedAt,
        });
      } catch (error) {
        console.error(`Error parsing post ${post.id}:`, error);
        // Continue with next post
      }
    }

    return scrapedPosts;
  }

  // Method to fetch multiple pages of posts using cursor pagination
  async scrapeFacebookPageWithPagination(pageUrl: string, maxPages: number = 3): Promise<ScrapedPost[]> {
    try {
      if (!this.apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured");
      }

      let allPosts: ScrapedPost[] = [];
      let cursor: string | undefined;
      let pageCount = 0;

      while (pageCount < maxPages) {
        const url = cursor 
          ? `${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}&cursor=${cursor}`
          : `${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}`;

        console.log(`Fetching page ${pageCount + 1}/${maxPages}...`);

        const response = await fetch(url, {
          headers: {
            'x-api-key': this.apiKey
          }
        });

        if (!response.ok) {
          console.error(`Error fetching page ${pageCount + 1}: ${response.status}`);
          break;
        }

        const data: ScrapeCreatorsResponse = await response.json();
        
        // Log first post structure on first page to understand the API response
        if (pageCount === 0 && data.posts && data.posts.length > 0) {
          console.log("=== FIRST POST STRUCTURE (ScrapeCreators API) ===");
          console.log(JSON.stringify(data.posts[0], null, 2));
          console.log("=== END FIRST POST STRUCTURE ===");
        }

        if (!data.success || !data.posts || data.posts.length === 0) {
          console.log(`No more posts available at page ${pageCount + 1}`);
          break;
        }

        const parsed = this.parseScrapeCreatorsResponse(data.posts, pageUrl);
        allPosts = [...allPosts, ...parsed];

        cursor = data.cursor;
        pageCount++;

        // Break if no cursor for next page
        if (!cursor) {
          console.log("No more pages available");
          break;
        }
      }

      console.log(`Total posts collected: ${allPosts.length} from ${pageCount} pages`);
      return allPosts;
    } catch (error) {
      console.error("Error scraping with pagination:", error);
      throw error;
    }
  }
}

export const scraperService = new ScraperService();
