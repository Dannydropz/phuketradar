/**
 * Debug script to view article content formatting
 * Usage: npx tsx scripts/debug-article-content.ts "search term"
 */

import "dotenv/config";
import { db } from '../server/db';
import { articles } from '../shared/schema';
import { ilike, or } from 'drizzle-orm';

async function main() {
    const searchTerm = process.argv[2] || "Iraqi";

    console.log(`🔍 Searching for articles matching: "${searchTerm}"\n`);

    const matches = await db.select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        excerpt: articles.excerpt,
        category: articles.category,
        seriesId: articles.seriesId,
        isParentStory: articles.isParentStory,
        storySeriesTitle: articles.storySeriesTitle,
        publishedAt: articles.publishedAt,
    })
        .from(articles)
        .where(or(
            ilike(articles.title, `%${searchTerm}%`),
            ilike(articles.content, `%${searchTerm}%`),
            ilike(articles.slug, `%${searchTerm}%`)
        ))
        .limit(10);

    if (matches.length === 0) {
        console.log(`❌ No articles found matching: "${searchTerm}"`);
        process.exit(0);
    }

    for (const article of matches) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📰 Title: ${article.title}`);
        console.log(`🆔 ID: ${article.id}`);
        console.log(`🔗 Slug: ${article.slug}`);
        console.log(`📁 Category: ${article.category}`);
        console.log(`📅 Published: ${article.publishedAt}`);
        console.log(`🔗 Series ID: ${article.seriesId || 'None'}`);
        console.log(`👑 Is Parent: ${article.isParentStory ? 'Yes' : 'No'}`);
        console.log(`📌 Series Title: ${article.storySeriesTitle || 'None'}`);
        console.log(`\n📝 EXCERPT:\n${article.excerpt}\n`);
        console.log(`📄 CONTENT (raw HTML):\n${'-'.repeat(60)}`);
        console.log(article.content);
        console.log(`\n${'-'.repeat(60)}`);
        console.log(`📊 Content Analysis:`);
        console.log(`   - Length: ${article.content?.length || 0} chars`);
        console.log(`   - <p> tags: ${(article.content?.match(/<p[^>]*>/g) || []).length}`);
        console.log(`   - <br> tags: ${(article.content?.match(/<br\s*\/?>/gi) || []).length}`);
        console.log(`   - Newlines: ${(article.content?.match(/\n/g) || []).length}`);
        console.log(`   - Has proper formatting: ${((article.content?.match(/<p[^>]*>/g) || []).length >= 2) ? '✅ Yes' : '❌ No - WALL OF TEXT'}`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\nFound ${matches.length} article(s)`);

    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
