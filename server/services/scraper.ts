
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
        // Try multiple API parameter combinations to see if any return images
        const baseUrl = cursor 
          ? `${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}&cursor=${cursor}`
          : `${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}`;
        
        // Try with additional parameters that might enable images
        const urlsToTry = [
          baseUrl,
          `${baseUrl}&fields=full_picture,attachments,text,id,created_time,permalink`,
          `${baseUrl}&include_attachments=true`,
          `${baseUrl}&include_images=true`,
        ];

        console.log(`\n=== Fetching page ${pageCount + 1}/${maxPages} ===`);
        console.log(`Trying ${urlsToTry.length} different API parameter combinations...`);

        let data: ScrapeCreatorsResponse | null = null;
        let successfulUrl = '';

        for (let index = 0; index < urlsToTry.length; index++) {
          const url = urlsToTry[index];
          console.log(`\nAttempt ${index + 1}: ${url.substring(0, 100)}...`);
          
          const response = await fetch(url, {
            headers: {
              'x-api-key': this.apiKey
            }
          });

          if (!response.ok) {
            console.error(`  ❌ Failed with status ${response.status}`);
            continue;
          }

          const responseData: ScrapeCreatorsResponse = await response.json();
          
          if (responseData.success && responseData.posts && responseData.posts.length > 0) {
            console.log(`  ✅ Success! Got ${responseData.posts.length} posts`);
            data = responseData;
            successfulUrl = url;
            break;
          } else {
            console.log(`  ⚠️ No posts in response`);
          }
        }

        if (!data) {
          console.error(`All API attempts failed for page ${pageCount + 1}`);
          break;
        }

        console.log(`\nUsing response from: ${successfulUrl.substring(0, 100)}...`);
        
        // Enhanced logging on first page to understand the API response
        if (pageCount === 0 && data.posts && data.posts.length > 0) {
          console.log("\n" + "=".repeat(80));
          console.log("COMPLETE FIRST POST STRUCTURE (ScrapeCreators API)");
          console.log("=".repeat(80));
          
          const firstPost = data.posts[0];
          console.log(JSON.stringify(firstPost, null, 2));
          
          console.log("\n" + "-".repeat(80));
          console.log("FIELD ANALYSIS:");
          console.log("-".repeat(80));
          console.log("Available top-level fields:", Object.keys(firstPost));
          console.log("Has full_picture?", 'full_picture' in firstPost, firstPost.full_picture || 'N/A');
          console.log("Has attachments?", 'attachments' in firstPost);
          if (firstPost.attachments?.data) {
            console.log("  - Attachments count:", firstPost.attachments.data.length);
            firstPost.attachments.data.forEach((att, i) => {
              console.log(`  - Attachment ${i} fields:`, Object.keys(att));
              console.log(`    - type:`, att.type);
              console.log(`    - media_type:`, att.media_type);
              console.log(`    - has media.image.src?:`, !!att.media?.image?.src);
              console.log(`    - url:`, att.url?.substring(0, 80) || 'N/A');
            });
          }
          console.log("Has videoDetails?", 'videoDetails' in firstPost);
          console.log("=".repeat(80) + "\n");
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
