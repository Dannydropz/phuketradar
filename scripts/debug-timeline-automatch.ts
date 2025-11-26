import { db } from "../server/db";
import { articles } from "../shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

async function checkTimelineAutoMatch() {
    console.log("🔍 Checking Timeline Auto-Match Configuration...\n");

    // Find all parent stories with timelines
    const parentStories = await db
        .select()
        .from(articles)
        .where(
            and(
                eq(articles.isParentStory, true),
                isNotNull(articles.seriesId)
            )
        );

    console.log(`Found ${parentStories.length} parent stories with timelines:\n`);

    for (const story of parentStories) {
        console.log(`📰 ${story.title}`);
        console.log(`   Series ID: ${story.seriesId}`);
        console.log(`   Auto-Match Enabled: ${story.autoMatchEnabled ? '✅ YES' : '❌ NO'}`);
        console.log(`   Timeline Tags: ${story.timelineTags && story.timelineTags.length > 0 ? story.timelineTags.join(', ') : '⚠️  NONE'}`);
        console.log('');
    }

    // Check recent flood articles
    const recentArticles = await db
        .select()
        .from(articles)
        .where(eq(articles.isPublished, true))
        .orderBy(articles.createdAt)
        .limit(20);

    console.log("\n\n🔍 Checking recent published articles for 'flood' or 'hat yai':\n");

    const floodArticles = recentArticles.filter(a =>
        a.title.toLowerCase().includes('flood') ||
        a.title.toLowerCase().includes('hat yai') ||
        a.content.toLowerCase().includes('flood') ||
        a.content.toLowerCase().includes('hat yai')
    );

    console.log(`Found ${floodArticles.length} flood-related articles:\n`);

    for (const article of floodArticles) {
        console.log(`📄 ${article.title}`);
        console.log(`   ID: ${article.id}`);
        console.log(`   Published: ${article.isPublished ? 'YES' : 'NO'}`);
        console.log(`   In Timeline: ${article.seriesId ? `YES (${article.seriesId})` : 'NO'}`);
        console.log(`   Needs Review: ${article.needsReview ? 'YES' : 'NO'}`);
        console.log(`   Created: ${article.createdAt}`);
        console.log('');
    }

    process.exit(0);
}

checkTimelineAutoMatch().catch(console.error);
