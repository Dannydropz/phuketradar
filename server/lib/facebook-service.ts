import type { Article } from "@shared/schema";
import type { IStorage } from "../storage";

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_PAGE_ID = "786684811203574"; // Phuket Radar page ID

interface FacebookPostResponse {
  id: string;
  post_id?: string;
}

interface FacebookCommentResponse {
  id: string;
}

function generateHashtags(category: string): string {
  const baseHashtag = "#Phuket";
  
  const categoryHashtags: Record<string, string[]> = {
    "Breaking": ["#PhuketBreaking", "#ThailandNews", "#BreakingNews"],
    "Tourism": ["#PhuketTourism", "#ThailandTravel", "#VisitPhuket"],
    "Business": ["#PhuketBusiness", "#ThailandBusiness", "#PhuketEconomy"],
    "Events": ["#PhuketEvents", "#ThingsToDoInPhuket", "#PhuketLife"],
    "Other": ["#PhuketNews", "#Thailand", "#PhuketLife"],
  };

  const categoryTags = categoryHashtags[category] || categoryHashtags["Other"];
  return `${baseHashtag} ${categoryTags.join(" ")}`;
}

function getArticleUrl(article: Article): string {
  // Always use custom domain in production, only use dev domain if explicitly in development
  const baseUrl = process.env.NODE_ENV === "development" && process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://phuketradar.com";
  
  return `${baseUrl}/article/${article.slug || article.id}`;
}

export async function postArticleToFacebook(
  article: Article, 
  storage: IStorage
): Promise<{ status: 'posted' | 'already-posted'; postId: string; postUrl: string } | null> {
  console.log(`📘 [FB-POST] Starting Facebook post attempt for article: ${article.title.substring(0, 60)}...`);
  console.log(`📘 [FB-POST] Article ID: ${article.id}`);
  
  if (!FB_PAGE_ACCESS_TOKEN) {
    console.error("❌ [FB-POST] FB_PAGE_ACCESS_TOKEN not configured");
    return null;
  }

  if (!article.imageUrl) {
    console.error(`❌ [FB-POST] Article ${article.id} has no image, skipping Facebook post`);
    return null;
  }

  // STEP 1: CLAIM - Acquire exclusive lock before making external API call
  // Generate unique lock token for this posting attempt
  const lockToken = `${article.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`🔒 [FB-POST] Attempting to claim article for posting (lockToken: ${lockToken.substring(0, 40)}...)...`);
  
  const claimed = await storage.claimArticleForFacebookPosting(article.id, lockToken);
  
  if (!claimed) {
    // Another process already claimed or posted this article
    console.log(`⏭️  [FB-POST] Could not claim article - already posted or being posted by another process`);
    
    // Reload to get current state
    const freshArticle = await storage.getArticleById(article.id);
    if (freshArticle?.facebookPostId && !freshArticle.facebookPostId.startsWith('LOCK:')) {
      console.log(`✅ [FB-POST] Article already posted (status: already-posted)`);
      console.log(`📘 [FB-POST] Post ID: ${freshArticle.facebookPostId}`);
      return {
        status: 'already-posted',
        postId: freshArticle.facebookPostId,
        postUrl: freshArticle.facebookPostUrl || `https://www.facebook.com/${freshArticle.facebookPostId.replace('_', '/posts/')}`,
      };
    }
    
    console.log(`⚠️  [FB-POST] Article is locked by another process - skipping`);
    return null;
  }
  
  console.log(`✅ [FB-POST] Successfully claimed article - proceeding with Facebook API call...`);

  try {
    const hashtags = generateHashtags(article.category);
    const articleUrl = getArticleUrl(article);
    
    // STEP 2: POST - Make the external API call (we hold the lock)
    // Post message: title + excerpt + CTA + hashtags
    const postMessage = `${article.title}\n\n${article.excerpt}\n\nWant the full story? Click the link in the first comment below...\n\n${hashtags}`;

    console.log(`📘 [FB-POST] Posting to Facebook API...`);
    console.log(`📘 [FB-POST] Page ID: ${FB_PAGE_ID}`);
    console.log(`📘 [FB-POST] Image URL: ${article.imageUrl}`);
    console.log(`📘 [FB-POST] Token length: ${FB_PAGE_ACCESS_TOKEN.length} characters`);

    // Post photo to Facebook
    const photoResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: article.imageUrl,
        message: postMessage,
        access_token: FB_PAGE_ACCESS_TOKEN,
      }),
    });

    console.log(`📘 [FB-POST] Facebook API response status: ${photoResponse.status}`);

    if (!photoResponse.ok) {
      const errorText = await photoResponse.text();
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch {
        // Error is not JSON, use text as-is
      }
      console.error("❌ [FB-POST] Facebook photo post failed:");
      console.error(`❌ [FB-POST] Status: ${photoResponse.status} ${photoResponse.statusText}`);
      console.error(`❌ [FB-POST] Response: ${errorDetails}`);
      
      // CRITICAL: Release lock on failure
      console.log(`🔓 [FB-POST] Releasing lock due to Facebook API failure...`);
      await storage.releaseFacebookPostLock(article.id, lockToken);
      
      return null;
    }

    const photoData = await photoResponse.json() as FacebookPostResponse;
    const postId = photoData.post_id || photoData.id;
    
    console.log(`✅ [FB-POST] Posted to Facebook successfully!`);
    console.log(`✅ [FB-POST] Post ID: ${postId}`);

    // Add comment with "Read more" link
    const commentResponse = await fetch(`https://graph.facebook.com/v18.0/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Read the full story: ${articleUrl}`,
        access_token: FB_PAGE_ACCESS_TOKEN,
      }),
    });

    if (commentResponse.ok) {
      const commentData = await commentResponse.json() as FacebookCommentResponse;
      console.log(`✅ [FB-POST] Added comment to post: ${commentData.id}`);
      
      // Pin the comment so it stays at the top
      const pinResponse = await fetch(`https://graph.facebook.com/v18.0/${commentData.id}?is_pinned=true&access_token=${FB_PAGE_ACCESS_TOKEN}`, {
        method: "POST",
      });

      if (pinResponse.ok) {
        const pinData = await pinResponse.json();
        console.log(`📌 [FB-POST] Pinned comment successfully:`, pinData);
      } else {
        const pinError = await pinResponse.text();
        console.warn(`⚠️  [FB-POST] Failed to pin comment (status ${pinResponse.status}): ${pinError}`);
      }
    } else {
      const commentError = await commentResponse.text();
      console.warn(`⚠️  [FB-POST] Failed to add comment to Facebook post (status ${commentResponse.status}): ${commentError}`);
    }

    // STEP 2: Generate Facebook post URL
    const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

    console.log(`✅ [FB-POST] Facebook API call successful!`);
    console.log(`📘 [FB-POST] Post ID: ${postId}`);
    console.log(`📘 [FB-POST] Post URL: ${postUrl}`);
    
    // STEP 3: FINALIZE - Update database with real post ID (only if we still hold the lock)
    console.log(`💾 [FB-POST] Finalizing database with real post ID...`);
    const finalized = await storage.finalizeArticleFacebookPost(article.id, lockToken, postId, postUrl);
    
    if (finalized) {
      console.log(`✅ [FB-POST] Successfully finalized post in database (status: posted)`);
      console.log(`✅ [FB-POST] Completed Facebook posting for article ${article.id}`);
      return {
        status: 'posted',
        postId,
        postUrl,
      };
    } else {
      // This should never happen, but handle gracefully
      console.error(`⚠️  [FB-POST] Failed to finalize - lock was lost or stolen`);
      console.error(`⚠️  [FB-POST] This indicates a critical error in the locking mechanism`);
      
      // Release our lock attempt
      await storage.releaseFacebookPostLock(article.id, lockToken);
      
      // Note: Facebook post remains orphaned on Facebook
      // In production, could attempt to delete it via Graph API here
      console.warn(`⚠️  [FB-POST] Orphaned Facebook post created: ${postId}`);
      
      return null;
    }
  } catch (error) {
    console.error("❌ [FB-POST] Error during Facebook posting:", error);
    
    // Release lock on error to allow retry
    console.log(`🔓 [FB-POST] Releasing lock due to error...`);
    await storage.releaseFacebookPostLock(article.id, lockToken);
    
    return null;
  }
}
