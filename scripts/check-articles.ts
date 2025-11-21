#!/usr/bin/env tsx

/**
 * Check article count in database
 */

import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { sql, like, or } from "drizzle-orm";

async function checkArticles() {
    try {
        console.log("📊 Checking database articles...\n");

        // Count total articles
        const totalCount = await db.select({ count: sql<number>`count(*)` }).from(articles);
        console.log(`Total articles: ${totalCount[0].count}`);

        // Count articles with Facebook URLs
        const fbCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(articles)
            .where(
                or(
                    like(articles.imageUrl, '%fbcdn.net%'),
                    like(articles.imageUrl, '%facebook.com%')
                )
            );
        console.log(`Articles with Facebook URLs: ${fbCount[0].count}`);

        // Count articles with Cloudinary URLs
        const cloudinaryCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(articles)
            .where(like(articles.imageUrl, '%cloudinary.com%'));
        console.log(`Articles with Cloudinary URLs: ${cloudinaryCount[0].count}`);

        // Show a few recent articles
        console.log("\n📰 Recent articles:");
        const recent = await db
            .select({
                id: articles.id,
                title: articles.title,
                imageUrl: articles.imageUrl,
                publishedAt: articles.publishedAt,
            })
            .from(articles)
            .orderBy(sql`${articles.publishedAt} DESC`)
            .limit(5);

        recent.forEach((article, idx) => {
            console.log(`\n${idx + 1}. ${article.title.substring(0, 60)}...`);
            console.log(`   Published: ${article.publishedAt}`);
            console.log(`   Image: ${article.imageUrl?.substring(0, 80)}...`);
        });

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

checkArticles();
