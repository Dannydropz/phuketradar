import { db } from "../server/db";
import { articles } from "../shared/schema";
import { StorageService } from "../server/services/storage";
import { getTimelineService } from "../server/services/timeline-service";
import { eq } from "drizzle-orm";

async function debugRecentArticle() {
    console.log("🔍 Debugging Auto-Match for Recent Flood Article\n");

    const storage = new StorageService(db);
    const timelineService = getTimelineService(storage);

    // Find the most recent article with "flood" in title
    const recentArticles = await db
        .select()
        .from(articles)
        .where(eq(articles.isPublished, true))
        .limit(100);

    const floodArticle = recentArticles
        .filter(a => a.title.toLowerCase().includes('flood'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!floodArticle) {
        console.log("❌ No recent flood articles found");
        process.exit(1);
    }

    console.log(`📄 Found: "${floodArticle.title}"`);
    console.log(`   ID: ${floodArticle.id}`);
    console.log(`   Created: ${floodArticle.createdAt}`);
    console.log(`   Published: ${floodArticle.isPublished}`);
    console.log(`   In Timeline: ${floodArticle.seriesId || 'NO'}`);
    console.log('');

    // Test auto-match
    console.log('🧪 Running auto-match test...\n');

    try {
        const matchingSeriesId = await timelineService.findMatchingTimeline(floodArticle);

        if (matchingSeriesId) {
            console.log(`✅ MATCH FOUND: ${matchingSeriesId}`);
            console.log(`   This article SHOULD have been auto-matched!`);
            console.log(`   Recommendation: Check Railway logs for errors during scraping`);
        } else {
            console.log(`❌ NO MATCH FOUND`);
            console.log(`   The auto-match logic did NOT find a matching timeline`);
            console.log('');
            console.log('🔍 Debugging why no match...\n');

            // Get active timelines
            const { and, isNotNull } = await import("drizzle-orm");
            const activeTimelines = await db
                .select()
                .from(articles)
                .where(
                    and(
                        eq(articles.isParentStory, true),
                        eq(articles.autoMatchEnabled, true),
                        isNotNull(articles.seriesId)
                    )
                );

            console.log(`   Active timelines with auto-match: ${activeTimelines.length}`);

            for (const timeline of activeTimelines) {
                console.log(`\n   Timeline: "${timeline.storySeriesTitle}"`);
                console.log(`      Series ID: ${timeline.seriesId}`);
                console.log(`      Auto-match enabled: ${timeline.autoMatchEnabled}`);
                console.log(`      Tags: ${timeline.timelineTags?.join(', ') || 'NONE'}`);

                if (timeline.timelineTags && timeline.timelineTags.length > 0) {
                    const titleLower = floodArticle.title.toLowerCase();
                    const contentLower = floodArticle.content.toLowerCase();

                    console.log(`\n      Testing each tag:`);
                    for (const tag of timeline.timelineTags) {
                        const tagLower = tag.toLowerCase();
                        const inTitle = titleLower.includes(tagLower);
                        const inContent = contentLower.includes(tagLower);

                        console.log(`         "${tag}": ${inTitle || inContent ? '✅ MATCH' : '❌ no match'} (title: ${inTitle}, content: ${inContent})`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('\n❌ ERROR during auto-match test:', error);
    }

    process.exit(0);
}

debugRecentArticle().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
