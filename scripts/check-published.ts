#!/usr/bin/env tsx

import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { desc, sql } from "drizzle-orm";

async function checkPublishedArticles() {
    console.log("📊 Checking published vs unpublished articles...\n");

    try {
        // Count published vs unpublished
        const publishedCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM articles WHERE is_published = true
    `);

        const unpublishedCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM articles WHERE is_published = false
    `);

        console.log(`✅ Published articles: ${publishedCount.rows[0].count}`);
        console.log(`📝 Unpublished articles: ${unpublishedCount.rows[0].count}\n`);

        // Show recent unpublished articles
        const unpublished = await db
            .select({
                title: articles.title,
                publishedAt: articles.publishedAt,
                interestScore: articles.interestScore,
                isPublished: articles.isPublished,
            })
            .from(articles)
            .where(sql`is_published = false`)
            .orderBy(desc(articles.publishedAt))
            .limit(10);

        if (unpublished.length > 0) {
            console.log("📝 Recent UNPUBLISHED articles (drafts):\n");
            unpublished.forEach((article, i) => {
                console.log(`${i + 1}. ${article.title.substring(0, 60)}...`);
                console.log(`   Interest Score: ${article.interestScore}/5`);
                console.log(`   Created: ${article.publishedAt}\n`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkPublishedArticles();
