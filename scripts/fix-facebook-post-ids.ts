import { db } from "../server/db";
import { articles } from "../shared/schema";
import { eq, isNotNull, sql } from "drizzle-orm";

/**
 * CORRECTED extraction logic - always prefers numeric ID over pfbid
 */
function extractFacebookPostIdCorrected(url: string, currentId: string | null): string | null {
  try {
    // Step 1: Check if current ID is already numeric - keep it!
    if (currentId && /^\d+$/.test(currentId)) {
      return currentId;
    }
    
    // Step 2: Look for numeric ID in URL (most reliable)
    const numericMatch = url.match(/\/posts\/(\d+)/);
    if (numericMatch) {
      return numericMatch[1];
    }
    
    // Step 3: Keep pfbid from current ID if no numeric found
    if (currentId && currentId.startsWith('pfbid')) {
      return currentId;
    }
    
    // Step 4: Extract pfbid from URL as fallback
    const pfbidMatch = url.match(/\/posts\/(pfbid[\w]+)/);
    if (pfbidMatch) {
      return pfbidMatch[1];
    }
    
    // Keep whatever ID we have
    return currentId;
  } catch (error) {
    console.error("Error extracting Facebook post ID:", error);
    return currentId;
  }
}

async function fixFacebookPostIds() {
  try {
    console.log("🔧 Fixing facebook_post_id values with corrected extraction logic...\n");
    
    // Get all articles with facebook_post_id
    const allArticles = await db
      .select()
      .from(articles)
      .where(isNotNull(articles.facebookPostId));
    
    console.log(`Found ${allArticles.length} articles with facebook_post_id\n`);
    
    let updatedCount = 0;
    let unchangedCount = 0;
    
    for (const article of allArticles) {
      const correctId = extractFacebookPostIdCorrected(article.sourceUrl, article.facebookPostId);
      
      if (correctId && correctId !== article.facebookPostId) {
        console.log(`🔄 Correcting article ${article.id}`);
        console.log(`   Title: ${article.title.substring(0, 60)}...`);
        console.log(`   Old ID: ${article.facebookPostId}`);
        console.log(`   New ID: ${correctId}`);
        console.log(`   Source: ${article.sourceUrl}\n`);
        
        try {
          await db
            .update(articles)
            .set({ facebookPostId: correctId })
            .where(eq(articles.id, article.id));
          
          updatedCount++;
        } catch (error: any) {
          if (error.code === '23505') {
            console.error(`   ❌ DUPLICATE DETECTED! This article is a duplicate of an existing article with ID: ${correctId}`);
            console.error(`   Consider deleting article ${article.id}\n`);
          } else {
            throw error;
          }
        }
      } else {
        unchangedCount++;
      }
    }
    
    console.log("=== Fix Complete ===");
    console.log(`Updated: ${updatedCount}`);
    console.log(`Unchanged: ${unchangedCount}`);
    
    // Check for any remaining duplicates
    console.log("\n🔍 Checking for duplicate facebook_post_id values...");
    const duplicates = await db.execute(sql`
      SELECT facebook_post_id, COUNT(*) as count, array_agg(id) as article_ids
      FROM ${articles}
      WHERE facebook_post_id IS NOT NULL
      GROUP BY facebook_post_id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.rows.length} duplicate facebook_post_id values:`);
      for (const dup of duplicates.rows as any[]) {
        console.log(`   Post ID: ${dup.facebook_post_id}`);
        console.log(`   Count: ${dup.count}`);
        console.log(`   Article IDs: ${dup.article_ids}`);
      }
      console.log("\n💡 Run cleanup-duplicates.ts to remove duplicates");
    } else {
      console.log("✅ No duplicate facebook_post_id values found!");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Fatal error during fix:", error);
    process.exit(1);
  }
}

fixFacebookPostIds();
