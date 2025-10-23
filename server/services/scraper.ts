
export interface ScrapedPost {
  title: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
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
  image?: string; // Direct image URL field from ScrapeCreators API
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

  // Normalize Facebook post URL to handle different formats
  private normalizeFacebookUrl(url: string): string {
    try {
      // Extract the post ID from various Facebook URL formats
      // Format 1: /posts/pfbid... -> extract pfbid
      // Format 2: /posts/12345... -> extract numeric ID
      // We'll normalize to always use the permalink format if available
      
      const postIdMatch = url.match(/\/posts\/([^/?]+)/);
      if (postIdMatch) {
        const postId = postIdMatch[1];
        // Return a normalized format using just the post ID
        // This ensures both pfbid and numeric IDs are treated uniquely
        return `https://www.facebook.com/posts/${postId}`;
      }
      
      // If no match, return original URL
      return url;
    } catch (error) {
      console.error("Error normalizing Facebook URL:", error);
      return url;
    }
  }

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
        console.log("\n📋 FIRST POST STRUCTURE FROM API:");
        console.log(JSON.stringify(data.posts[0], null, 2));
        
        // Log attachment structure if it exists
        if (data.posts[0].attachments?.data) {
          console.log("\n📎 ATTACHMENTS STRUCTURE:");
          console.log(JSON.stringify(data.posts[0].attachments, null, 2));
        }
        console.log("\n");
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
    const seenUrls = new Set<string>(); // Track URLs within this batch to prevent duplicates

    for (const post of posts) {
      try {
        // Skip posts without text content
        if (!post.text || post.text.trim().length < 20) {
          console.log(`Skipping post ${post.id} - insufficient text content`);
          continue;
        }

        // Normalize the source URL early to check for duplicates
        const rawSourceUrl = post.permalink || post.url || sourceUrl;
        const normalizedSourceUrl = this.normalizeFacebookUrl(rawSourceUrl);

        // Skip if we've already seen this URL in this batch
        if (seenUrls.has(normalizedSourceUrl)) {
          console.log(`⏭️  Skipping duplicate URL in batch: ${normalizedSourceUrl}`);
          continue;
        }
        seenUrls.add(normalizedSourceUrl);

        // Extract the first line as title (or use first 100 chars)
        const lines = post.text.split('\n').filter(line => line.trim());
        const title = lines[0]?.substring(0, 200) || post.text.substring(0, 100);
        const content = post.text;

        // Extract ALL image URLs from the post
        const imageUrls: string[] = [];
        let imageUrl: string | undefined;
        
        // Try direct image field first (ScrapeCreators API uses this)
        if (post.image) {
          imageUrls.push(post.image);
        }
        
        // Try full_picture (alternative field)
        if (post.full_picture && post.full_picture !== post.image) {
          imageUrls.push(post.full_picture);
        }
        
        // Try attachments for additional images
        if (post.attachments?.data) {
          for (const attachment of post.attachments.data) {
            // Try direct media image
            if (attachment.media?.image?.src && !imageUrls.includes(attachment.media.image.src)) {
              imageUrls.push(attachment.media.image.src);
            }
            // Try attachment URL
            else if (attachment.url && (attachment.type === 'photo' || attachment.media_type === 'photo') && !imageUrls.includes(attachment.url)) {
              imageUrls.push(attachment.url);
            }
            
            // Try ALL subattachments (for multi-image posts)
            if (attachment.subattachments?.data) {
              for (const subattachment of attachment.subattachments.data) {
                if (subattachment.media?.image?.src && !imageUrls.includes(subattachment.media.image.src)) {
                  imageUrls.push(subattachment.media.image.src);
                }
              }
            }
          }
        }
        
        // Try video thumbnail if no images found
        if (imageUrls.length === 0 && post.videoDetails?.thumbnail) {
          imageUrls.push(post.videoDetails.thumbnail);
        }
        
        // Set the first image as primary imageUrl for backward compatibility
        imageUrl = imageUrls[0];
        
        // Log multi-image posts for debugging
        if (imageUrls.length > 1) {
          console.log(`\n📸 MULTI-IMAGE POST DETECTED!`);
          console.log(`   Title: ${title.substring(0, 60)}...`);
          console.log(`   Image count: ${imageUrls.length}`);
          console.log(`   Images:`);
          imageUrls.forEach((url, idx) => {
            console.log(`     ${idx + 1}. ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
          });
          console.log('');
        }

        // Parse timestamp if available
        const publishedAt = post.created_time ? new Date(post.created_time) : new Date();

        scrapedPosts.push({
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          sourceUrl: normalizedSourceUrl,
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
  async scrapeFacebookPageWithPagination(
    pageUrl: string, 
    maxPages: number = 3,
    checkForDuplicate?: (sourceUrl: string) => Promise<boolean>
  ): Promise<ScrapedPost[]> {
    try {
      if (!this.apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured");
      }

      let allPosts: ScrapedPost[] = [];
      let cursor: string | undefined;
      let pageCount = 0;
      let hitKnownPost = false;

      while (pageCount < maxPages && !hitKnownPost) {
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
          console.log("\n📋 FIRST POST STRUCTURE FROM API:");
          console.log(JSON.stringify(data.posts[0], null, 2));
          
          // Log attachment structure if it exists
          if (data.posts[0].attachments?.data) {
            console.log("\n📎 ATTACHMENTS STRUCTURE:");
            console.log(JSON.stringify(data.posts[0].attachments, null, 2));
          }
          console.log("\n");
        }

        if (!data.success || !data.posts || data.posts.length === 0) {
          console.log(`No more posts available at page ${pageCount + 1}`);
          break;
        }

        const parsed = this.parseScrapeCreatorsResponse(data.posts, pageUrl);
        
        // If duplicate checker is provided, check each post and stop if we hit a known one
        if (checkForDuplicate) {
          for (const post of parsed) {
            const isDuplicate = await checkForDuplicate(post.sourceUrl);
            if (isDuplicate) {
              console.log(`✋ Hit known post "${post.title.substring(0, 50)}..." - stopping pagination to save API credits`);
              hitKnownPost = true;
              break;
            }
            allPosts.push(post);
          }
        } else {
          // No duplicate checking, add all posts
          allPosts = [...allPosts, ...parsed];
        }

        cursor = data.cursor;
        pageCount++;

        // Break if no cursor for next page
        if (!cursor) {
          console.log("No more pages available");
          break;
        }
      }

      console.log(`Total NEW posts collected: ${allPosts.length} from ${pageCount} page(s)`);
      return allPosts;
    } catch (error) {
      console.error("Error scraping with pagination:", error);
      throw error;
    }
  }
}

// Provider-agnostic scraper interface
export async function getScraperService(): Promise<{
  scrapeFacebookPage: (pageUrl: string) => Promise<ScrapedPost[]>;
  scrapeFacebookPageWithPagination: (
    pageUrl: string,
    maxPages?: number,
    checkForDuplicate?: (sourceUrl: string) => Promise<boolean>
  ) => Promise<ScrapedPost[]>;
}> {
  const provider = process.env.SCRAPER_PROVIDER || (process.env.APIFY_API_KEY ? 'apify' : 'scrapecreators');
  
  if (provider === 'apify' && process.env.APIFY_API_KEY) {
    console.log('🔄 Using Apify scraper (multi-image support enabled)');
    const { apifyScraperService } = await import('./apify-scraper');
    return apifyScraperService;
  }
  
  console.log('🔄 Using ScrapeCreators scraper (single image only)');
  return scraperService;
}

export const scraperService = new ScraperService();
