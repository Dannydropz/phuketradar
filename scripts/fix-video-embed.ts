/**
 * URGENT FIX: Clear facebookEmbedUrl for a specific article
 * This fixes the "Video Unavailable" error for photo-only posts
 * 
 * Run with: npx tsx scripts/fix-video-embed.ts
 */

import { db } from "../server/db";
import { articles } from "../shared/schema";
import { sql, like } from "drizzle-orm";

async function fixVideoEmbed() {
    console.log("🔧 URGENT FIX: Clearing incorrect facebookEmbedUrl...\n");

    // Find articles with facebookEmbedUrl that contains /posts/ (not video URLs)
    // These are incorrectly set and cause "Video Unavailable" errors
    const brokenArticles = await db
        .select({
            id: articles.id,
            title: articles.title,
            facebookEmbedUrl: articles.facebookEmbedUrl,
            sourceUrl: articles.sourceUrl,
        })
        .from(articles)
        .where(sql`${articles.facebookEmbedUrl} IS NOT NULL`);

    console.log(`Found ${brokenArticles.length} articles with facebookEmbedUrl set\n`);

    let fixedCount = 0;
    for (const article of brokenArticles) {
        const embedUrl = article.facebookEmbedUrl || "";

        // Check if the URL is NOT a video URL (should not have facebookEmbedUrl set)
        const isActualVideoUrl =
            embedUrl.includes('/reel/') ||
            embedUrl.includes('/reels/') ||
            embedUrl.includes('/videos/') ||
            embedUrl.includes('/watch');

        if (!isActualVideoUrl) {
            console.log(`❌ Fixing: ${article.title.substring(0, 60)}...`);
            console.log(`   Bad URL: ${embedUrl}`);

            // Clear the facebookEmbedUrl
            await db
                .update(articles)
                .set({ facebookEmbedUrl: null })
                .where(sql`${articles.id} = ${article.id}`);

            fixedCount++;
            console.log(`   ✅ Cleared facebookEmbedUrl\n`);
        } else {
            console.log(`✓ OK: ${article.title.substring(0, 60)}... (valid video URL)`);
        }
    }

    console.log(`\n🎉 Fixed ${fixedCount} articles with incorrect facebookEmbedUrl`);
    process.exit(0);
}

fixVideoEmbed().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
