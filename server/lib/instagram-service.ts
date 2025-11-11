import type { Article } from "@shared/schema";
import type { IStorage } from "../storage";
import { buildArticleUrl } from "@shared/category-map";

const META_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN; // Same token works for Instagram
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID; // Instagram Business Account ID

interface InstagramContainerResponse {
  id: string;
}

interface InstagramPublishResponse {
  id: string;
}

interface InstagramCommentResponse {
  id: string;
}

function generateHashtags(category: string): string {
  const baseHashtag = "#Phuket";
  
  const categoryHashtags: Record<string, string[]> = {
    "Breaking": ["#PhuketNews", "#ThailandNews", "#BreakingNews"],
    "Tourism": ["#PhuketTourism", "#ThailandTravel", "#VisitPhuket"],
    "Business": ["#PhuketBusiness", "#ThailandBusiness", "#PhuketEconomy"],
    "Events": ["#PhuketEvents", "#ThingsToDoInPhuket", "#PhuketLife"],
    "Other": ["#PhuketNews", "#Thailand", "#PhuketLife"],
  };

  const categoryTags = categoryHashtags[category] || categoryHashtags["Other"];
  return `${baseHashtag} ${categoryTags.join(" ")}`;
}

function getArticleUrl(article: Article): string {
  const baseUrl = process.env.NODE_ENV === "development" && process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://phuketradar.com";
  
  const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
  return `${baseUrl}${articlePath}`;
}

export async function postArticleToInstagram(
  article: Article,
  storage: IStorage
): Promise<{ status: 'posted' | 'already-posted'; postId: string; postUrl: string } | null> {
  
  // CRITICAL: Disable all Instagram posting in development environment
  if (process.env.NODE_ENV === "development") {
    console.log(`🚫 [IG-POST] Instagram posting DISABLED in development environment`);
    console.log(`📸 [IG-POST] Article: ${article.title.substring(0, 60)}... (would post in production)`);
    return null;
  }
  
  console.log(`📸 [IG-POST] Starting Instagram post attempt for article: ${article.title.substring(0, 60)}...`);
  console.log(`📸 [IG-POST] Article ID: ${article.id}`);
  
  if (!META_ACCESS_TOKEN) {
    console.error("❌ [IG-POST] META_ACCESS_TOKEN not configured");
    return null;
  }

  if (!INSTAGRAM_ACCOUNT_ID) {
    console.error("❌ [IG-POST] INSTAGRAM_ACCOUNT_ID not configured");
    return null;
  }

  // Get the primary image URL (Instagram requires at least one image)
  const primaryImageUrl = article.imageUrl || (article.imageUrls && article.imageUrls[0]);
  
  if (!primaryImageUrl) {
    console.error(`❌ [IG-POST] Article ${article.id} has no image, skipping Instagram post`);
    return null;
  }
  
  console.log(`📸 [IG-POST] Using image: ${primaryImageUrl}`);

  // STEP 1: CLAIM - Acquire exclusive lock before making external API call
  const lockToken = `${article.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`🔒 [IG-POST] Attempting to claim article for posting (lockToken: ${lockToken.substring(0, 40)}...)...`);
  
  const claimed = await storage.claimArticleForInstagramPosting(article.id, lockToken);
  
  if (!claimed) {
    console.log(`⏭️  [IG-POST] Could not claim article - already posted or being posted by another process`);
    
    const freshArticle = await storage.getArticleById(article.id);
    if (freshArticle?.instagramPostId && !freshArticle.instagramPostId.startsWith('IG-LOCK:')) {
      console.log(`✅ [IG-POST] Article already posted (status: already-posted)`);
      console.log(`📸 [IG-POST] Post ID: ${freshArticle.instagramPostId}`);
      return {
        status: 'already-posted',
        postId: freshArticle.instagramPostId,
        postUrl: freshArticle.instagramPostUrl || `https://www.instagram.com/p/${freshArticle.instagramPostId}/`,
      };
    }
    
    console.log(`⚠️  [IG-POST] Article is locked by another process - skipping`);
    return null;
  }
  
  console.log(`✅ [IG-POST] Successfully claimed article - proceeding with Instagram API call...`);

  try {
    const hashtags = generateHashtags(article.category);
    const articleUrl = getArticleUrl(article);
    
    // STEP 2: CREATE MEDIA CONTAINER
    // Instagram requires a two-step process: create container, then publish
    const caption = `${article.title}\n\n${article.excerpt}\n\nRead the full story (link in comments) 👇\n\n${hashtags}`;

    console.log(`📸 [IG-POST] Creating media container...`);
    console.log(`📸 [IG-POST] Account ID: ${INSTAGRAM_ACCOUNT_ID}`);

    // Create media container (single image for now - carousel support can be added later)
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: primaryImageUrl,
          caption: caption,
          access_token: META_ACCESS_TOKEN,
        }),
      }
    );

    if (!containerResponse.ok) {
      const errorText = await containerResponse.text();
      console.error("❌ [IG-POST] Failed to create media container:");
      console.error(`❌ [IG-POST] Status: ${containerResponse.status}`);
      console.error(`❌ [IG-POST] Response: ${errorText}`);
      
      await storage.releaseInstagramPostLock(article.id, lockToken);
      return null;
    }

    const containerData = await containerResponse.json() as InstagramContainerResponse;
    const containerId = containerData.id;
    console.log(`✅ [IG-POST] Created media container: ${containerId}`);

    // Wait a moment for Instagram to process the media
    console.log(`📸 [IG-POST] Waiting 3 seconds for media processing...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // STEP 3: PUBLISH THE CONTAINER
    console.log(`📸 [IG-POST] Publishing media container...`);
    
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: META_ACCESS_TOKEN,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error("❌ [IG-POST] Failed to publish media:");
      console.error(`❌ [IG-POST] Status: ${publishResponse.status}`);
      console.error(`❌ [IG-POST] Response: ${errorText}`);
      
      await storage.releaseInstagramPostLock(article.id, lockToken);
      return null;
    }

    const publishData = await publishResponse.json() as InstagramPublishResponse;
    const mediaId = publishData.id;
    console.log(`✅ [IG-POST] Published to Instagram! Media ID: ${mediaId}`);

    // STEP 4: ADD COMMENT WITH ARTICLE LINK
    console.log(`📸 [IG-POST] Adding comment with article link...`);
    
    const commentResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Read the full story: ${articleUrl}`,
          access_token: META_ACCESS_TOKEN,
        }),
      }
    );

    if (commentResponse.ok) {
      const commentData = await commentResponse.json() as InstagramCommentResponse;
      console.log(`✅ [IG-POST] Added comment to post: ${commentData.id}`);
    } else {
      const commentErrorText = await commentResponse.text();
      console.warn(`⚠️  [IG-POST] Failed to add comment (status ${commentResponse.status}): ${commentErrorText}`);
      // Continue anyway - the post is live
    }

    // STEP 5: UPDATE DATABASE - Replace lock with actual post ID
    const postUrl = `https://www.instagram.com/p/${mediaId}/`;
    console.log(`📸 [IG-POST] Updating database with post ID and URL...`);
    
    await storage.updateArticleInstagramPost(article.id, mediaId, postUrl, lockToken);
    console.log(`✅ [IG-POST] Database updated successfully!`);
    console.log(`📸 [IG-POST] Post URL: ${postUrl}`);

    return {
      status: 'posted',
      postId: mediaId,
      postUrl: postUrl,
    };

  } catch (error) {
    console.error("❌ [IG-POST] Unexpected error during Instagram posting:", error);
    
    // Release the lock on error
    try {
      await storage.releaseInstagramPostLock(article.id, lockToken);
    } catch (releaseError) {
      console.error("❌ [IG-POST] Failed to release lock after error:", releaseError);
    }
    
    return null;
  }
}
