import { db } from "../server/db";
import { articles } from "../shared/schema";
import { eq, isNull, or } from "drizzle-orm";

/**
 * Extract canonical Facebook post ID from URL
 * Returns numeric ID if available (most reliable), otherwise pfbid, otherwise null
 */
function extractFacebookPostId(url: string): string | null {
  try {
    // PRIORITY 1: Try to extract numeric ID from URL (most reliable)
    const numericMatch = url.match(/\/posts\/(\d+)/);
    if (numericMatch) {
      return numericMatch[1];
    }
    
    // PRIORITY 2: Try to extract pfbid from URL
    const pfbidMatch = url.match(/\/posts\/(pfbid[\w]+)/);
    if (pfbidMatch) {
      return pfbidMatch[1];
    }
    
    // No ID found
    return null;
  } catch (error) {
    console.error("Error extracting Facebook post ID:", error);
    return null;
  }
}

async function backfillFacebookPostIds() {
  try {
    console.log("🔄 Starting backfill of facebook_post_id field...\n");
    
    // Get all articles with null or empty facebookPostId
    const articlesWithoutPostId = await db
      .select()
      .from(articles)
      .where(or(
        isNull(articles.facebookPostId),
        eq(articles.facebookPostId, "")
      ));
    
    console.log(`Found ${articlesWithoutPostId.length} articles without facebook_post_id\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const article of articlesWithoutPostId) {
      try {
        const facebookPostId = extractFacebookPostId(article.sourceUrl);
        
        if (facebookPostId) {
          await db
            .update(articles)
            .set({ facebookPostId })
            .where(eq(articles.id, article.id));
          
          updatedCount++;
          console.log(`✅ Updated article ${article.id}`);
          console.log(`   Title: ${article.title.substring(0, 60)}...`);
          console.log(`   Source: ${article.sourceUrl}`);
          console.log(`   Extracted ID: ${facebookPostId}\n`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped article ${article.id} (couldn't extract ID)`);
          console.log(`   Title: ${article.title.substring(0, 60)}...`);
          console.log(`   Source: ${article.sourceUrl}\n`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error updating article ${article.id}:`, error.message);
        console.error(`   Title: ${article.title.substring(0, 60)}...`);
        
        // Check if it's a unique constraint violation
        if (error.code === '23505') {
          console.error(`   ⚠️  Duplicate facebook_post_id detected - this article may be a duplicate\n`);
        } else {
          console.error(`\n`);
        }
      }
    }
    
    console.log("=== Backfill Complete ===");
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Fatal error during backfill:", error);
    process.exit(1);
  }
}

backfillFacebookPostIds();
