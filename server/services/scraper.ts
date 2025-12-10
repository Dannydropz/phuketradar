
export interface ScrapedPost {
  title: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  sourceUrl: string;
  facebookPostId?: string; // Canonical Facebook post ID for deduplication
  publishedAt: Date;
  textFormatPresetId?: string; // Facebook's colored background text post indicator
  isVideo?: boolean; // Video posts with screen grabs should be rejected
  videoUrl?: string;
  videoThumbnail?: string;
  location?: string; // Check-in location name (e.g., "Hat Yai", "Phuket")
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
  place?: {
    name: string;
    id: string;
  };
  created_time?: string;
  image?: string; // Direct image URL field (single image)
  images?: string[]; // NEW: Array of all images for multi-image carousel posts
  text_format_preset_id?: string; // Facebook's colored background text post indicator
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
  private scrapeCreatorsSinglePostUrl = "https://api.scrapecreators.com/v1/facebook/post";
  private apiKey = process.env.SCRAPECREATORS_API_KEY;

  // Extract canonical Facebook post ID - ALWAYS returns numeric ID when available
  // This is critical for deduplication: Facebook has multiple URL/ID formats for the same post,
  // and we must normalize to a SINGLE canonical ID (numeric preferred) to prevent duplicates
  // 
  // Examples of the SAME post with different IDs:
  //   - URL: /posts/1146339707616870  → Returns: "1146339707616870"
  //   - URL: /posts/pfbid0wGs...      → Returns: "1146339707616870" (if apiId is numeric)
  //   - URL: /posts/pfbid0wGs...      → Returns: "pfbid0wGs..." (if no numeric ID available)
  private extractFacebookPostId(url: string, apiId?: string): string | null {
    try {
      // Step 1: Look for numeric ID in API's id field (most reliable source)
      if (apiId && /^\d+$/.test(apiId)) {
        return apiId;
      }

      // Step 2: Look for numeric ID in URL
      const numericMatch = url.match(/\/posts\/(\d+)/);
      if (numericMatch) {
        return numericMatch[1];
      }

      // Step 3: If API id is pfbid, use it (we couldn't find numeric)
      if (apiId && apiId.startsWith('pfbid')) {
        return apiId;
      }

      // Step 4: Extract pfbid from URL as last resort
      const pfbidMatch = url.match(/\/posts\/(pfbid[\w]+)/);
      if (pfbidMatch) {
        return pfbidMatch[1];
      }

      // Step 5: Use any apiId we have
      if (apiId) {
        return apiId;
      }

      // No ID found
      return null;
    } catch (error) {
      console.error("Error extracting Facebook post ID:", error);
      return null;
    }
  }

  // Normalize Facebook post URL using the API's post ID
  // This handles the case where Facebook has multiple URL formats for the same post:
  // - pfbid format: /posts/pfbid028JJH...
  // - numeric format: /posts/896507726043641
  // Both are valid URLs for the SAME post, so we use the API's id field as canonical
  private normalizeFacebookUrl(postId: string, fallbackUrl: string): string {
    try {
      // Use the post ID from the API as the canonical identifier
      // This ensures both pfbid and numeric URL formats map to the same sourceUrl
      if (postId) {
        return `https://www.facebook.com/posts/${postId}`;
      }

      // Fallback: try to extract from URL if no ID provided
      const postIdMatch = fallbackUrl.match(/\/posts\/([^/?]+)/);
      if (postIdMatch) {
        return `https://www.facebook.com/posts/${postIdMatch[1]}`;
      }

      // Last resort: return original URL
      return fallbackUrl;
    } catch (error) {
      console.error("Error normalizing Facebook URL:", error);
      return fallbackUrl;
    }
  }

  // Follow Facebook share URL redirects to get the canonical post URL
  // Share URLs like /share/p/xxx redirect to the actual post with page name
  private async resolveShareUrl(url: string): Promise<string[]> {
    const urls: string[] = [];

    // Check if this is a share URL
    const shareMatch = url.match(/\/share\/(?:p\/)?([A-Za-z0-9]+)/);
    if (!shareMatch) {
      // Not a share URL, just use as-is
      urls.push(url);
      return urls;
    }

    const shareId = shareMatch[1];
    console.log(`📝 Detected share URL with ID: ${shareId}`);
    console.log(`🔗 Following redirect to find canonical URL...`);

    try {
      // Follow the redirect to get the canonical URL
      const response = await fetch(url, {
        redirect: 'manual', // Don't auto-follow, we want to see the redirect
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Get the redirect location
      const location = response.headers.get('location');

      if (location) {
        console.log(`✅ Found redirect to: ${location}`);

        // Extract page name from the canonical URL
        // Format: https://www.facebook.com/PhuketTimeNews/posts/pfbid...
        // Or: https://www.facebook.com/PhuketTimeNews/posts/1187471150170392
        const pageMatch = location.match(/facebook\.com\/([^\/]+)\//);

        if (pageMatch) {
          const pageName = pageMatch[1];
          console.log(`✅ Extracted page name: ${pageName}`);

          // Try the page URL (this will scrape recent posts from the page)
          urls.push(`https://www.facebook.com/${pageName}`);

          // Also try the full canonical URL as fallback
          urls.push(location);
        } else {
          // Couldn't extract page, just use the redirect URL
          urls.push(location);
        }
      } else {
        console.log(`⚠️  No redirect found, trying alternative formats...`);

        // Fallback: try different URL formats
        urls.push(`https://www.facebook.com/${shareId}`);
        urls.push(`https://www.facebook.com/permalink.php?story_fbid=${shareId}`);
      }

    } catch (error) {
      console.error(`Error following redirect:`, error);
      // Fallback to trying different formats
      urls.push(`https://www.facebook.com/${shareId}`);
      urls.push(`https://www.facebook.com/permalink.php?story_fbid=${shareId}`);
    }

    // Always add original URL as last resort
    urls.push(url);

    return urls;
  }

  async scrapeFacebookPage(pageUrl: string): Promise<ScrapedPost[]> {
    try {
      if (!this.apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured");
      }

      console.log(`Scraping Facebook page: ${pageUrl}`);

      // Resolve share URLs by following redirects to get the canonical URL
      const normalizedUrls = await this.resolveShareUrl(pageUrl);

      // Try each URL format until we get results
      for (const url of normalizedUrls) {
        console.log(`Attempting to scrape: ${url}`);

        try {
          // Fetch posts from scrapecreators API
          const response = await fetch(`${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(url)}`, {
            headers: {
              'x-api-key': this.apiKey
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`ScrapeCreators API error (${response.status}) for ${url}:`, errorText);
            continue; // Try next URL format
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
            console.log(`No posts found for URL format: ${url}`);
            continue; // Try next URL format
          }

          // Success! Parse and return the posts
          const scrapedPosts = this.parseScrapeCreatorsResponse(data.posts, pageUrl);
          console.log(`✅ Successfully parsed ${scrapedPosts.length} posts from ${url}`);
          return scrapedPosts;

        } catch (urlError) {
          console.error(`Error with URL ${url}:`, urlError);
          continue; // Try next URL format
        }
      }

      // If we tried all URL formats and got nothing
      console.log("❌ No posts found with any URL format");
      return [];

    } catch (error) {
      console.error("Error scraping Facebook page:", error);
      throw new Error("Failed to scrape Facebook page");
    }
  }

  /**
   * Scrape a SINGLE Facebook post by its URL
   * This uses the /v1/facebook/post endpoint which is designed for individual posts
   * Supports: share URLs, post permalinks, pfbid URLs, etc.
   */
  async scrapeSingleFacebookPost(postUrl: string): Promise<ScrapedPost | null> {
    try {
      if (!this.apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured");
      }

      console.log(`🎯 Scraping SINGLE Facebook post: ${postUrl}`);

      // Call the single post endpoint
      const response = await fetch(`${this.scrapeCreatorsSinglePostUrl}?url=${encodeURIComponent(postUrl)}`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ScrapeCreators single post API error (${response.status}):`, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("📋 SINGLE POST API RESPONSE:");
      console.log(JSON.stringify(data, null, 2));

      // The single post endpoint returns the post directly (not in a posts array)
      // Note: API returns 'description' not 'text' for the post content
      if (!data || (!data.text && !data.description)) {
        console.log("❌ No post data returned from single post endpoint");
        return null;
      }

      // Convert to our ScrapedPost format
      const post = data;

      // Extract text content
      const text = post.text || post.description || '';
      if (!text.trim()) {
        console.log("❌ Post has no text content");
        return null;
      }

      // Extract the first line as title
      const lines = text.split('\n').filter((line: string) => line.trim());
      const title = lines[0]?.substring(0, 200) || text.substring(0, 100);
      const content = text;

      // Extract images from various possible fields
      let imageUrl: string | undefined;
      let imageUrls: string[] | undefined;

      // Try different image fields the API might return
      if (post.image) {
        imageUrl = post.image;
      } else if (post.full_picture) {
        imageUrl = post.full_picture;
      } else if (post.images && Array.isArray(post.images)) {
        imageUrls = post.images;
        imageUrl = post.images[0];
      }

      // Also check for media/attachments array (common in Facebook API responses)
      if (!imageUrl && post.attachments?.data) {
        for (const attachment of post.attachments.data) {
          if (attachment.media?.image?.src) {
            imageUrl = attachment.media.image.src;
            break;
          }
          // Check subattachments for multi-image posts
          if (attachment.subattachments?.data) {
            const subImages = attachment.subattachments.data
              .map((sub: any) => sub.media?.image?.src)
              .filter(Boolean);
            if (subImages.length > 0) {
              imageUrls = subImages;
              imageUrl = subImages[0];
              break;
            }
          }
        }
      }

      // Check for media array (another possible format)
      if (!imageUrl && post.media && Array.isArray(post.media)) {
        const mediaImages = post.media
          .filter((m: any) => m.type === 'photo' || m.image)
          .map((m: any) => m.image || m.src || m.url)
          .filter(Boolean);
        if (mediaImages.length > 0) {
          imageUrls = mediaImages;
          imageUrl = mediaImages[0];
        }
      }

      // Check for video
      const isVideo = !!(post.video_url || post.videoDetails?.sdUrl || post.videoDetails?.hdUrl);

      // Extract Facebook post ID
      const facebookPostId = this.extractFacebookPostId(postUrl, post.id || post.post_id);

      // Parse timestamp if available (API uses creation_time, not created_time)
      const publishedAt = post.creation_time
        ? new Date(post.creation_time)
        : (post.created_time ? new Date(post.created_time) : new Date());

      // Extract location if available
      const location = post.place?.name;

      const scrapedPost: ScrapedPost = {
        title: title.trim(),
        content: content.trim(),
        imageUrl,
        imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
        sourceUrl: postUrl,
        facebookPostId: facebookPostId || undefined,
        publishedAt,
        isVideo,
        location,
      };

      console.log(`✅ Successfully scraped single post`);
      console.log(`   Title: ${scrapedPost.title.substring(0, 60)}...`);
      console.log(`   Images: ${scrapedPost.imageUrls?.length || (scrapedPost.imageUrl ? 1 : 0)}`);
      console.log(`   Is Video: ${scrapedPost.isVideo}`);

      return scrapedPost;

    } catch (error) {
      console.error("Error scraping single Facebook post:", error);
      throw error;
    }
  }

  private parseScrapeCreatorsResponse(posts: ScrapeCreatorsPost[], sourceUrl: string): ScrapedPost[] {
    const scrapedPosts: ScrapedPost[] = [];
    const seenUrls = new Set<string>(); // Track URLs within this batch to prevent duplicates

    for (const post of posts) {
      try {
        // Skip posts without ANY text content (allow short captions for breaking news)
        if (!post.text || post.text.trim().length === 0) {
          console.log(`Skipping post ${post.id} - no text content`);
          continue;
        }

        // Extract canonical Facebook post ID for deduplication
        const rawSourceUrl = post.permalink || post.url || sourceUrl;
        const facebookPostId = this.extractFacebookPostId(rawSourceUrl, post.id);

        // Skip if we've already seen this post ID in this batch
        if (facebookPostId && seenUrls.has(facebookPostId)) {
          console.log(`⏭️  Skipping duplicate post ID in batch: ${facebookPostId}`);
          continue;
        }
        if (facebookPostId) {
          seenUrls.add(facebookPostId);
        }

        // Use the EXACT permalink as source URL - do NOT normalize
        // Normalization was causing false duplicate rejections because different posts
        // were being collapsed to the same canonical URL, triggering unique constraint violations
        const actualSourceUrl = rawSourceUrl;

        // Extract the first line as title (or use first 100 chars)
        const lines = post.text.split('\n').filter(line => line.trim());
        const title = lines[0]?.substring(0, 200) || post.text.substring(0, 100);
        const content = post.text;

        // Extract ALL image URLs from the post
        const imageUrls: string[] = [];
        let imageUrl: string | undefined;

        // PRIORITY 1: Use the new 'images' array field (multi-image carousel support)
        if (post.images && Array.isArray(post.images) && post.images.length > 0) {
          // ScrapeCreators now provides ALL images in the 'images' array
          imageUrls.push(...post.images);
        }
        // FALLBACK: Use old methods if 'images' array not available
        else {
          // Try direct image field first (single image)
          if (post.image) {
            imageUrls.push(post.image);
          }

          // Try full_picture (alternative field)
          if (post.full_picture && post.full_picture !== post.image) {
            imageUrls.push(post.full_picture);
          }

          // Try attachments for additional images (old method)
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

        // Detect if this is a video post (video screen grabs have poor quality)
        const isVideo = !!(post.videoDetails?.sdUrl || post.videoDetails?.hdUrl);
        const videoUrl = post.videoDetails?.hdUrl || post.videoDetails?.sdUrl;
        const videoThumbnail = post.videoDetails?.thumbnail;

        // Extract check-in location if available
        const location = post.place?.name;

        scrapedPosts.push({
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          sourceUrl: actualSourceUrl,
          facebookPostId: facebookPostId || undefined,
          publishedAt,
          textFormatPresetId: post.text_format_preset_id,
          isVideo,
          videoUrl,
          videoThumbnail,
          location,
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
      let consecutiveDuplicates = 0;
      let shouldStop = false; // Flag to stop pagination early
      const REQUIRED_CONSECUTIVE_DUPLICATES = 5; // Need 5+ consecutive duplicates to early-stop

      while (pageCount < maxPages && !shouldStop) {
        const url = cursor
          ? `${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}&cursor=${cursor}`
          : `${this.scrapeCreatorsApiUrl}?url=${encodeURIComponent(pageUrl)}`;

        console.log(`\n📄 Fetching page ${pageCount + 1}/${maxPages}...`);

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

          // Log timestamps to debug recent post capture
          console.log("\n⏰ POST TIMESTAMPS ON PAGE 1:");
          const now = new Date();
          data.posts.slice(0, 5).forEach((post, idx) => {
            if (post.created_time) {
              const postTime = new Date(post.created_time);
              const ageMinutes = Math.floor((now.getTime() - postTime.getTime()) / 1000 / 60);
              const ageHours = (ageMinutes / 60).toFixed(1);
              console.log(`   Post ${idx + 1}: ${ageHours}h ago (${post.created_time}) - "${post.text?.substring(0, 60)}..."`);
            } else {
              console.log(`   Post ${idx + 1}: No timestamp - "${post.text?.substring(0, 60)}..."`);
            }
          });
          console.log("\n");
        }

        if (!data.success || !data.posts || data.posts.length === 0) {
          console.log(`No more posts available at page ${pageCount + 1}`);
          break;
        }

        const parsed = this.parseScrapeCreatorsResponse(data.posts, pageUrl);
        let newPostsOnThisPage = 0;
        let duplicatesOnThisPage = 0;

        // If duplicate checker is provided, track consecutive duplicates
        if (checkForDuplicate) {
          for (const post of parsed) {
            const isDuplicate = await checkForDuplicate(post.sourceUrl);
            if (isDuplicate) {
              consecutiveDuplicates++;
              duplicatesOnThisPage++;

              // CRITICAL: Never early-stop on page 1 (ensures we always get latest posts)
              // On later pages, require 5+ consecutive duplicates before stopping
              if (pageCount > 0 && consecutiveDuplicates >= REQUIRED_CONSECUTIVE_DUPLICATES) {
                console.log(`\n✋ EARLY STOP TRIGGERED`);
                console.log(`   Page: ${pageCount + 1}`);
                console.log(`   Consecutive duplicates: ${consecutiveDuplicates}`);
                console.log(`   Last duplicate: "${post.title.substring(0, 50)}..."`);
                console.log(`   Stopping pagination to save API credits\n`);

                // Set flag to stop pagination after this page
                shouldStop = true;
                break;
              }
            } else {
              // New post found - reset consecutive counter
              consecutiveDuplicates = 0;
              newPostsOnThisPage++;
              allPosts.push(post);
            }
          }
        } else {
          // No duplicate checking, add all posts
          allPosts = [...allPosts, ...parsed];
          newPostsOnThisPage = parsed.length;
        }

        console.log(`   Posts on page ${pageCount + 1}: ${parsed.length} total, ${newPostsOnThisPage} new, ${duplicatesOnThisPage} duplicates`);
        if (pageCount === 0) {
          console.log(`   ℹ️  Page 1 always fetched completely (ensures latest posts captured)`);
        }

        pageCount++;

        // Break immediately if early-stop was triggered
        if (shouldStop) {
          console.log("\n✋ Stopping pagination (early-stop threshold reached)");
          break;
        }

        // Update cursor for next page
        cursor = data.cursor;

        // Break if no cursor for next page
        if (!cursor) {
          console.log("\nNo more pages available (no cursor)");
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

// Interface for Facebook comment data
export interface FacebookComment {
  id: string;
  text: string;
  reactionCount: number;
  replyCount: number;
  createdAt: string;
}

/**
 * Scrape top comments from a Facebook post for story enrichment
 * Used to add context and public sentiment to high-interest articles
 * 
 * @param postUrl - The Facebook post URL to scrape comments from
 * @param limit - Maximum number of comments to fetch (default 15)
 * @returns Array of comments sorted by engagement (reaction_count)
 */
export async function scrapePostComments(postUrl: string, limit: number = 15): Promise<FacebookComment[]> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;

  if (!apiKey) {
    console.log("   ⚠️ SCRAPECREATORS_API_KEY not set - skipping comment scraping");
    return [];
  }

  try {
    console.log(`   💬 Fetching top ${limit} comments for story enrichment...`);

    const response = await fetch(
      `https://api.scrapecreators.com/v1/facebook/post/comments?url=${encodeURIComponent(postUrl)}`,
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`   ⚠️ Comments API returned ${response.status} - continuing without comments`);
      return [];
    }

    const data = await response.json();

    if (!data.success || !data.comments || data.comments.length === 0) {
      console.log(`   ⚠️ No comments found for this post`);
      return [];
    }

    // Map and sort comments by engagement (reaction_count)
    const comments: FacebookComment[] = data.comments
      .filter((c: any) => c.text && c.text.trim().length > 0) // Only comments with actual text
      .map((c: any) => ({
        id: c.id,
        text: c.text,
        reactionCount: c.reaction_count || 0,
        replyCount: c.reply_count || 0,
        createdAt: c.created_at || ''
      }))
      .sort((a: FacebookComment, b: FacebookComment) => b.reactionCount - a.reactionCount) // Sort by most engaged
      .slice(0, limit);

    console.log(`   ✅ Fetched ${comments.length} comments (top by engagement)`);

    // Log a preview of top comments
    if (comments.length > 0) {
      console.log(`   📝 Top comment preview: "${comments[0].text.substring(0, 50)}..." (${comments[0].reactionCount} reactions)`);
    }

    return comments;

  } catch (error) {
    console.error(`   ⚠️ Error fetching comments:`, error);
    return []; // Fail gracefully - story can still be processed without comments
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
  const provider = process.env.SCRAPER_PROVIDER ||
    (process.env.SCRAPECREATORS_API_KEY ? 'scrapecreators' :
      (process.env.APIFY_API_KEY ? 'apify' : 'scrapecreators'));

  if (provider === 'apify' && process.env.APIFY_API_KEY) {
    console.log('🔄 Using Apify scraper (multi-image support enabled)');
    const { apifyScraperService } = await import('./apify-scraper');
    return apifyScraperService;
  }

  console.log('🔄 Using ScrapeCreators scraper (single image only)');
  return scraperService;
}

export const scraperService = new ScraperService();

