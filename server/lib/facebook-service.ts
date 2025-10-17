import type { Article } from "@shared/schema";

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
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://phuketradar.com";
  
  return `${baseUrl}/article/${article.slug || article.id}`;
}

export async function postArticleToFacebook(article: Article): Promise<{ postId: string; postUrl: string } | null> {
  console.log(`📘 Attempting to post article to Facebook: ${article.title.substring(0, 60)}...`);
  
  if (!FB_PAGE_ACCESS_TOKEN) {
    console.error("❌ FB_PAGE_ACCESS_TOKEN not configured");
    return null;
  }

  if (!article.imageUrl) {
    console.error(`❌ Article ${article.id} has no image, skipping Facebook post`);
    return null;
  }

  try {
    const hashtags = generateHashtags(article.category);
    const articleUrl = getArticleUrl(article);
    
    // Post message: title + excerpt + hashtags
    const postMessage = `${article.title}\n\n${article.excerpt}\n\n${hashtags}`;

    console.log(`📘 Posting to Facebook API...`);
    console.log(`   Page ID: ${FB_PAGE_ID}`);
    console.log(`   Image URL: ${article.imageUrl}`);
    console.log(`   Token length: ${FB_PAGE_ACCESS_TOKEN.length} characters`);

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

    console.log(`📘 Facebook API response status: ${photoResponse.status}`);

    if (!photoResponse.ok) {
      const errorText = await photoResponse.text();
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch {
        // Error is not JSON, use text as-is
      }
      console.error("❌ Facebook photo post failed:");
      console.error(`   Status: ${photoResponse.status} ${photoResponse.statusText}`);
      console.error(`   Response: ${errorDetails}`);
      return null;
    }

    const photoData = await photoResponse.json() as FacebookPostResponse;
    const postId = photoData.post_id || photoData.id;
    
    console.log(`✅ Posted to Facebook: ${postId}`);

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
      console.log(`✅ Added comment to post: ${commentData.id}`);
    } else {
      const commentError = await commentResponse.text();
      console.warn(`⚠️  Failed to add comment to Facebook post (status ${commentResponse.status}): ${commentError}`);
    }

    // Generate Facebook post URL
    const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

    return {
      postId,
      postUrl,
    };
  } catch (error) {
    console.error("Error posting to Facebook:", error);
    return null;
  }
}
