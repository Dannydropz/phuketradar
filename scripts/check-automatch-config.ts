import { db } from '../server/db';
import { articles } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

/**
 * Check if timeline auto-match is configured correctly in database
 */
async function checkAutoMatchConfig() {
    console.log('\n=== TIMELINE AUTO-MATCH CONFIGURATION CHECK ===\n');

    // 1. Find all parent stories with auto-match enabled
    const timelines = await db
        .select()
        .from(articles)
        .where(
            and(
                eq(articles.isParentStory, true),
                isNotNull(articles.seriesId)
            )
        );

    console.log(`Found ${timelines.length} timeline parent stories\n`);

    for (const timeline of timelines) {
        console.log(`Timeline: "${timeline.storySeriesTitle}"`);
        console.log(`  Series ID: ${timeline.seriesId}`);
        console.log(`  Auto-Match Enabled: ${timeline.autoMatchEnabled ? '✅ YES' : '❌ NO'}`);
        console.log(`  Tags: ${timeline.timelineTags ? `[${timeline.timelineTags.join(', ')}]` : '❌ EMPTY'}`);
        console.log(`  Tag Count: ${timeline.timelineTags?.length || 0}`);
        console.log('');
    }

    // 2. Check recent flood articles
    console.log('\n=== RECENT FLOOD ARTICLES (last 2 hours) ===\n');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentArticles = await db
        .select()
        .from(articles)
        .where(
            and(
                eq(articles.isParentStory, false),
                isNotNull(articles.publishedAt)
            )
        )
        .limit(20);

    const floodArticles = recentArticles.filter(a =>
        new Date(a.publishedAt!) > twoHoursAgo &&
        (a.title.toLowerCase().includes('flood') ||
            a.title.toLowerCase().includes('hat yai') ||
            a.content.toLowerCase().includes('flooding'))
    );

    console.log(`Found ${floodArticles.length} flood-related articles:\n`);

    for (const article of floodArticles) {
        console.log(`"${article.title}"`);
        console.log(`  Published: ${new Date(article.publishedAt!).toLocaleString()}`);
        console.log(`  In Timeline: ${article.seriesId ? '✅ YES' : '❌ NO'}`);
        console.log(`  Series ID: ${article.seriesId || 'none'}`);
        console.log(`  Needs Review: ${article.needsReview ? '✅ YES' : 'NO'}`);
        console.log('');
    }

    // 3. Summary
    console.log('\n=== DIAGNOSIS ===\n');

    const enabledTimelines = timelines.filter(t => t.autoMatchEnabled);
    const timelinesWithTags = timelines.filter(t => t.timelineTags && t.timelineTags.length > 0);
    const fullyConfigured = timelines.filter(t => t.autoMatchEnabled && t.timelineTags && t.timelineTags.length > 0);

    console.log(`Timelines with auto-match enabled: ${enabledTimelines.length}/${timelines.length}`);
    console.log(`Timelines with tags configured: ${timelinesWithTags.length}/${timelines.length}`);
    console.log(`Fully configured (enabled + tags): ${fullyConfigured.length}/${timelines.length}`);

    if (fullyConfigured.length === 0) {
        console.log('\n❌ PROBLEM FOUND: No timelines are fully configured for auto-match!');
        console.log('   Solution: Enable auto-match AND add tags in Timeline Manager');
    } else {
        console.log('\n✅ Timeline configuration looks good');

        const matchedArticles = floodArticles.filter(a => a.seriesId);
        if (matchedArticles.length === 0 && floodArticles.length > 0) {
            console.log('❌ PROBLEM: Articles should match but don\'t - code not running');
            console.log('   Solution: Check Railway logs for AUTO-MATCH output');
        } else {
            console.log('✅ Auto-match appears to be working');
        }
    }

    await db.$client.end();
}

checkAutoMatchConfig().catch(console.error);
