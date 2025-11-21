#!/usr/bin/env tsx

import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { desc, sql } from "drizzle-orm";

async function checkArticlesBySource() {
    console.log("📊 Checking articles by creation time...\n");

    try {
        // Get all articles with their creation timestamps
        const allArticles = await db
            .select({
                title: articles.title,
                publishedAt: articles.publishedAt,
                isPublished: articles.isPublished,
                isManuallyCreated: articles.isManuallyCreated,
            })
            .from(articles)
            .orderBy(desc(articles.publishedAt))
            .limit(30);

        console.log("📰 Last 30 articles (newest first):\n");
        allArticles.forEach((article, i) => {
            const source = article.isManuallyCreated ? "🖐️  MANUAL" : "🤖 AUTO";
            const status = article.isPublished ? "✅ Published" : "📝 Draft";
            console.log(`${i + 1}. ${source} | ${status}`);
            console.log(`   ${article.title.substring(0, 70)}...`);
            console.log(`   ${article.publishedAt}\n`);
        });

        // Count by source
        const manualCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM articles WHERE is_manually_created = true
    `);

        const autoCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM articles WHERE is_manually_created = false OR is_manually_created IS NULL
    `);

        console.log("\n📊 Summary:");
        console.log(`🖐️  Manual scrapes: ${manualCount.rows[0].count}`);
        console.log(`🤖 Auto scrapes: ${autoCount.rows[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkArticlesBySource();
