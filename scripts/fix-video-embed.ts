/**
 * URGENT FIX: Clear the facebookEmbedUrl for the specific broken article
 */

import { db } from "../server/db";
import { articles } from "../shared/schema";
import { sql } from "drizzle-orm";

async function fixSpecificArticle() {
    console.log("🔧 Fixing the specific broken article...\n");

    // Find by the known sourceUrl from the facebookEmbedUrl
    const result = await db
        .select({
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
            facebookEmbedUrl: articles.facebookEmbedUrl,
            imageUrl: articles.imageUrl,
            imageUrls: articles.imageUrls,
        })
        .from(articles)
        .where(sql`${articles.facebookEmbedUrl} LIKE '%pfbid02T9XTzDKn8%'`);

    if (result.length === 0) {
        console.log("❌ Article not found by facebookEmbedUrl pattern");

        // Try finding by slug pattern
        const bySlug = await db
            .select({
                id: articles.id,
                title: articles.title,
                slug: articles.slug,
                facebookEmbedUrl: articles.facebookEmbedUrl,
            })
            .from(articles)
            .where(sql`${articles.slug} ILIKE '%foreign-tourists%controversy%'`);

        console.log("Search by slug pattern found:", bySlug.length, "articles");
        console.log(JSON.stringify(bySlug, null, 2));
        process.exit(1);
    }

    const article = result[0];
    console.log(`Found article: ${article.title}`);
    console.log(`  Slug: ${article.slug}`);
    console.log(`  ID: ${article.id}`);
    console.log(`  Current facebookEmbedUrl: ${article.facebookEmbedUrl}`);
    console.log(`  imageUrl: ${article.imageUrl}`);
    console.log(`  imageUrls count: ${article.imageUrls?.length || 0}`);

    // Clear the facebookEmbedUrl
    console.log("\n🔧 Clearing facebookEmbedUrl...");
    await db
        .update(articles)
        .set({ facebookEmbedUrl: null })
        .where(sql`${articles.id} = ${article.id}`);

    console.log("✅ Fixed! The article should now show images instead of video embed.");
    process.exit(0);
}

fixSpecificArticle().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
