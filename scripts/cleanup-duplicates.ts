import { db } from "../server/db";
import { articles } from "../shared/schema";
import { inArray, sql } from "drizzle-orm";

async function cleanupDuplicates() {
  try {
    console.log("🔍 Finding duplicate articles by title...\n");
    
    // Find all duplicate titles with their article IDs
    const duplicates = await db.execute(sql`
      SELECT 
        title, 
        COUNT(*) as count,
        array_agg(id ORDER BY published_at) as article_ids,
        array_agg(source_url ORDER BY published_at) as urls,
        array_agg(facebook_post_id ORDER BY published_at) as post_ids
      FROM ${articles}
      GROUP BY title 
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);
    
    console.log(`Found ${duplicates.rows.length} duplicate article sets\n`);
    
    if (duplicates.rows.length === 0) {
      console.log("✅ No duplicates found! Database is clean.");
      process.exit(0);
    }
    
    let totalDeleted = 0;
    
    for (const dup of duplicates.rows as any[]) {
      console.log(`\n📋 Duplicate Set: ${dup.title.substring(0, 80)}...`);
      console.log(`   Count: ${dup.count}`);
      
      const articleIds = dup.article_ids;
      const urls = dup.urls;
      const postIds = dup.post_ids;
      
      // Keep the first article (earliest by published_at) and delete the rest
      const keepId = articleIds[0];
      const deleteIds = articleIds.slice(1);
      
      console.log(`   ✅ Keeping: ${keepId}`);
      console.log(`      URL: ${urls[0]}`);
      console.log(`      Post ID: ${postIds[0]}`);
      
      for (let i = 0; i < deleteIds.length; i++) {
        console.log(`   ❌ Deleting: ${deleteIds[i]}`);
        console.log(`      URL: ${urls[i + 1]}`);
        console.log(`      Post ID: ${postIds[i + 1]}`);
      }
      
      if (deleteIds.length > 0) {
        await db
          .delete(articles)
          .where(inArray(articles.id, deleteIds));
        
        totalDeleted += deleteIds.length;
        console.log(`   ✅ Deleted ${deleteIds.length} duplicate(s)`);
      }
    }
    
    console.log("\n=== Cleanup Complete ===");
    console.log(`Total duplicates deleted: ${totalDeleted}`);
    console.log(`Duplicate sets resolved: ${duplicates.rows.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Fatal error during cleanup:", error);
    process.exit(1);
  }
}

cleanupDuplicates();
