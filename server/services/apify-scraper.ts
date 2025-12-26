/**
 * Apify Facebook Scraper Integration
 * 
 * Uses Apify's Facebook Posts Scraper to extract posts with full multi-image support.
 * This scraper can extract all images from carousel/album posts, unlike ScrapeCreators.
 * 
 * API Documentation: https://apify.com/apify/facebook-posts-scraper
 */

import { ScrapedPost } from './scraper';

interface ApifyImage {
  link: string;
}

interface ApifyMediaItem {
  thumbnail?: string; // Thumbnail URL for videos/images
  image?: string | { uri: string; height?: number; width?: number }; // Direct image URL or object with URI
  __typename?: string; // Type indicator (Video, Photo, etc.)
}

interface ApifyMedia {
  image?: string; // Single image URL
  video?: string; // Video URL
  video_thumbnail?: string; // Video thumbnail
  album_preview?: any[]; // Preview images for albums
  external_url?: string; // External link
}

interface ApifyPost {
  postUrl: string;
  text?: string;
  images?: ApifyImage[]; // Array of all images in carousel posts (older format)
  media?: ApifyMedia; // Media object (newer format)
  likes?: number;
  shares?: number;
  comments?: number;
  time?: string;
  topLevelUrl?: string;
}

interface ApifyDatasetItem {
  postUrl?: string;
  url?: string; // Fallback URL field
  text?: string;
  images?: ApifyImage[]; // Older format
  media?: ApifyMediaItem[] | ApifyMedia; // Can be array of media items or single object
  likes?: number;
  shares?: number;
  comments?: number;
  time?: string;
  topLevelUrl?: string;
}

export class ApifyScraperService {
  private apiKey = process.env.APIFY_API_KEY;
  private actorId = 'apify/facebook-posts-scraper';
  // Facebook cookies for authenticated scraping (JSON string of cookies array)
  // Can be exported from browser using Cookie-Editor extension
  private facebookCookies = process.env.FACEBOOK_COOKIES;

  // Convert actor ID to URL-safe format (replace / with ~)
  private getUrlSafeActorId(): string {
    return this.actorId.replace('/', '~');
  }

  // Check if authenticated scraping is available
  public hasAuthenticatedSession(): boolean {
    return !!(this.apiKey && this.facebookCookies);
  }

  // Normalize Facebook post URL to handle different formats
  private normalizeFacebookUrl(url: string): string {
    try {
      // Extract the post ID from various Facebook URL formats
      // Format 1: /posts/pfbid... -> extract pfbid
      // Format 2: /posts/12345... -> extract numeric ID

      const postIdMatch = url.match(/\/posts\/([^/?]+)/);
      if (postIdMatch) {
        const postId = postIdMatch[1];
        // Return a normalized format using just the post ID
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
        throw new Error("APIFY_API_KEY is not configured");
      }

      console.log(`[APIFY] Scraping Facebook page: ${pageUrl}`);

      // Start the Apify actor
      const urlSafeActorId = this.getUrlSafeActorId();
      const runResponse = await fetch(
        `https://api.apify.com/v2/acts/${urlSafeActorId}/runs?token=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startUrls: [{ url: pageUrl }],
            maxPosts: 50, // Limit posts to control costs
            scrapePosts: true, // Explicitly enable post scraping
            scrapeAbout: false, // Don't scrape about section
            scrapeReviews: false, // Don't scrape reviews
            maxPostDate: "7 days", // Only get posts from last 7 days
            proxyConfiguration: {
              useApifyProxy: true,
            },
          }),
        }
      );

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        console.error(`[APIFY] API error (${runResponse.status}):`, errorText);
        throw new Error(`HTTP error! status: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.data.id;
      const defaultDatasetId = runData.data.defaultDatasetId;

      console.log(`[APIFY] Run started: ${runId}`);
      console.log(`[APIFY] Waiting for completion...`);

      // Poll for completion (timeout after 5 minutes)
      const maxAttempts = 60; // 60 attempts * 5 seconds = 5 minutes
      let attempts = 0;
      let runStatus = 'RUNNING';

      while (runStatus === 'RUNNING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(
          `https://api.apify.com/v2/acts/${urlSafeActorId}/runs/${runId}?token=${this.apiKey}`
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          runStatus = statusData.data.status;
          console.log(`[APIFY] Status: ${runStatus} (${attempts + 1}/${maxAttempts})`);
        }

        attempts++;
      }

      if (runStatus !== 'SUCCEEDED') {
        throw new Error(`Apify run did not complete successfully. Status: ${runStatus}`);
      }

      console.log(`[APIFY] Run completed successfully!`);

      // Fetch results from dataset
      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${this.apiKey}`
      );

      if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
      }

      const posts: ApifyDatasetItem[] = await datasetResponse.json();
      console.log(`[APIFY] Retrieved ${posts.length} posts from dataset`);

      // Log first 3 post structures for debugging
      if (posts.length > 0) {
        console.log("\n📋 APIFY RESPONSE - FIRST 3 POSTS:");
        posts.slice(0, 3).forEach((post, idx) => {
          console.log(`\n--- POST ${idx + 1} ---`);
          console.log("Text preview:", post.text?.substring(0, 100));
          console.log("Images field:", post.images);
          console.log("Media field:", JSON.stringify(post.media, null, 2));
          console.log("postUrl:", post.postUrl);
          console.log("url:", post.url);
          console.log("topLevelUrl:", post.topLevelUrl);
          console.log("All keys:", Object.keys(post));
        });
        console.log("\n");
      }

      const scrapedPosts = this.parseApifyResponse(posts);
      console.log(`[APIFY] Successfully parsed ${scrapedPosts.length} posts`);

      return scrapedPosts;
    } catch (error) {
      console.error("[APIFY] Error scraping Facebook page:", error);
      throw new Error("Failed to scrape Facebook page with Apify");
    }
  }

  /**
   * Scrape a single Facebook post using authenticated session (with cookies)
   * This can access login-protected posts that the regular scraper cannot reach.
   * 
   * @param postUrl - The Facebook post URL to scrape
   * @returns The scraped post or null if not found
   */
  async scrapeSinglePostAuthenticated(postUrl: string): Promise<ScrapedPost | null> {
    try {
      if (!this.apiKey) {
        throw new Error("APIFY_API_KEY is not configured");
      }

      if (!this.facebookCookies) {
        console.log(`[APIFY-AUTH] ⚠️ No Facebook cookies configured - cannot use authenticated scraping`);
        return null;
      }

      console.log(`\n🔐 [APIFY-AUTH] Scraping with AUTHENTICATED session: ${postUrl}`);

      // Parse cookies - can be JSON array or base64 encoded
      let cookies: any[];
      try {
        cookies = JSON.parse(this.facebookCookies);
        console.log(`   ✅ Cookies parsed: ${cookies.length} cookies available`);
      } catch (e) {
        console.error(`   ❌ Failed to parse FACEBOOK_COOKIES - must be valid JSON array`);
        console.error(`   💡 Export cookies using Cookie-Editor browser extension`);
        return null;
      }

      // Convert Cookie-Editor format to Apify expected format
      // Apify expects: [{ name: "...", value: "...", domain: "...", ... }]
      const formattedCookies = cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || "/",
        httpOnly: c.httpOnly || false,
        secure: c.secure || true,
      }));

      console.log(`   📋 Formatted ${formattedCookies.length} cookies for Apify`);

      // NOTE: The apify/facebook-posts-scraper doesn't properly support cookie authentication
      // For proper authenticated scraping, you would need to rent a paid actor like:
      // - curious_coder/facebook-profile-scraper (paid)
      // - apify/facebook-page-scraper (paid)
      // For now, we try with the free actor + cookies (may not work for private posts)
      const authActorId = 'apify~facebook-posts-scraper';

      console.log(`   ⚠️ Note: Free actor may not support authenticated access`);
      console.log(`   💡 For private posts, consider renting: curious_coder/facebook-profile-scraper`);

      // This actor has a different input schema:
      // - urls: array of URLs to scrape
      // - cookies: array of cookie objects
      // - maxPosts: number of posts to retrieve
      const runResponse = await fetch(
        `https://api.apify.com/v2/acts/${authActorId}/runs?token=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // apify/facebook-posts-scraper expects startUrls
            startUrls: [{ url: postUrl }],
            // Try passing cookies (may not work with this actor)
            cookies: formattedCookies,
            // Maximum number of posts to scrape
            maxPosts: 10,
            scrapePosts: true,
            scrapeAbout: false,
            scrapeReviews: false,
            maxPostDate: "30 days",
            // Proxy configuration
            proxyConfiguration: {
              useApifyProxy: true,
            },
          }),
        }
      );

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        console.error(`[APIFY-AUTH] API error (${runResponse.status}):`, errorText);
        throw new Error(`HTTP error! status: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.data.id;
      const defaultDatasetId = runData.data.defaultDatasetId;

      console.log(`   🚀 Run started: ${runId}`);
      console.log(`   ⏳ Waiting for completion...`);

      // Poll for completion (timeout after 3 minutes for single post)
      const maxAttempts = 36; // 36 * 5 seconds = 3 minutes
      let attempts = 0;
      let runStatus = 'RUNNING';

      while (runStatus === 'RUNNING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const statusResponse = await fetch(
          `https://api.apify.com/v2/acts/${authActorId}/runs/${runId}?token=${this.apiKey}`
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          runStatus = statusData.data.status;
          if (attempts % 6 === 0) { // Log every 30 seconds
            console.log(`   ⏳ Status: ${runStatus} (${attempts * 5}s elapsed)`);
          }
        }

        attempts++;
      }

      if (runStatus !== 'SUCCEEDED') {
        console.error(`   ❌ Run did not complete. Status: ${runStatus}`);
        return null;
      }

      console.log(`   ✅ Run completed successfully!`);

      // Fetch results
      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${this.apiKey}`
      );

      if (!datasetResponse.ok) {
        console.error(`   ❌ Failed to fetch dataset: ${datasetResponse.status}`);
        return null;
      }

      const posts: ApifyDatasetItem[] = await datasetResponse.json();
      console.log(`   📋 Retrieved ${posts.length} posts from authenticated scrape`);

      if (posts.length === 0) {
        console.log(`   ⚠️ No posts found - the post may be deleted or still not accessible`);
        return null;
      }

      // Log the response for debugging
      console.log(`   📋 First post structure:`, JSON.stringify(posts[0], null, 2).substring(0, 500) + '...');

      // Parse and return the first matching post
      const scrapedPosts = this.parseApifyResponse(posts);

      if (scrapedPosts.length > 0) {
        console.log(`   ✅ Successfully scraped authenticated post: ${scrapedPosts[0].title.substring(0, 60)}...`);
        return scrapedPosts[0];
      }

      console.log(`   ⚠️ Post parsed but no valid content found`);
      return null;

    } catch (error) {
      console.error(`[APIFY-AUTH] Error in authenticated scrape:`, error);
      return null;
    }
  }

  async scrapeSingleFacebookPost(postUrl: string): Promise<ScrapedPost | null> {
    try {
      console.log(`[APIFY] Scraping single post: ${postUrl}`);
      const posts = await this.scrapeFacebookPage(postUrl);

      if (posts.length > 0) {
        return posts[0];
      }

      // Regular scraping returned no results - try authenticated fallback
      console.log(`[APIFY] Regular scrape returned no results, trying authenticated fallback...`);

      if (this.hasAuthenticatedSession()) {
        const authenticatedPost = await this.scrapeSinglePostAuthenticated(postUrl);
        if (authenticatedPost) {
          console.log(`[APIFY] ✅ Authenticated fallback successful!`);
          return authenticatedPost;
        }
      } else {
        console.log(`[APIFY] ⚠️ No authenticated session configured (set FACEBOOK_COOKIES)`);
      }

      return null;
    } catch (error) {
      console.error(`[APIFY] Error scraping single post:`, error);

      // Even on error, try authenticated fallback as last resort
      if (this.hasAuthenticatedSession()) {
        console.log(`[APIFY] Trying authenticated fallback after error...`);
        try {
          const authenticatedPost = await this.scrapeSinglePostAuthenticated(postUrl);
          if (authenticatedPost) {
            console.log(`[APIFY] ✅ Authenticated fallback successful after error!`);
            return authenticatedPost;
          }
        } catch (authError) {
          console.error(`[APIFY] Authenticated fallback also failed:`, authError);
        }
      }

      return null;
    }
  }

  private parseApifyResponse(posts: ApifyDatasetItem[]): ScrapedPost[] {
    const scrapedPosts: ScrapedPost[] = [];
    const seenUrls = new Set<string>();

    for (const post of posts) {
      try {
        // CRITICAL: Check if API returned an error object instead of post data
        // Error objects have structure: { url, error, errorDescription }
        const postAsAny = post as any;
        if (postAsAny.error || postAsAny.errorDescription) {
          console.log(`\n❌ [APIFY] API RETURNED ERROR FOR POST:`);
          console.log(`   URL: ${postAsAny.url || 'unknown'}`);
          console.log(`   Error: ${postAsAny.error || 'no error field'}`);
          console.log(`   Error Description: ${postAsAny.errorDescription || 'no description'}`);
          console.log(`   All keys: ${Object.keys(post).join(', ')}`);
          continue;
        }

        // Skip posts without ANY text content (allow short captions for breaking news)
        if (!post.text || post.text.trim().length === 0) {
          console.log(`[APIFY] Skipping post - no text content`);
          console.log(`   URL: ${post.postUrl || post.url || 'unknown'}`);
          console.log(`   Keys present: ${Object.keys(post).join(', ')}`);
          continue;
        }

        // Get source URL with fallback chain: postUrl -> url -> topLevelUrl
        const rawSourceUrl = post.postUrl || post.url || post.topLevelUrl;

        if (!rawSourceUrl) {
          console.log(`[APIFY] ⚠️ Skipping post - no URL found in postUrl, url, or topLevelUrl fields`);
          console.log(`[APIFY] Post data keys:`, Object.keys(post));
          continue;
        }

        const normalizedSourceUrl = this.normalizeFacebookUrl(rawSourceUrl);

        // Skip if we've already seen this URL in this batch
        if (seenUrls.has(normalizedSourceUrl)) {
          console.log(`[APIFY] ⏭️  Skipping duplicate URL in batch: ${normalizedSourceUrl}`);
          continue;
        }
        seenUrls.add(normalizedSourceUrl);

        // Extract title from first line
        const lines = post.text.split('\n').filter(line => line.trim());
        const title = lines[0]?.substring(0, 200) || post.text.substring(0, 100);
        const content = post.text;

        // Extract ALL image URLs from the post
        const imageUrls: string[] = [];

        // Try older format: images array
        if (post.images && post.images.length > 0) {
          for (const img of post.images) {
            if (img.link && !imageUrls.includes(img.link)) {
              imageUrls.push(img.link);
            }
          }
        }

        // Try newer format: media field (can be array or object)
        if (post.media) {
          if (Array.isArray(post.media)) {
            // Media is an array of media items
            for (const mediaItem of post.media) {
              // Prioritize image.uri over thumbnail (they're often the same photo with different URLs)
              // Only use thumbnail as fallback if image doesn't exist
              let imgUrl: string | undefined;

              if (mediaItem.image) {
                imgUrl = typeof mediaItem.image === 'string'
                  ? mediaItem.image
                  : mediaItem.image.uri;
              } else if (mediaItem.thumbnail) {
                imgUrl = mediaItem.thumbnail;
              }

              if (imgUrl && !imageUrls.includes(imgUrl)) {
                imageUrls.push(imgUrl);
              }
            }
          } else {
            // Media is an object (older format)
            if (post.media.image && !imageUrls.includes(post.media.image)) {
              imageUrls.push(post.media.image);
            }
            if (post.media.album_preview && Array.isArray(post.media.album_preview)) {
              for (const albumImg of post.media.album_preview) {
                const imgUrl = typeof albumImg === 'string' ? albumImg : albumImg?.url || albumImg?.link;
                if (imgUrl && !imageUrls.includes(imgUrl)) {
                  imageUrls.push(imgUrl);
                }
              }
            }
          }
        }

        // Skip video-only posts (posts without images)
        // But keep posts with video thumbnails as they may have useful imagery
        if (imageUrls.length === 0) {
          console.log(`[APIFY] 🎥 Skipping video-only post (no images)`);
          console.log(`[APIFY]    Title: ${title.substring(0, 80)}...`);
          const mediaObj = !Array.isArray(post.media) ? post.media : undefined;
          console.log(`[APIFY]    Has video: ${!!mediaObj?.video}`);
          console.log(`[APIFY]    Has video thumbnail: ${!!mediaObj?.video_thumbnail}`);
          continue;
        }

        // Set the first image as primary imageUrl for backward compatibility
        const imageUrl = imageUrls[0];

        // Log multi-image posts
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

        // Parse timestamp
        const publishedAt = post.time ? new Date(post.time) : new Date();

        scrapedPosts.push({
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          sourceUrl: normalizedSourceUrl,
          publishedAt,
        });
      } catch (error) {
        console.error(`[APIFY] Error parsing post:`, error);
        // Continue with next post
      }
    }

    return scrapedPosts;
  }

  async scrapeFacebookPageWithPagination(
    pageUrl: string,
    maxPages: number = 1,
    checkForDuplicate?: (sourceUrl: string) => Promise<boolean>
  ): Promise<ScrapedPost[]> {
    // Apify handles pagination internally, so we just scrape once
    // The maxPosts parameter in the API call controls how many posts to fetch
    const posts = await this.scrapeFacebookPage(pageUrl);

    // If duplicate checker is provided, filter out duplicates
    if (checkForDuplicate) {
      const filteredPosts: ScrapedPost[] = [];

      for (const post of posts) {
        const isDuplicate = await checkForDuplicate(post.sourceUrl);
        if (!isDuplicate) {
          filteredPosts.push(post);
        } else {
          console.log(`[APIFY] 🔗 Skipping known post: ${post.sourceUrl}`);
        }
      }

      return filteredPosts;
    }

    return posts;
  }
}

export const apifyScraperService = new ApifyScraperService();
