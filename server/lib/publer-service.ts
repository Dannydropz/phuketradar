import type { Article } from "@shared/schema";
import type { IStorage } from "../storage";
import { buildArticleUrl } from "@shared/category-map";

const PUBLER_API_KEY = process.env.PUBLER_API_KEY;
const PUBLER_WORKSPACE_ID = process.env.PUBLER_WORKSPACE_ID;
const PUBLER_INSTAGRAM_ACCOUNT_ID = process.env.PUBLER_INSTAGRAM_ACCOUNT_ID;
const PUBLER_THREADS_ACCOUNT_ID = process.env.PUBLER_THREADS_ACCOUNT_ID;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to convert WebP to JPG for Publer (Cloudinary specific)
const convertToJpg = (url: string) => {
  if (url && url.includes('cloudinary.com') && url.endsWith('.webp')) {
    return url.replace('/upload/', '/upload/f_jpg/').replace('.webp', '.jpg');
  }
  return url;
};

export async function postArticleToPubler(
  article: Article,
  storage: IStorage
): Promise<{ status: 'posted' | 'already-posted'; postId: string; postUrl: string } | null> {

  console.log(`🚀 [PUBLER-POST] Starting Publer post attempt for article: ${article.title.substring(0, 60)}...`);

  if (!PUBLER_API_KEY || !PUBLER_WORKSPACE_ID) {
    console.error("❌ [PUBLER-POST] Publer credentials not configured");
    return null;
  }

  // 1. Get image URLs
  let imageUrls: string[] = [];
  if (article.imageUrls && Array.isArray(article.imageUrls) && article.imageUrls.length > 0) {
    imageUrls = article.imageUrls.slice(0, 10).map(convertToJpg);
  } else if (article.imageUrl) {
    imageUrls = [convertToJpg(article.imageUrl)];
  }

  if (imageUrls.length === 0) {
    console.error(`❌ [PUBLER-POST] No images available for article ${article.id}`);
    return null;
  }

  // 2. Prepare content
  const baseUrl = "https://phuketradar.com";
  const articlePath = buildArticleUrl({ category: article.category, slug: article.slug, id: article.id });
  const directUrl = `${baseUrl}${articlePath}`;
  const threadsUrl = article.switchyShortUrl || directUrl;
  const headline = article.facebookHeadline || article.title;

  const instagramCaption = `${headline}\n\n${article.excerpt}\n\n📰 Tap the link in Bio for the full story\n\n#Phuket #PhuketNews #Thailand #PhuketLife`;
  const threadsText = `${headline}\n\n📰 ${threadsUrl}\n\n#Phuket #PhuketNews`;

  const headers = {
    'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
    'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
    'Content-Type': 'application/json'
  };

  // STEP 1: CLAIM - Acquire exclusive lock before making external API call
  const lockToken = `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`🔒 [PUBLER-POST] Attempting to claim article for posting...`);

  const claimed = await storage.claimArticleForInstagramPosting(article.id, lockToken);

  if (!claimed) {
    console.log(`⏭️  [PUBLER-POST] Could not claim article - already posted or being posted`);
    return null;
  }

  try {
    // STEP 2: Upload all media
    console.log(`📸 [PUBLER-POST] Uploading ${imageUrls.length} images...`);
    const uploadRes = await fetch('https://app.publer.com/api/v1/media/from-url', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        media: imageUrls.map((url, i) => ({
          url,
          name: `phuket-radar-news-${article.id}-${i}`,
          type: 'image',
          in_library: false
        }))
      })
    });

    if (!uploadRes.ok) {
      console.error(`❌ [PUBLER-POST] Media upload failed: ${await uploadRes.text()}`);
      return null;
    }

    const uploadData = await uploadRes.json();
    const jobId = uploadData.job_id;
    console.log(`⏳ [PUBLER-POST] Media upload job started: ${jobId}`);

    // Poll for upload completion
    let mediaIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      await sleep(2000);
      const statusRes = await fetch(`https://app.publer.com/api/v1/job_status/${jobId}`, { headers });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status === 'complete' && statusData.payload?.length > 0) {
          mediaIds = statusData.payload.map((p: any) => p.id).filter(Boolean);
          if (mediaIds.length === imageUrls.length) break;
        }
      }
    }

    if (mediaIds.length === 0) {
      console.error(`❌ [PUBLER-POST] Media processing timed out or failed`);
      return null;
    }
    console.log(`✅ [PUBLER-POST] Media ready: ${mediaIds.join(', ')}`);

    const postType = mediaIds.length > 1 ? 'carousel' : 'photo';

    // STEP 2: Post to Instagram
    console.log(`📸 [PUBLER-POST] Publishing to Instagram...`);
    const igRes = await fetch('https://app.publer.com/api/v1/posts/schedule/publish', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bulk: {
          state: 'publish',
          posts: [{
            networks: {
              instagram: {
                type: postType,
                text: instagramCaption,
                media: mediaIds.map(id => ({ id }))
              }
            },
            accounts: [{ id: PUBLER_INSTAGRAM_ACCOUNT_ID }]
          }]
        }
      })
    });

    if (!igRes.ok) {
      console.error(`❌ [PUBLER-POST] Instagram publish failed: ${await igRes.text()}`);
      return null;
    }

    const igData = await igRes.json();
    const igJobId = igData.job_id;

    // STEP 3: Post to Threads
    console.log(`🧵 [PUBLER-POST] Publishing to Threads...`);
    const thRes = await fetch('https://app.publer.com/api/v1/posts/schedule/publish', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bulk: {
          state: 'publish',
          posts: [{
            networks: {
              threads: {
                type: postType,
                text: threadsText,
                media: mediaIds.map(id => ({ id }))
              }
            },
            accounts: [{ id: PUBLER_THREADS_ACCOUNT_ID }]
          }]
        }
      })
    });

    if (!thRes.ok) {
      console.warn(`⚠️ [PUBLER-POST] Threads publish failed, but IG might still be processing: ${await thRes.text()}`);
    }

    // Polling for IG ID to store in DB
    let igPostId = igJobId;
    for (let i = 0; i < 15; i++) {
      await sleep(2000);
      const jobRes = await fetch(`https://app.publer.com/api/v1/job_status/${igJobId}`, { headers });
      if (jobRes.ok) {
        const jobData = await jobRes.json();
        if (jobData.status === 'complete') {
          igPostId = jobData.payload?.[0]?.post?.id || igJobId;
          break;
        }
      }
    }

    const postUrl = `https://www.instagram.com/reels/`; // Generic fallback since Publer doesn't always return URL immediately

    // Update DB
    await storage.updateArticleInstagramPost(article.id, igPostId, postUrl, lockToken);
    console.log(`✅ [PUBLER-POST] Success! Post ID: ${igPostId}`);

    return {
      status: 'posted',
      postId: igPostId,
      postUrl: postUrl
    };

  } catch (error) {
    console.error(`❌ [PUBLER-POST] Unexpected error:`, error);
    // Release the lock on failure so we can try again
    await storage.releaseInstagramPostLock(article.id, lockToken);
    return null;
  }
}
