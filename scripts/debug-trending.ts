/**
 * Debug Trending / Facebook Sync
 * Run: npx tsx scripts/debug-trending.ts
 */

import { db } from "../server/db";
import { articles, socialMediaAnalytics } from "@shared/schema";
import { desc, sql, gte, and, isNotNull } from "drizzle-orm";

async function debugTrending() {
    console.log("🔍 DEBUGGING TRENDING PIPELINE\n");

    // 1. Check articles with Facebook posts
    console.log("=== ARTICLES WITH FACEBOOK POSTS (Last 7 days) ===");
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const articlesWithFb = await db
        .select({
            id: articles.id,
            title: articles.title,
            facebookPostId: articles.facebookPostId,
            engagementScore: articles.engagementScore,
            viewCount: articles.viewCount,
            publishedAt: articles.publishedAt,
        })
        .from(articles)
        .where(
            and(
                gte(articles.publishedAt, sevenDaysAgo),
                isNotNull(articles.facebookPostId)
            )
        )
        .orderBy(desc(articles.engagementScore))
        .limit(10);

    for (const a of articlesWithFb) {
        console.log(`\n📰 ${a.title.substring(0, 60)}...`);
        console.log(`   FB Post ID: ${a.facebookPostId}`);
        console.log(`   Engagement Score: ${a.engagementScore ?? "NULL"}`);
        console.log(`   View Count: ${a.viewCount ?? 0}`);
    }

    // 2. Check social media analytics table
    console.log("\n\n=== SOCIAL MEDIA ANALYTICS TABLE ===");
    const socialData = await db
        .select()
        .from(socialMediaAnalytics)
        .orderBy(desc(socialMediaAnalytics.reactions))
        .limit(10);

    if (socialData.length === 0) {
        console.log("❌ NO DATA IN SOCIAL_MEDIA_ANALYTICS TABLE!");
        console.log("   → Facebook insights have NOT been synced");
        console.log("   → Run: POST /api/admin/sync-facebook-insights");
    } else {
        for (const s of socialData) {
            console.log(`\n📊 Article ID: ${s.articleId}`);
            console.log(`   Impressions: ${s.impressions}`);
            console.log(`   Reactions: ${s.reactions}`);
            console.log(`   Comments: ${s.comments}`);
            console.log(`   Shares: ${s.shares}`);
        }
    }

    // 3. What SHOULD be trending based on engagement score
    console.log("\n\n=== CURRENT TRENDING (by engagementScore) ===");
    const trending = await db
        .select({
            title: articles.title,
            engagementScore: articles.engagementScore,
            viewCount: articles.viewCount,
            category: articles.category,
        })
        .from(articles)
        .where(gte(articles.publishedAt, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)))
        .orderBy(desc(articles.engagementScore))
        .limit(5);

    for (const t of trending) {
        console.log(`#${trending.indexOf(t) + 1}: ${t.title.substring(0, 50)}... (Score: ${t.engagementScore ?? 0})`);
    }

    // 4. Compare with viewCount ordering
    console.log("\n\n=== COMPARISON: Ordered by viewCount ===");
    const byViews = await db
        .select({
            title: articles.title,
            engagementScore: articles.engagementScore,
            viewCount: articles.viewCount,
        })
        .from(articles)
        .where(gte(articles.publishedAt, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)))
        .orderBy(desc(articles.viewCount))
        .limit(5);

    for (const v of byViews) {
        console.log(`#${byViews.indexOf(v) + 1}: ${v.title.substring(0, 50)}... (Views: ${v.viewCount ?? 0})`);
    }

    console.log("\n✅ Done!");
    process.exit(0);
}

debugTrending().catch(console.error);
