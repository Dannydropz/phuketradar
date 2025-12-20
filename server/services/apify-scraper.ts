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

  // Convert actor ID to URL-safe format (replace / with ~)
  private getUrlSafeActorId(): string {
    return this.actorId.replace('/', '~');
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

  async scrapeSingleFacebookPost(postUrl: string): Promise<ScrapedPost | null> {
    try {
      console.log(`[APIFY] Scraping single post: ${postUrl}`);
      const posts = await this.scrapeFacebookPage(postUrl);
      return posts.length > 0 ? posts[0] : null;
    } catch (error) {
      console.error(`[APIFY] Error scraping single post:`, error);
      return null;
    }
  }

  private parseApifyResponse(posts: ApifyDatasetItem[]): ScrapedPost[] {
    const scrapedPosts: ScrapedPost[] = [];
    const seenUrls = new Set<string>();

    for (const post of posts) {
      try {
        // Skip posts without ANY text content (allow short captions for breaking news)
        if (!post.text || post.text.trim().length === 0) {
          console.log(`[APIFY] Skipping post - no text content`);
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
