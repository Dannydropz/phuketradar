import { db } from "../server/db";
import { articles } from "../shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { StorageService } from "../server/services/storage";
import { getTimelineService } from "../server/services/timeline-service";

async function testAutoMatch() {
    console.log("🧪 Testing Timeline Auto-Match on Existing Articles\n");

    const storage = new StorageService(db);
    const timelineService = getTimelineService(storage);

    // Find the flood articles mentioned by user
    const floodArticles = await db
        .select()
        .from(articles)
        .where(eq(articles.isPublished, true))
        .limit(50);

    const testArticles = floodArticles.filter(a =>
        a.title.toLowerCase().includes('flood') ||
        a.title.toLowerCase().includes('hat yai')
    ).slice(0, 5);

    console.log(`Found ${testArticles.length} test articles:\n`);

    for (const article of testArticles) {
        console.log(`\n📄 Testing: ${article.title}`);
        console.log(`   ID: ${article.id}`);
        console.log(`   Already in timeline: ${article.seriesId ? 'YES' : 'NO'}`);

        try {
            const matchingSeriesId = await timelineService.findMatchingTimeline(article);

            if (matchingSeriesId) {
                console.log(`   ✅ MATCH FOUND: ${matchingSeriesId}`);
                console.log(`   Action: Would add to timeline and flag for review`);
            } else {
                console.log(`   ❌ NO MATCH: Auto-match did not find a matching timeline`);

                // Debug: Check what timelines exist
                const allTimelines = await db
                    .select()
                    .from(articles)
                    .where(
                        and(
                            eq(articles.isParentStory, true),
                            eq(articles.autoMatchEnabled, true),
                            isNotNull(articles.seriesId)
                        )
                    );

                console.log(`   Debug: Found ${allTimelines.length} active timeline(s) with auto-match enabled`);

                for (const timeline of allTimelines) {
                    console.log(`      - "${timeline.storySeriesTitle}"`);
                    console.log(`        Tags: ${timeline.timelineTags?.join(', ') || 'NONE'}`);
                    console.log(`        Auto-match: ${timeline.autoMatchEnabled}`);

                    // Manual check
                    if (timeline.timelineTags && timeline.timelineTags.length > 0) {
                        const titleLower = article.title.toLowerCase();
                        const contentLower = article.content.toLowerCase();

                        const matches = timeline.timelineTags.filter(tag => {
                            const tagLower = tag.toLowerCase();
                            return titleLower.includes(tagLower) || contentLower.includes(tagLower);
                        });

                        if (matches.length > 0) {
                            console.log(`        ⚠️  MANUAL CHECK: This article SHOULD match tags: ${matches.join(', ')}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`   ❌ ERROR:`, error);
        }
    }

    process.exit(0);
}

testAutoMatch().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
