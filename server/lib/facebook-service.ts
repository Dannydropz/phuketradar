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
  
  // CRITICAL: Disable all Facebook posting in development environment
  if (process.env.NODE_ENV === "development") {
    console.log(`🚫 [FB-POST] Facebook posting DISABLED in development environment`);
    console.log(`📘 [FB-POST] Article: ${article.title.substring(0, 60)}... (would post in production)`);
    return null;
  }
  
  console.log(`📘 [FB-POST] Starting Facebook post attempt for article: ${article.title.substring(0, 60)}...`);
  console.log(`📘 [FB-POST] Article ID: ${article.id}`);
  
  if (!FB_PAGE_ACCESS_TOKEN) {
    console.error("❌ [FB-POST] FB_PAGE_ACCESS_TOKEN not configured");
    return null;
  }

  // Get the primary image URL (prefer imageUrl, fallback to first imageUrls)
  const primaryImageUrl = article.imageUrl || (article.imageUrls && article.imageUrls[0]);
  
  if (!primaryImageUrl) {
    console.error(`❌ [FB-POST] Article ${article.id} has no image, skipping Facebook post`);
    return null;
  }
  
  console.log(`📘 [FB-POST] Using image: ${primaryImageUrl}`);

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
    console.log(`📘 [FB-POST] Token length: ${FB_PAGE_ACCESS_TOKEN.length} characters`);

    let postId: string;

    // Check if article has multiple images
    const imageUrls = article.imageUrls && article.imageUrls.length > 0 
      ? article.imageUrls 
      : (article.imageUrl ? [article.imageUrl] : []);
    
    if (imageUrls.length > 1) {
      // MULTI-IMAGE POST: Upload photos unpublished, then create grid post
      console.log(`📘 [FB-POST] Creating multi-image grid post with ${imageUrls.length} images...`);
      
      const photoIds: string[] = [];
      const successfulImageUrls: string[] = []; // Track which image URLs uploaded successfully
      
      // Step 2a: Upload each photo with published=false
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        console.log(`📘 [FB-POST] Uploading image ${i + 1}/${imageUrls.length}: ${imageUrl}`);
        
        const uploadResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: imageUrl,
            published: false,
            access_token: FB_PAGE_ACCESS_TOKEN,
          }),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`❌ [FB-POST] Failed to upload image ${i + 1}:`, errorText);
          // Continue with other images rather than failing completely
          continue;
        }

        const uploadData = await uploadResponse.json() as { id: string };
        photoIds.push(uploadData.id);
        successfulImageUrls.push(imageUrl); // Track this successful upload
        console.log(`✅ [FB-POST] Uploaded image ${i + 1}, photo ID: ${uploadData.id}`);
      }

      // Determine best fallback image URL: use a successfully uploaded image if available
      const fallbackImageUrl = successfulImageUrls.length > 0 
        ? successfulImageUrls[0]  // Use first successfully uploaded image
        : primaryImageUrl;         // Fallback to primary if all uploads failed

      // Fallback: If only 1 photo was successfully uploaded, or if upload failed completely,
      // fall back to single-image posting
      if (photoIds.length === 0) {
        console.warn("⚠️  [FB-POST] Multi-image upload failed completely, falling back to single-image post");
      } else if (photoIds.length === 1) {
        console.warn("⚠️  [FB-POST] Only 1 image uploaded successfully, falling back to single-image post");
      }
      
      if (photoIds.length <= 1) {
        // FALLBACK: Use single-image posting with a known-good image URL
        console.log(`📘 [FB-POST] Falling back to single-image post: ${fallbackImageUrl}`);
        
        const photoResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: fallbackImageUrl,
            message: postMessage,
            access_token: FB_PAGE_ACCESS_TOKEN,
          }),
        });

        if (!photoResponse.ok) {
          const errorText = await photoResponse.text();
          console.error("❌ [FB-POST] Fallback single-image post also failed:");
          console.error(`❌ [FB-POST] Status: ${photoResponse.status}`);
          console.error(`❌ [FB-POST] Response: ${errorText}`);
          
          await storage.releaseFacebookPostLock(article.id, lockToken);
          return null;
        }

        const photoData = await photoResponse.json() as FacebookPostResponse;
        postId = photoData.post_id || photoData.id;
        console.log(`✅ [FB-POST] Fallback single-image post succeeded, ID: ${postId}`);
        
      } else {
        // MULTI-IMAGE: Create feed post with attached_media
        console.log(`✅ [FB-POST] Successfully uploaded ${photoIds.length} photos, creating grid post...`);

        const feedParams = new URLSearchParams({
          message: postMessage,
          access_token: FB_PAGE_ACCESS_TOKEN,
        });

        // Add attached_media parameters
        photoIds.forEach((photoId, index) => {
          feedParams.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: photoId }));
        });

        const feedResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/feed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: feedParams.toString(),
        });

        if (!feedResponse.ok) {
          const errorText = await feedResponse.text();
          console.error("❌ [FB-POST] Multi-image feed post failed, falling back to single-image:");
          console.error(`❌ [FB-POST] Status: ${feedResponse.status}`);
          console.error(`❌ [FB-POST] Response: ${errorText}`);
          
          // FALLBACK: Try single-image posting with a known-good image URL
          console.log(`📘 [FB-POST] Attempting fallback to single-image post with: ${fallbackImageUrl}`);
          
          const photoResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: fallbackImageUrl,
              message: postMessage,
              access_token: FB_PAGE_ACCESS_TOKEN,
            }),
          });

          if (!photoResponse.ok) {
            const fallbackErrorText = await photoResponse.text();
            console.error("❌ [FB-POST] Fallback single-image post also failed:");
            console.error(`❌ [FB-POST] Status: ${photoResponse.status}`);
            console.error(`❌ [FB-POST] Response: ${fallbackErrorText}`);
            
            await storage.releaseFacebookPostLock(article.id, lockToken);
            return null;
          }

          const photoData = await photoResponse.json() as FacebookPostResponse;
          postId = photoData.post_id || photoData.id;
          console.log(`✅ [FB-POST] Fallback single-image post succeeded, ID: ${postId}`);
          
        } else {
          const feedData = await feedResponse.json() as FacebookPostResponse;
          postId = feedData.id;
          console.log(`✅ [FB-POST] Created multi-image grid post, ID: ${postId}`);
        }
      }
      
    } else {
      // SINGLE IMAGE POST: Use simple photo upload
      console.log(`📘 [FB-POST] Creating single-image post: ${primaryImageUrl}`);
      
      const photoResponse = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/photos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: primaryImageUrl,
          message: postMessage,
          access_token: FB_PAGE_ACCESS_TOKEN,
        }),
      });

      if (!photoResponse.ok) {
        const errorText = await photoResponse.text();
        console.error("❌ [FB-POST] Facebook photo post failed:");
        console.error(`❌ [FB-POST] Status: ${photoResponse.status}`);
        console.error(`❌ [FB-POST] Response: ${errorText}`);
        
        await storage.releaseFacebookPostLock(article.id, lockToken);
        return null;
      }

      const photoData = await photoResponse.json() as FacebookPostResponse;
      postId = photoData.post_id || photoData.id;
      console.log(`✅ [FB-POST] Created single-image photo post, ID: ${postId}`);
    }
    
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
