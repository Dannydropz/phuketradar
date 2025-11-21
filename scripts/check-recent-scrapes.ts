#!/usr/bin/env tsx

import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { desc, sql, and, gte } from "drizzle-orm";

async function checkRecentScrapes() {
    console.log("📊 Checking recent scrape activity...\n");

    try {
        // Get articles from the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentArticles = await db
            .select({
                id: articles.id,
                title: articles.title,
                publishedAt: articles.publishedAt,
                isPublished: articles.isPublished,
                interestScore: articles.interestScore,
                category: articles.category,
                sourceUrl: articles.sourceUrl,
            })
            .from(articles)
            .where(gte(articles.publishedAt, twentyFourHoursAgo))
            .orderBy(desc(articles.publishedAt));

        console.log(`📰 Articles created in last 24 hours: ${recentArticles.length}\n`);

        if (recentArticles.length === 0) {
            console.log("⚠️  No articles created in the last 24 hours!");
            console.log("   This suggests the scraper is skipping all posts.");
            console.log("   Possible reasons:");
            console.log("   1. All posts are duplicates (already scraped)");
            console.log("   2. All posts are text graphics (no real photos)");
            console.log("   3. All posts have low interest scores (< 3)");
            console.log("\n   Check Railway logs for skip reasons.");
        } else {
            recentArticles.forEach((article, i) => {
                const status = article.isPublished ? "✅ Published" : "📝 Draft";
                const score = article.interestScore || "N/A";
                console.log(`${i + 1}. ${status} | Score: ${score}/5 | ${article.category}`);
                console.log(`   ${article.title.substring(0, 70)}...`);
                console.log(`   ${article.publishedAt}`);
                console.log(`   Source: ${article.sourceUrl.substring(0, 80)}...\n`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkRecentScrapes();
