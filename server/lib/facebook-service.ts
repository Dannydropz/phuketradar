import type { Article } from "@shared/schema";

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_PAGE_ID = "465112903371369"; // Phuket Radar page ID (extracted from facebook.com/phuketradar/)

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
  if (!FB_PAGE_ACCESS_TOKEN) {
    console.error("FB_PAGE_ACCESS_TOKEN not configured");
    return null;
  }

  if (!article.imageUrl) {
    console.error(`Article ${article.id} has no image, skipping Facebook post`);
    return null;
  }

  try {
    const hashtags = generateHashtags(article.category);
    const articleUrl = getArticleUrl(article);
    
    // Post message: title + excerpt + hashtags
    const postMessage = `${article.title}\n\n${article.excerpt}\n\n${hashtags}`;

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

    if (!photoResponse.ok) {
      const error = await photoResponse.text();
      console.error("Facebook photo post failed:", error);
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
      console.warn("Failed to add comment to Facebook post");
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
