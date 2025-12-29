/**
 * Debug: Check specific article state
 */

import { db } from "../server/db";
import { articles } from "../shared/schema";
import { sql } from "drizzle-orm";

async function checkArticle() {
    const result = await db
        .select({
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
            imageUrl: articles.imageUrl,
            imageUrls: articles.imageUrls,
            videoUrl: articles.videoUrl,
            videoThumbnail: articles.videoThumbnail,
            facebookEmbedUrl: articles.facebookEmbedUrl,
            sourceUrl: articles.sourceUrl,
        })
        .from(articles)
        .where(sql`${articles.slug} LIKE '%-ada4cded'`);

    console.log("Article data:");
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
}

checkArticle().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
