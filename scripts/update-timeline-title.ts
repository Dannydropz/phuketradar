/**
 * Script to update the storySeriesTitle for a specific timeline story
 * 
 * Usage: npx tsx scripts/update-timeline-title.ts "search term" "new title"
 * Example: npx tsx scripts/update-timeline-title.ts "Iraqi National" "Phuket Shooting Incident: Iraqi National Killed in Patong - Developing"
 */

import "dotenv/config";
import { db } from '../server/db';
import { articles } from '../shared/schema';
import { and, eq, isNotNull, ilike, or } from 'drizzle-orm';

async function main() {
    const searchTerm = process.argv[2];
    const newTitle = process.argv[3];

    if (!searchTerm) {
        // If no arguments, list all timeline stories
        console.log('📋 Listing all timeline stories...\n');

        const timelines = await db.select({
            id: articles.id,
            title: articles.title,
            storySeriesTitle: articles.storySeriesTitle,
            seriesId: articles.seriesId,
            autoMatchEnabled: articles.autoMatchEnabled,
        })
            .from(articles)
            .where(and(
                eq(articles.isParentStory, true),
                isNotNull(articles.seriesId)
            ));

        for (const t of timelines) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📰 Original Title: ${t.title}`);
            console.log(`📌 Series Title:   ${t.storySeriesTitle || '[NOT SET]'}`);
            console.log(`🔗 Series ID:      ${t.seriesId}`);
            console.log(`📝 Article ID:     ${t.id}`);
            console.log(`⚡ Auto-Match:     ${t.autoMatchEnabled ? '✅ Enabled' : '❌ Disabled'}`);
        }
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\nFound ${timelines.length} timeline(s)`);
        console.log(`\nUsage: npx tsx scripts/update-timeline-title.ts "search term" "new title"`);
        process.exit(0);
    }

    // Find matching timeline stories
    const matches = await db.select({
        id: articles.id,
        title: articles.title,
        storySeriesTitle: articles.storySeriesTitle,
        seriesId: articles.seriesId,
    })
        .from(articles)
        .where(and(
            eq(articles.isParentStory, true),
            isNotNull(articles.seriesId),
            or(
                ilike(articles.title, `%${searchTerm}%`),
                ilike(articles.storySeriesTitle, `%${searchTerm}%`)
            )
        ));

    if (matches.length === 0) {
        console.error(`❌ No timeline stories found matching: "${searchTerm}"`);
        process.exit(1);
    }

    if (matches.length > 1) {
        console.log(`⚠️ Found ${matches.length} matching stories:\n`);
        for (const m of matches) {
            console.log(`   ID: ${m.id}`);
            console.log(`   Title: ${m.title}`);
            console.log(`   Series Title: ${m.storySeriesTitle || '[NOT SET]'}`);
            console.log('');
        }
        console.log(`Please use a more specific search term.`);
        process.exit(1);
    }

    const match = matches[0];
    console.log(`✅ Found matching timeline story:`);
    console.log(`   ID: ${match.id}`);
    console.log(`   Current Title: ${match.title}`);
    console.log(`   Current Series Title: ${match.storySeriesTitle || '[NOT SET]'}`);

    if (!newTitle) {
        console.log(`\n💡 To update, run:`);
        console.log(`   npx tsx scripts/update-timeline-title.ts "${searchTerm}" "Your New Series Title"`);
        process.exit(0);
    }

    // Update the storySeriesTitle
    console.log(`\n🔄 Updating series title to: "${newTitle}"...`);

    await db.update(articles)
        .set({ storySeriesTitle: newTitle })
        .where(eq(articles.id, match.id));

    // Also update all articles in the same series
    if (match.seriesId) {
        await db.update(articles)
            .set({ storySeriesTitle: newTitle })
            .where(eq(articles.seriesId, match.seriesId));

        console.log(`✅ Updated series title for all articles in series: ${match.seriesId}`);
    }

    console.log(`✅ Done! The timeline title has been updated.`);
    console.log(`\n📌 New Series Title: ${newTitle}`);

    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
