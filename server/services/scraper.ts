
export interface ScrapedPost {
  title: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  sourceUrl: string;
  facebookPostId?: string; // Canonical Facebook post ID for deduplication
  publishedAt: Date;
  textFormatPresetId?: string; // Facebook's colored background text post indicator
  isVideo?: boolean; // If true, triggers Facebook embed fallback on frontend
  videoUrl?: string; // Direct video URL if available (SD/HD)
  videoThumbnail?: string; // Video preview image
  location?: string; // Check-in location name (e.g., "Hat Yai", "Phuket")
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  viewCount?: number;
  sourceName?: string;
  isResharedPost?: boolean; // True when this post was a reshare and we fetched original content
  originalSourceName?: string; // Name of the original page the content was reshared from
}

interface ScrapeCreatorsPost {
  id: string;
  text: string;
  url: string;
  permalink: string;
  author?: {
    name: string;
    id: string;
    __typename?: string;
    short_name?: string;
    url?: string;
  };
  place?: {
    name: string;
    id: string;
  };
  created_time?: string;
  publishTime?: number; // Unix timestamp (alternative field name in some responses)
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
    thumbnailUrl?: string; // Alternative field name in some responses
  };
  video?: {
    thumbnail?: string;
    sd_url?: string;
    hd_url?: string;
  };
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
  reactionCount?: number; // Alternative field name in some responses
  commentCount?: number;  // Alternative field name in some responses
  page_name?: string;
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

  // Minimum word count to consider a post as having standalone content.
  // Posts below this are suspected reshare captions with no original body.
  private readonly RESHARE_WORD_THRESHOLD = 20;

  /**
   * Detect whether a raw API post is a reshare, and extract the original post URL if possible.
   *
   * ScrapeCreators has no explicit reshare field. We use two heuristics:
   *
   * 1. AUTHOR MISMATCH: When Newshawk Phuket reshares Newshawk South's post, the API
   *    puts the ORIGINAL author's name in `post.author.name` (the resharing page's name
   *    only appears in the URL/permalink as the page that holds the reshare). So if the
   *    author name doesn't match the page being scraped, it's a reshare signal.
   *
   * 2. EMBEDDED FB URL: Some reshares include the original post URL in the text.
   *    Pattern: facebook.com/{page}/posts/{id} or facebook.com/permalink.php?story_fbid={id}
   *
   * 3. SHORT CONTENT + IMAGES: A post with ≤ RESHARE_WORD_THRESHOLD words but images
   *    strongly suggests a reshare caption where the media came from the original post.
   *
   * Returns { isReshare, originalUrl, originalAuthorName } where originalUrl is the
   * best URL to fetch for the original content (or null if we can't determine it).
   */
  private detectReshare(post: ScrapeCreatorsPost, sourcePageUrl: string): {
    isReshare: boolean;
    originalUrl: string | null;
    sharerCaption: string;
    originalAuthorName: string | null;
  } {
    const text = post.text || '';
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const sharerCaption = text;

    // Extract source page name from the URL we're scraping
    // e.g. https://www.facebook.com/NewshawkPhuket → "NewshawkPhuket"
    const sourcePageMatch = sourcePageUrl.match(/facebook\.com\/([^\/\?]+)/);
    const sourcePageName = sourcePageMatch?.[1]?.toLowerCase() || '';

    // === SIGNAL 1: Embedded Facebook post URL in text ===
    // Matches URLs like:
    //   https://www.facebook.com/NewshawkSouth/posts/pfbid0...
    //   https://www.facebook.com/permalink.php?story_fbid=...
    //   https://web.facebook.com/PageName/posts/12345
    const fbPostUrlPattern = /https?:\/\/(?:www\.|web\.)?facebook\.com\/((?:[^\/]+)\/posts\/[^\s]+|permalink\.php\?story_fbid=[^\s&]+)/i;
    const fbUrlMatch = text.match(fbPostUrlPattern);
    if (fbUrlMatch) {
      const originalUrl = `https://www.facebook.com/${fbUrlMatch[1]}`;
      // The author who wrote the text containing the URL is the sharer, so original is at the URL
      console.log(`   🔗 RESHARE SIGNAL 1 (embedded URL): Found Facebook post URL in text`);
      console.log(`   🔗 Original URL: ${originalUrl.substring(0, 100)}`);
      return {
        isReshare: true,
        originalUrl,
        sharerCaption,
        originalAuthorName: null, // We'll get this from the fetched post
      };
    }

    // === SIGNAL 2: Author mismatch ===
    // If the author name doesn't roughly match the source page name, it's a reshare.
    // The original poster's name ends up in post.author when it's a reshare.
    // We do a loose match (lowercase, ignore spaces/special chars) to avoid false positives.
    const authorName = post.author?.name || '';
    const authorNormalized = authorName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sourceNormalized = sourcePageName.replace(/[^a-z0-9]/g, '');

    // Only trigger author mismatch if:
    // - We have an author name
    // - Content is short (long posts with different author are unlikely reshares — could be admin)
    // - Author name doesn't match source page (even partially)
    const authorMismatch = authorNormalized.length > 0 &&
      sourceNormalized.length > 0 &&
      !authorNormalized.includes(sourceNormalized.substring(0, 6)) &&
      !sourceNormalized.includes(authorNormalized.substring(0, 6));

    if (authorMismatch && wordCount <= this.RESHARE_WORD_THRESHOLD) {
      // Can't construct original URL from author mismatch alone — we don't know the original post ID.
      // The author URL might help if available.
      const authorPageUrl = (post.author as any)?.url || null;
      const originalUrl = authorPageUrl ? authorPageUrl.replace(/\/$/, '') : null;
      console.log(`   👤 RESHARE SIGNAL 2 (author mismatch): Post author "${authorName}" ≠ source page "${sourcePageName}"`);
      if (originalUrl) {
        console.log(`   👤 Author page URL: ${originalUrl}`);
      }
      return {
        isReshare: true,
        originalUrl, // This is the AUTHOR'S PAGE, not the specific post — limited utility
        sharerCaption,
        originalAuthorName: authorName,
      };
    }

    // === SIGNAL 3: Extremely short content with images (heuristic only) ===
    // We do NOT call this a definitive reshare — just log for monitoring.
    // The 20-word guard in scheduler.ts will catch these anyway.
    const hasImages = !!(post.image || post.images?.length || post.full_picture);
    if (wordCount <= 5 && hasImages && wordCount > 0) {
      console.log(`   ⚠️  RESHARE HEURISTIC (very short + images): ${wordCount} words — may be reshare caption`);
      console.log(`      Content: "${text.substring(0, 80)}"`);
      // Not definitive enough to mark as reshare without a URL to follow
    }

    return { isReshare: false, originalUrl: null, sharerCaption, originalAuthorName: null };
  }

  /**
   * Attempt to resolve a reshared post by fetching the original post content.
   *
   * Strategy:
   * - If we have a specific post URL → call scrapeSingleFacebookPost()
   * - If we only have an author page URL → can't reliably find the specific post, return null
   * - Merge: use original text as primary content, preserve sharer's caption if meaningful
   * - Images: prefer original post images if available, fall back to reshared images
   *
   * Returns the resolved ScrapedPost with merged content, or null if resolution failed.
   */
  async resolveReshare(
    post: ScrapedPost,
    originalUrl: string,
    sharerCaption: string,
    originalAuthorName: string | null,
    sourcePageName: string,
  ): Promise<ScrapedPost | null> {
    // Only attempt resolution if we have a specific post URL (not just a page URL)
    const isSpecificPostUrl = /\/posts\/|permalink\.php|story_fbid=/.test(originalUrl);
    if (!isSpecificPostUrl) {
      console.log(`   ⚠️  Reshare detected but original URL is a page, not a specific post — cannot reliably resolve`);
      console.log(`   ⚠️  Original page URL: ${originalUrl.substring(0, 80)}`);
      return null;
    }

    console.log(`\n🔄 RESHARE RESOLUTION: Fetching original post content...`);
    console.log(`   Original URL: ${originalUrl.substring(0, 100)}`);

    try {
      const originalPost = await this.scrapeSingleFacebookPost(originalUrl);

      if (!originalPost) {
        console.log(`   ❌ Could not fetch original post (deleted/private/API error)`);
        return null;
      }

      const originalWordCount = originalPost.content.trim().split(/\s+/).filter(w => w.length > 0).length;
      console.log(`   ✅ Fetched original post: ${originalWordCount} words`);
      console.log(`   ✅ Original title: ${originalPost.title.substring(0, 80)}`);

      // Build merged content:
      // Primary: original post body
      // Append sharer's caption only if it adds meaningful context (>5 words)
      const sharerWordCount = sharerCaption.trim().split(/\s+/).filter(w => w.length > 0).length;
      const sharerPageLabel = sourcePageName || 'Newshawk Phuket';
      const originalPageLabel = originalAuthorName || originalPost.sourceName || 'original source';

      let mergedContent = originalPost.content;
      if (sharerWordCount > 5) {
        mergedContent = `${originalPost.content}\n\n[Shared by ${sharerPageLabel} with caption: "${sharerCaption.trim()}"]`;
      }

      // Images: prefer original post images if present, fall back to reshare images
      const resolvedImages = (originalPost.imageUrls && originalPost.imageUrls.length > 0)
        ? originalPost.imageUrls
        : post.imageUrls;
      const resolvedImageUrl = originalPost.imageUrl || post.imageUrl;

      const resolvedPost: ScrapedPost = {
        ...post, // keep reshare's sourceUrl, facebookPostId, publishedAt, engagement counts
        title: originalPost.title,
        content: mergedContent,
        imageUrl: resolvedImageUrl,
        imageUrls: resolvedImages,
        // Video from original if available
        isVideo: originalPost.isVideo || post.isVideo,
        videoUrl: originalPost.videoUrl || post.videoUrl,
        videoThumbnail: originalPost.videoThumbnail || post.videoThumbnail,
        // Attribution
        isResharedPost: true,
        originalSourceName: originalPageLabel,
        sourceName: post.sourceName || sourcePageName,
      };

      console.log(`   ✅ RESHARE RESOLVED: Merged content (${originalWordCount} original words + ${sharerWordCount > 5 ? sharerWordCount + ' sharer words' : 'no sharer caption'})`);
      console.log(`   ✅ Attribution: Originally posted by "${originalPageLabel}", reshared by "${sharerPageLabel}"`);

      return resolvedPost;

    } catch (error) {
      console.error(`   ❌ Reshare resolution failed:`, error);
      return null;
    }
  }

  // Extract canonical Facebook post ID - ALWAYS returns numeric ID when available
  // This is critical for deduplication: Facebook has multiple URL/ID formats for the same post,
  // and we must normalize to a SINGLE canonical ID (numeric preferred) to prevent duplicates
  // 
  // Examples of the SAME post with different IDs:
  //   - URL: /posts/1146339707616870  → Returns: "1146339707616870"
  //   - URL: /posts/pfbid0wGs...      → Returns: "1146339707616870" (if apiId is numeric)
  //   - URL: /posts/pfbid0wGs...      → Returns: "pfbid0wGs..." (if no numeric ID available)
  //   - URL: /reel/4117170505095746   → Returns: "4117170505095746" (reels)
  private extractFacebookPostId(url: string, apiId?: string): string | null {
    try {
      // Step 1: Look for numeric ID in API's id field (most reliable source)
      if (apiId && /^\d+$/.test(apiId)) {
        return apiId;
      }

      // Step 2: Look for numeric ID in URL (posts OR reels)
      const numericMatch = url.match(/\/(?:posts|reel|reels|videos)\/(\d+)/);
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

          // Resolve any reshared posts (fetch original content where possible)
          const sourceDisplayName = pageUrl.match(/facebook\.com\/([^\/\?]+)/)?.[1] || pageUrl;
          const resolvedPosts = await this.resolveResharedPostsInBatch(scrapedPosts, pageUrl, sourceDisplayName);
          return resolvedPosts;

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

      // Resolve share URLs first (they redirect to canonical URLs)
      if (postUrl.includes('/share/p/') || postUrl.includes('/share/')) {
        console.log(`   📎 Detected share URL, resolving...`);
        const resolvedUrls = await this.resolveShareUrl(postUrl);
        if (resolvedUrls.length > 0 && resolvedUrls[0] !== postUrl) {
          postUrl = resolvedUrls[0];
          console.log(`   ✅ Resolved to: ${postUrl}`);
        }
      }

      // Detect and log Reel URLs for debugging
      if (postUrl.includes('/reel/') || postUrl.includes('/reels/')) {
        const reelId = postUrl.match(/\/reels?\/(\d+)/)?.[1];
        console.log(`   🎬 Detected Facebook REEL URL`);
        console.log(`   🎬 Reel ID: ${reelId || 'unknown'}`);
        console.log(`   📡 Sending to ScrapeCreators API (reels are supported)...`);
      }

      // Clean the URL - remove query parameters and hash fragments that can cause issues
      let cleanUrl = postUrl;
      try {
        const urlObj = new URL(postUrl);
        // Remove query params like ?rdid= and hash fragments
        urlObj.search = '';
        urlObj.hash = '';
        cleanUrl = urlObj.toString();
        if (cleanUrl !== postUrl) {
          console.log(`   🧹 Cleaned URL: ${cleanUrl}`);
        }
      } catch (e) {
        // If URL parsing fails, use original
        console.log(`   ⚠️ Could not parse URL, using original`);
      }

      // Call the single post endpoint
      const response = await fetch(`${this.scrapeCreatorsSinglePostUrl}?url=${encodeURIComponent(cleanUrl)}`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      // If reel URL fails, try alternative URL formats
      if (!response.ok && response.status === 404) {
        const reelId = cleanUrl.match(/\/reels?\/(\d+)/)?.[1];

        if (reelId) {
          console.log(`   ❌ Direct reel URL failed, trying alternative formats...`);

          // Alternative formats to try for Facebook reels/videos
          const alternativeUrls = [
            `https://www.facebook.com/watch?v=${reelId}`,  // Watch format
            `https://www.facebook.com/videos/${reelId}`,   // Direct video format
          ];

          for (const altUrl of alternativeUrls) {
            console.log(`   🔄 Trying: ${altUrl}`);

            const altResponse = await fetch(`${this.scrapeCreatorsSinglePostUrl}?url=${encodeURIComponent(altUrl)}`, {
              headers: {
                'x-api-key': this.apiKey
              }
            });

            if (altResponse.ok) {
              const altData = await altResponse.json();
              console.log(`   ✅ Alternative URL worked!`);

              // Process the successful response
              if (altData && (altData.text || altData.description)) {
                const post = altData;
                const text = post.text || post.description || '';
                const lines = text.split('\n').filter((line: string) => line.trim());
                const title = lines[0]?.substring(0, 200) || text.substring(0, 100);

                // Extract video details
                const isVideo = true;
                const videoUrl = post.video_url || post.video?.hd_url || post.video?.sd_url || post.videoDetails?.hdUrl || post.videoDetails?.sdUrl;
                const videoThumbnail = post.video?.thumbnail || post.videoThumbnail || post.videoDetails?.thumbnail || post.full_picture || post.image;

                const scrapedPost: ScrapedPost = {
                  title: title.trim(),
                  content: text.trim(),
                  imageUrl: videoThumbnail,
                  sourceUrl: postUrl, // Keep original reel URL as source
                  facebookPostId: reelId,
                  publishedAt: post.creation_time ? new Date(post.creation_time) : new Date(),
                  isVideo,
                  videoUrl,
                  videoThumbnail,
                  location: post.place?.name,
                  likeCount: post.like_count,
                  commentCount: post.comment_count,
                  shareCount: post.share_count,
                  viewCount: post.view_count,
                };

                console.log(`   ✅ Successfully scraped reel via alternative URL`);
                console.log(`      Title: ${scrapedPost.title.substring(0, 60)}...`);
                return scrapedPost;
              }
            }
          }

          console.log(`   ❌ All alternative URL formats failed`);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ScrapeCreators single post API error (${response.status}):`, errorText);

        // If 404, try fallback: scrape the page and find the post
        if (response.status === 404) {
          console.log(`\n🔄 Single post API failed, trying fallback: page scraper...`);

          // Check if this is a reel URL (format: /reel/ID)
          const reelIdMatch = cleanUrl.match(/\/reel\/(\d+)/);
          if (reelIdMatch) {
            console.log(`   🎬 Detected REEL URL with ID: ${reelIdMatch[1]}`);
            console.log(`   ⚠️  Reels require direct API support - fallback may not work`);
            // For reels, we need to try the API again with a different approach
            // The page scraper won't typically return reels in regular post feeds
          }

          // Extract page name from URL (works for /PageName/posts/... format)
          const pageMatch = cleanUrl.match(/facebook\.com\/([^\/]+)\//);
          if (pageMatch && pageMatch[1] !== 'reel' && pageMatch[1] !== 'watch') {
            const pageName = pageMatch[1];
            const pageUrl = `https://www.facebook.com/${pageName}`;
            console.log(`   📄 Scraping page: ${pageUrl} (up to 5 pages to find older posts)`);

            try {
              // Scrape the page with pagination to get more posts (for older posts)
              const pagePosts = await this.scrapeFacebookPageWithPagination(pageUrl, 5);
              console.log(`   📋 Found ${pagePosts.length} posts from page`);

              // Extract the post ID from the original URL to match
              // pfbid format: pfbid0eQGN38vUHKMDLLKHgsLu2CvWXn9vPrZ6z466izR6mfZT3DgJZjAk8ApfQGA5WGXgl
              const pfbidMatch = cleanUrl.match(/pfbid([A-Za-z0-9]+)/);
              const numericIdMatch = cleanUrl.match(/\/(?:posts|reel|reels|videos)\/(\d+)/);

              // Get the last 10 characters of pfbid for matching (in case of URL encoding differences)
              const pfbidSuffix = pfbidMatch ? pfbidMatch[0].slice(-15) : null;

              console.log(`   🔍 Looking for: ${pfbidMatch ? pfbidMatch[0].substring(0, 20) + '...' : numericIdMatch?.[1] || 'unknown'}`);

              // Try to find the matching post by URL pattern
              const matchingPost = pagePosts.find(p => {
                if (pfbidMatch && p.sourceUrl?.includes(pfbidMatch[0])) return true;
                // Also try matching by suffix (handles URL encoding differences)
                if (pfbidSuffix && p.sourceUrl?.includes(pfbidSuffix)) return true;
                // Match numeric ID in posts, reels, or videos URLs
                if (numericIdMatch && p.sourceUrl?.includes(numericIdMatch[1])) return true;
                // Match by facebookPostId if available
                if (numericIdMatch && p.facebookPostId === numericIdMatch[1]) return true;
                return false;
              });

              if (matchingPost) {
                console.log(`   ✅ Found matching post via page scraper!`);
                return matchingPost;
              } else {
                console.log(`   ⚠️ Post not found in ${pagePosts.length} page results`);
                console.log(`   💡 The post may have been deleted, made private, or is very old`);
                if (reelIdMatch) {
                  console.log(`   🎬 NOTE: Facebook Reels may not appear in regular page feeds`);
                }
              }
            } catch (pageError) {
              console.error(`   ❌ Page scraper fallback failed:`, pageError);
            }
          } else if (reelIdMatch) {
            // For direct reel URLs without page context, log helpful message
            console.log(`   ⚠️  Cannot determine source page from reel URL`);
            console.log(`   💡 Try using the full URL with page name: facebook.com/PageName/videos/ID`);
          }
        }

        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("📋 SINGLE POST API RESPONSE:");
      console.log(JSON.stringify(data, null, 2));

      // CRITICAL: Check if API returned an error object instead of post data
      // Error objects have structure: { url, error, errorDescription } or { success: false, ... }
      if (data.error || data.errorDescription || data.success === false) {
        console.log(`\n❌ SCRAPECREATORS API RETURNED ERROR:`);
        console.log(`   URL: ${postUrl}`);
        console.log(`   Error: ${data.error || 'no error field'}`);
        console.log(`   Error Description: ${data.errorDescription || data.message || 'no description'}`);
        console.log(`   All keys: ${Object.keys(data).join(', ')}`);

        // DON'T throw an error - return null so fallback can be attempted
        // Try the page scraper fallback before giving up
        console.log(`\n🔄 Attempting page scraper fallback...`);

        const pageMatch = postUrl.match(/facebook\.com\/([^\/]+)\//);
        if (pageMatch && pageMatch[1] !== 'reel' && pageMatch[1] !== 'watch') {
          const pageName = pageMatch[1];
          const pageUrl = `https://www.facebook.com/${pageName}`;
          console.log(`   📄 Scraping page: ${pageUrl}`);

          try {
            const pagePosts = await this.scrapeFacebookPageWithPagination(pageUrl, 3);
            console.log(`   📋 Found ${pagePosts.length} posts from page`);

            // Try to find matching post by pfbid or numeric ID
            const pfbidMatch = postUrl.match(/pfbid([A-Za-z0-9]+)/);
            const numericIdMatch = postUrl.match(/\/(?:posts|reel|reels|videos)\/(\d+)/);

            const matchingPost = pagePosts.find(p => {
              if (pfbidMatch && p.sourceUrl?.includes(pfbidMatch[0])) return true;
              if (numericIdMatch && p.sourceUrl?.includes(numericIdMatch[1])) return true;
              if (numericIdMatch && p.facebookPostId === numericIdMatch[1]) return true;
              return false;
            });

            if (matchingPost) {
              console.log(`   ✅ Found matching post via page scraper fallback!`);
              return matchingPost;
            } else {
              console.log(`   ⚠️ Post not found in page results`);
            }
          } catch (pageError) {
            console.error(`   ❌ Page scraper fallback failed:`, pageError);
          }
        }

        // FINAL FALLBACK: Try Apify with authenticated session (cookies)
        // This can access login-protected posts that public scrapers cannot reach
        console.log(`\n🔐 Attempting APIFY AUTHENTICATED fallback for login-protected content...`);
        try {
          const { apifyScraperService } = await import('./apify-scraper');

          if (apifyScraperService.hasAuthenticatedSession()) {
            const authenticatedPost = await apifyScraperService.scrapeSinglePostAuthenticated(postUrl);

            if (authenticatedPost) {
              console.log(`   ✅ Successfully scraped via Apify authenticated session!`);
              return authenticatedPost;
            } else {
              console.log(`   ⚠️ Apify authenticated scrape returned no results`);
            }
          } else {
            console.log(`   ⚠️ Apify authenticated session not configured`);
            console.log(`   💡 Set APIFY_API_KEY and FACEBOOK_COOKIES environment variables`);
            console.log(`   💡 Export cookies from logged-in Facebook session using Cookie-Editor extension`);
          }
        } catch (apifyError) {
          console.error(`   ❌ Apify authenticated fallback failed:`, apifyError);
        }

        return null;
      }

      // The single post endpoint returns the post directly (not in a posts array)
      // Note: API returns 'description' not 'text' for the post content
      if (!data || (!data.text && !data.description)) {
        console.log("❌ No post data returned from single post endpoint");
        console.log("   Keys available:", Object.keys(data || {}).join(', '));
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

      // 🎥 ENHANCED VIDEO/REEL DETECTION
      const isUrlVideo = postUrl.includes('/reel/') ||
        postUrl.includes('/reels/') ||
        postUrl.includes('/videos/') ||
        postUrl.includes('/watch');

      const hasVideoAttachment = post.attachments?.data?.some((att: any) =>
        att.type?.includes('video') ||
        att.type?.includes('reel') ||
        att.media_type === 'video'
      );

      const isVideo = !!(post.video_url || post.video?.sd_url || post.video?.hd_url || post.videoDetails?.sdUrl || post.videoDetails?.hdUrl) || isUrlVideo || hasVideoAttachment;
      const videoUrl = post.video_url || post.video?.hd_url || post.video?.sd_url || post.videoDetails?.hdUrl || post.videoDetails?.sdUrl;
      const videoThumbnail = post.video?.thumbnail || post.videoThumbnail || post.videoDetails?.thumbnail || post.image || imageUrl;

      if (isVideo) {
        console.log(`\n🎥 VIDEO DETECTED (Single Post) via parsing bits:`);
        console.log(`   - Has direct URL: ${!!videoUrl}`);
        console.log(`   - Is URL pattern: ${isUrlVideo}`);
        console.log(`   - Has video attachment: ${hasVideoAttachment}`);
      }

      // Extract Facebook post ID
      const facebookPostId = this.extractFacebookPostId(postUrl, post.id || post.post_id);

      // Parse timestamp if available (API uses creation_time, not created_time)
      const publishedAt = post.creation_time
        ? new Date(post.creation_time)
        : (post.created_time ? new Date(post.created_time) : new Date());

      // Extract location if available
      const location = post.place?.name;

      // Extract textFormatPresetId if available (indicates colored background text post)
      const textFormatPresetId = post.text_format_preset_id;
      const likeCount = post.like_count;
      const commentCount = post.comment_count;
      const shareCount = post.share_count;
      const viewCount = post.view_count;

      const scrapedPost: ScrapedPost = {
        title: title.trim(),
        content: content.trim(),
        imageUrl,
        imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
        sourceUrl: postUrl,
        facebookPostId: facebookPostId || undefined,
        publishedAt,
        textFormatPresetId,
        isVideo,
        videoUrl,
        videoThumbnail,
        location,
        likeCount,
        commentCount,
        shareCount,
        viewCount,
        sourceName: post.author?.name || post.page_name,
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
        // Extract source URL early for video detection and duplicate checks
        const rawSourceUrl = post.permalink || post.url || sourceUrl;

        // 🎥 ENHANCED VIDEO/REEL DETECTION (Done early to inform skipping logic)
        // ScrapeCreators often misses direct video URLs for Reels in page feeds, 
        // but we can detect them via URL patterns and attachment types.
        const isUrlVideo = rawSourceUrl.includes('/reel/') ||
          rawSourceUrl.includes('/reels/') ||
          rawSourceUrl.includes('/videos/') ||
          rawSourceUrl.includes('/watch') ||
          post.url?.includes('/reel/') ||
          post.permalink?.includes('/reel/');

        const hasVideoAttachment = post.attachments?.data?.some(att =>
          att.type?.includes('video') ||
          att.type?.includes('reel') ||
          att.media_type === 'video'
        );

        const isVideo = !!(post.videoDetails?.sdUrl || post.videoDetails?.hdUrl) || isUrlVideo || hasVideoAttachment;
        const videoUrl = post.videoDetails?.hdUrl || post.videoDetails?.sdUrl;
        // FIX: Add fallback sources for video thumbnail (same as scrapeSingleFacebookPost)
        // The page feed API often returns full_picture/image but not videoDetails.thumbnail
        const videoThumbnail = post.videoDetails?.thumbnail || post.full_picture || post.image;

        // Skip posts without ANY text content - UNLESS they are video/reel posts!
        // Video/reel stories are often news-heavy even with short captions.
        if (!post.text || post.text.trim().length === 0) {
          if (isVideo) {
            console.log(`Allowing video post ${post.id} even without text content`);
          } else {
            console.log(`Skipping post ${post.id} - no text content`);
            continue;
          }
        }

        // Extract canonical Facebook post ID for deduplication
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
        const actualSourceUrl = rawSourceUrl;

        // Extract the first line as title (or use first 100 chars)
        const lines = post.text ? post.text.split('\n').filter(line => line.trim()) : [];
        const title = lines[0]?.substring(0, 200) || post.text?.substring(0, 100) || "Video Story";
        const content = post.text || "";

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

        if (isVideo) {
          console.log(`\n🎥 VIDEO DETECTED via parsing bits:`);
          console.log(`   - Has direct URL: ${!!videoUrl}`);
          console.log(`   - Is URL pattern: ${isUrlVideo}`);
          console.log(`   - Has video attachment: ${hasVideoAttachment}`);
        }

        // Extract check-in location if available
        const location = post.place?.name;

        // === RESHARE DETECTION ===
        // Before returning, check if this post is a reshare with thin content.
        // We do detection synchronously here and store the metadata on the post.
        // Resolution (async API call) happens in resolveResharedPostsInBatch().
        const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
        let reshareInfo: { isReshare: boolean; originalUrl: string | null; sharerCaption: string; originalAuthorName: string | null } | null = null;
        if (wordCount < this.RESHARE_WORD_THRESHOLD) {
          reshareInfo = this.detectReshare(post, sourceUrl);
          if (reshareInfo.isReshare) {
            console.log(`   📤 Reshare tagged for resolution: "${title.substring(0, 60)}" (${wordCount} words)`);
          }
        }

        const scrapedPost: ScrapedPost & { _reshareInfo?: typeof reshareInfo } = {
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
          likeCount: post.like_count ?? (post as any).reactionCount,
          commentCount: post.comment_count ?? (post as any).commentCount,
          shareCount: post.share_count,
          viewCount: post.view_count,
          sourceName: post.author?.name || post.page_name,
        };

        // Attach reshare metadata as a hidden property (stripped before reaching scheduler)
        if (reshareInfo) {
          scrapedPost._reshareInfo = reshareInfo;
        }

        scrapedPosts.push(scrapedPost);
      } catch (error) {
        console.error(`Error parsing post ${post.id}:`, error);
        // Continue with next post
      }
    }

    return scrapedPosts;
  }

  /**
   * Post-process a batch of parsed posts to resolve any reshares.
   * This is the async counterpart to the synchronous parseScrapeCreatorsResponse().
   *
   * For each post tagged with _reshareInfo, attempts to fetch the original content.
   * On success, replaces the post with the resolved version.
   * On failure (deleted/private/rate-limit), keeps the original post as-is.
   * The 20-word guard in scheduler.ts remains the final backstop.
   */
  async resolveResharedPostsInBatch(
    posts: ScrapedPost[],
    sourcePageUrl: string,
    sourcePageDisplayName: string,
  ): Promise<ScrapedPost[]> {
    const resolved: ScrapedPost[] = [];

    for (const post of posts) {
      const reshareInfo = (post as any)._reshareInfo as {
        isReshare: boolean;
        originalUrl: string | null;
        sharerCaption: string;
        originalAuthorName: string | null;
      } | undefined;

      // Clean up the temp property before passing downstream
      delete (post as any)._reshareInfo;

      if (!reshareInfo?.isReshare || !reshareInfo.originalUrl) {
        resolved.push(post);
        continue;
      }

      console.log(`\n🔄 Attempting reshare resolution for: "${post.title.substring(0, 60)}"`); 
      console.log(`   Source URL: ${post.sourceUrl.substring(0, 80)}`);

      try {
        const resolvedPost = await this.resolveReshare(
          post,
          reshareInfo.originalUrl,
          reshareInfo.sharerCaption,
          reshareInfo.originalAuthorName,
          sourcePageDisplayName,
        );

        if (resolvedPost) {
          resolved.push(resolvedPost);
          console.log(`   ✅ Reshare resolution succeeded — using original post content`);
        } else {
          // Resolution failed — keep the original thin post
          // The 20-word guard in scheduler.ts will drop it if still under threshold
          console.log(`   ⚠️  Reshare resolution failed — keeping original thin post (will be filtered by 20-word guard if too short)`);
          resolved.push(post);
        }
      } catch (resolveError) {
        console.error(`   ❌ Error during reshare resolution:`, resolveError);
        resolved.push(post); // Keep original, don't drop
      }
    }

    return resolved;
  }

  /**
   * Enrich a reel post with missing thumbnail/video data by fetching from single post API
   * The page feed API often returns empty videoDetails for reels, while the single post API has full data
   */
  private async enrichReelWithDetails(post: ScrapedPost): Promise<ScrapedPost> {
    // Only enrich if it's a video/reel without a thumbnail
    if (!post.isVideo || post.videoThumbnail || post.imageUrl) {
      return post; // Already has thumbnail or not a video
    }

    const reelUrl = post.sourceUrl;
    if (!reelUrl.includes('/reel/') && !reelUrl.includes('/reels/')) {
      return post; // Not a reel URL
    }

    console.log(`\n📹 ENRICHING REEL: Fetching detailed video data for ${reelUrl.substring(0, 60)}...`);

    try {
      // Call the single post API to get full video details
      const response = await fetch(`${this.scrapeCreatorsSinglePostUrl}?url=${encodeURIComponent(reelUrl)}`, {
        headers: {
          'x-api-key': this.apiKey!
        }
      });

      if (!response.ok) {
        console.log(`   ⚠️ Failed to fetch reel details (${response.status})`);
        return post;
      }

      const data = await response.json();

      // Check for error response
      if (data.error || data.errorDescription) {
        console.log(`   ⚠️ API returned error: ${data.error || data.errorDescription}`);
        return post;
      }

      // Extract video details from single post response
      const video = data.video;
      if (video) {
        console.log(`   ✅ Got video details from single post API`);

        // Update post with video data
        post.videoUrl = video.hd_url || video.sd_url || post.videoUrl;
        post.videoThumbnail = video.thumbnail;

        // Use thumbnail as image if no image exists
        if (!post.imageUrl && video.thumbnail) {
          post.imageUrl = video.thumbnail;
          post.imageUrls = [video.thumbnail];
          console.log(`   📸 Using video thumbnail as primary image: ${video.thumbnail.substring(0, 60)}...`);
        }
      } else {
        console.log(`   ⚠️ No video object in response`);
      }

      return post;
    } catch (error) {
      console.error(`   ❌ Error enriching reel:`, error);
      return post;
    }
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

        // Resolve any reshared posts before reel enrichment
        const sourceDisplayName = pageUrl.match(/facebook\.com\/([^\/\?]+)/)?.[1] || pageUrl;
        const reshareResolved = await this.resolveResharedPostsInBatch(parsed, pageUrl, sourceDisplayName);

        // CRITICAL FIX: Enrich reels that are missing thumbnails
        // The page feed API returns empty videoDetails for reels, so we need to fetch full details
        const enrichedParsed: ScrapedPost[] = [];
        for (const post of reshareResolved) {
          const enrichedPost = await this.enrichReelWithDetails(post);
          enrichedParsed.push(enrichedPost);
        }

        let newPostsOnThisPage = 0;
        let duplicatesOnThisPage = 0;

        // If duplicate checker is provided, track consecutive duplicates
        if (checkForDuplicate) {
          for (const post of enrichedParsed) {
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
          allPosts = [...allPosts, ...enrichedParsed];
          newPostsOnThisPage = enrichedParsed.length;
        }

        console.log(`   Posts on page ${pageCount + 1}: ${enrichedParsed.length} total, ${newPostsOnThisPage} new, ${duplicatesOnThisPage} duplicates`);
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

// Main scraper service - ALWAYS uses ScrapeCreators for scheduled scrapes
// Apify is ONLY used as a fallback inside scrapeSingleFacebookPost() when ScrapeCreators fails
export async function getScraperService(): Promise<{
  scrapeFacebookPage: (pageUrl: string) => Promise<ScrapedPost[]>;
  scrapeFacebookPageWithPagination: (
    pageUrl: string,
    maxPages?: number,
    checkForDuplicate?: (sourceUrl: string) => Promise<boolean>
  ) => Promise<ScrapedPost[]>;
  scrapeSingleFacebookPost: (postUrl: string) => Promise<ScrapedPost | null>;
}> {
  // Always use ScrapeCreators for main scraping operations
  // Apify is only a fallback for manual single-post scrapes (handled inside scrapeSingleFacebookPost)
  console.log('🔄 Using ScrapeCreators scraper');
  return scraperService;
}

export const scraperService = new ScraperService();

