#!/usr/bin/env tsx

/**
 * Test the reel enrichment fix
 * 
 * This tests that reels from the page feed now get their thumbnails enriched
 */

import "dotenv/config";
import { scraperService } from "../server/services/scraper";

const PAGE_URL = "https://www.facebook.com/NewshawkPhuket";

async function testReelEnrichment() {
    console.log("🧪 TESTING REEL ENRICHMENT FIX");
    console.log("===============================\n");
    console.log(`Scraping page: ${PAGE_URL}\n`);

    try {
        // Use the pagination scraper which now includes enrichment
        const posts = await scraperService.scrapeFacebookPageWithPagination(
            PAGE_URL,
            1, // Just 1 page
            async (url) => false // Don't skip any as duplicates for testing
        );

        console.log("\n" + "=".repeat(60));
        console.log("📊 RESULTS");
        console.log("=".repeat(60));
        console.log(`Total posts scraped: ${posts.length}\n`);

        // Check each post for video/reel data
        let reelCount = 0;
        let reelsWithThumbnail = 0;
        let reelsWithoutThumbnail = 0;

        for (const post of posts) {
            const isReel = post.sourceUrl.includes('/reel/') || post.sourceUrl.includes('/reels/');

            console.log(`\n📰 Post: ${post.title.substring(0, 50)}...`);
            console.log(`   URL: ${post.sourceUrl}`);
            console.log(`   Is Video: ${post.isVideo}`);
            console.log(`   Is Reel: ${isReel}`);
            console.log(`   Has Thumbnail: ${!!post.videoThumbnail}`);
            console.log(`   Has Image: ${!!post.imageUrl}`);
            console.log(`   Video URL: ${post.videoUrl ? 'Yes' : 'No'}`);

            if (isReel) {
                reelCount++;
                if (post.videoThumbnail || post.imageUrl) {
                    reelsWithThumbnail++;
                    console.log(`   ✅ Reel has thumbnail/image!`);
                } else {
                    reelsWithoutThumbnail++;
                    console.log(`   ❌ Reel is MISSING thumbnail/image!`);
                }
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log("📈 SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total posts: ${posts.length}`);
        console.log(`Total reels: ${reelCount}`);
        console.log(`Reels with thumbnail: ${reelsWithThumbnail} ✅`);
        console.log(`Reels without thumbnail: ${reelsWithoutThumbnail} ${reelsWithoutThumbnail > 0 ? '❌' : ''}`);

        if (reelsWithoutThumbnail === 0 && reelCount > 0) {
            console.log("\n🎉 SUCCESS: All reels have thumbnails!");
            console.log("   These reels will now pass the image check and be imported.");
        } else if (reelsWithoutThumbnail > 0) {
            console.log("\n⚠️ WARNING: Some reels still missing thumbnails");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

testReelEnrichment().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
