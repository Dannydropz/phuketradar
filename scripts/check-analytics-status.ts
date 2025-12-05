import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkAnalyticsStatus() {
    console.log("🔍 Checking Analytics Sync Status...\n");

    try {
        // Check latest article_metrics entry
        const latestMetrics = await db.execute(sql`
            SELECT metric_date, synced_at, COUNT(*) as count 
            FROM article_metrics 
            GROUP BY metric_date, synced_at 
            ORDER BY synced_at DESC 
            LIMIT 5
        `);
        console.log("📊 Latest Article Metrics (by sync time):");
        console.table(latestMetrics.rows);

        // Check latest social_media_analytics entry
        const latestSocial = await db.execute(sql`
            SELECT DATE(last_updated_at) as update_date, COUNT(*) as count 
            FROM social_media_analytics 
            GROUP BY DATE(last_updated_at) 
            ORDER BY update_date DESC 
            LIMIT 5
        `);
        console.log("\n📱 Latest Social Media Analytics (by update date):");
        console.table(latestSocial.rows);

        // Check engagement scores
        const engagementStats = await db.execute(sql`
            SELECT 
                COUNT(*) as total_articles,
                COUNT(CASE WHEN engagement_score > 0 THEN 1 END) as with_score,
                MAX(engagement_score) as max_score,
                AVG(engagement_score) as avg_score
            FROM articles
            WHERE published_at > NOW() - INTERVAL '7 days'
        `);
        console.log("\n📈 Engagement Score Stats (Last 7 days):");
        console.table(engagementStats.rows);

    } catch (error) {
        console.error("❌ Error:", error);
    }

    process.exit(0);
}

checkAnalyticsStatus();
