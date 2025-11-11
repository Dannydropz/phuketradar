import type { Article } from "@shared/schema";
import type { IStorage } from "../storage";
import { buildArticleUrl } from "@shared/category-map";

const META_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN; // Same token works for Threads
const THREADS_USER_ID = process.env.THREADS_USER_ID; // Threads User ID

interface ThreadsContainerResponse {
  id: string;
}

interface ThreadsPublishResponse {
  id: string;
}

interface ThreadsReplyResponse {
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

export async function postArticleToThreads(
  article: Article,
  storage: IStorage
): Promise<{ status: 'posted' | 'already-posted'; postId: string; postUrl: string } | null> {
  
  // CRITICAL: Disable all Threads posting in development environment
  if (process.env.NODE_ENV === "development") {
    console.log(`🚫 [THREADS-POST] Threads posting DISABLED in development environment`);
    console.log(`🧵 [THREADS-POST] Article: ${article.title.substring(0, 60)}... (would post in production)`);
    return null;
  }
  
  console.log(`🧵 [THREADS-POST] Starting Threads post attempt for article: ${article.title.substring(0, 60)}...`);
  console.log(`🧵 [THREADS-POST] Article ID: ${article.id}`);
  
  if (!META_ACCESS_TOKEN) {
    console.error("❌ [THREADS-POST] META_ACCESS_TOKEN not configured");
    return null;
  }

  if (!THREADS_USER_ID) {
    console.error("❌ [THREADS-POST] THREADS_USER_ID not configured");
    return null;
  }

  // STEP 1: CLAIM - Acquire exclusive lock before making external API call
  const lockToken = `${article.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`🔒 [THREADS-POST] Attempting to claim article for posting (lockToken: ${lockToken.substring(0, 40)}...)...`);
  
  const claimed = await storage.claimArticleForThreadsPosting(article.id, lockToken);
  
  if (!claimed) {
    console.log(`⏭️  [THREADS-POST] Could not claim article - already posted or being posted by another process`);
    
    const freshArticle = await storage.getArticleById(article.id);
    if (freshArticle?.threadsPostId && !freshArticle.threadsPostId.startsWith('THREADS-LOCK:')) {
      console.log(`✅ [THREADS-POST] Article already posted (status: already-posted)`);
      console.log(`🧵 [THREADS-POST] Post ID: ${freshArticle.threadsPostId}`);
      return {
        status: 'already-posted',
        postId: freshArticle.threadsPostId,
        postUrl: freshArticle.threadsPostUrl || `https://www.threads.net/@phuketradar/post/${freshArticle.threadsPostId}`,
      };
    }
    
    console.log(`⚠️  [THREADS-POST] Article is locked by another process - skipping`);
    return null;
  }
  
  console.log(`✅ [THREADS-POST] Successfully claimed article - proceeding with Threads API call...`);

  try {
    const hashtags = generateHashtags(article.category);
    const articleUrl = getArticleUrl(article);
    
    // STEP 2: CREATE THREADS CONTAINER
    // Threads requires a two-step process: create container, then publish
    // Include article link in main text since Threads supports links in posts
    const threadText = `${article.title}\n\n${article.excerpt}\n\nRead the full story: ${articleUrl}\n\n${hashtags}`;

    console.log(`🧵 [THREADS-POST] Creating threads container...`);
    console.log(`🧵 [THREADS-POST] User ID: ${THREADS_USER_ID}`);

    // Get the primary image URL (optional for Threads - can post text-only)
    const primaryImageUrl = article.imageUrl || (article.imageUrls && article.imageUrls[0]);
    
    const containerPayload: any = {
      text: threadText,
      access_token: META_ACCESS_TOKEN,
    };

    // Add image if available
    if (primaryImageUrl) {
      containerPayload.media_type = "IMAGE";
      containerPayload.image_url = primaryImageUrl;
      console.log(`🧵 [THREADS-POST] Including image: ${primaryImageUrl}`);
    } else {
      containerPayload.media_type = "TEXT";
      console.log(`🧵 [THREADS-POST] Text-only post (no image available)`);
    }

    // Create threads container
    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(containerPayload),
      }
    );

    if (!containerResponse.ok) {
      const errorText = await containerResponse.text();
      console.error("❌ [THREADS-POST] Failed to create threads container:");
      console.error(`❌ [THREADS-POST] Status: ${containerResponse.status}`);
      console.error(`❌ [THREADS-POST] Response: ${errorText}`);
      
      await storage.releaseThreadsPostLock(article.id, lockToken);
      return null;
    }

    const containerData = await containerResponse.json() as ThreadsContainerResponse;
    const containerId = containerData.id;
    console.log(`✅ [THREADS-POST] Created threads container: ${containerId}`);

    // Wait a moment for Threads to process the media (if image present)
    if (primaryImageUrl) {
      console.log(`🧵 [THREADS-POST] Waiting 3 seconds for media processing...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // STEP 3: PUBLISH THE THREAD
    console.log(`🧵 [THREADS-POST] Publishing thread...`);
    
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`,
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
      console.error("❌ [THREADS-POST] Failed to publish thread:");
      console.error(`❌ [THREADS-POST] Status: ${publishResponse.status}`);
      console.error(`❌ [THREADS-POST] Response: ${errorText}`);
      
      await storage.releaseThreadsPostLock(article.id, lockToken);
      return null;
    }

    const publishData = await publishResponse.json() as ThreadsPublishResponse;
    const threadId = publishData.id;
    console.log(`✅ [THREADS-POST] Published to Threads! Thread ID: ${threadId}`);

    // STEP 4: ADD REPLY WITH ARTICLE LINK (OPTIONAL - link already in main post)
    // Threads supports replies (comments), but since we already included the link in the main post,
    // we can skip this or add an additional call-to-action reply
    console.log(`🧵 [THREADS-POST] Link included in main post - skipping reply`);
    
    // Optional: Add a reply with call-to-action (uncomment if desired)
    /*
    const replyResponse = await fetch(
      `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_type: "TEXT",
          text: `👆 Tap the link above to read the full story on PhuketRadar.com`,
          reply_to_id: threadId,
          access_token: META_ACCESS_TOKEN,
        }),
      }
    );

    if (replyResponse.ok) {
      const replyContainerData = await replyResponse.json() as ThreadsContainerResponse;
      // Publish the reply
      await fetch(
        `https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creation_id: replyContainerData.id,
            access_token: META_ACCESS_TOKEN,
          }),
        }
      );
      console.log(`✅ [THREADS-POST] Added reply to thread`);
    }
    */

    // STEP 5: UPDATE DATABASE - Replace lock with actual post ID
    const postUrl = `https://www.threads.net/@phuketradar/post/${threadId}`;
    console.log(`🧵 [THREADS-POST] Updating database with post ID and URL...`);
    
    await storage.updateArticleThreadsPost(article.id, threadId, postUrl, lockToken);
    console.log(`✅ [THREADS-POST] Database updated successfully!`);
    console.log(`🧵 [THREADS-POST] Post URL: ${postUrl}`);

    return {
      status: 'posted',
      postId: threadId,
      postUrl: postUrl,
    };

  } catch (error) {
    console.error("❌ [THREADS-POST] Unexpected error during Threads posting:", error);
    
    // Release the lock on error
    try {
      await storage.releaseThreadsPostLock(article.id, lockToken);
    } catch (releaseError) {
      console.error("❌ [THREADS-POST] Failed to release lock after error:", releaseError);
    }
    
    return null;
  }
}
