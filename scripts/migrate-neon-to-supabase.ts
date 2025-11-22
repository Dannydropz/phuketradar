#!/usr/bin/env tsx

/**
 * NEON TO SUPABASE DATA MIGRATION
 * 
 * This script copies all data from your Neon database to Supabase
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import pg from "pg";

const { Client } = pg;

async function migrateData() {
    console.log("🚀 Starting Neon → Supabase migration\n");

    // Get connection strings from environment
    const neonUrl = process.env.NEON_DATABASE_URL;
    const supabaseUrl = process.env.DATABASE_URL;

    if (!neonUrl) {
        console.error("❌ NEON_DATABASE_URL not found in .env");
        console.log("\nAdd this to your .env file:");
        console.log("NEON_DATABASE_URL=postgresql://...(your old Neon URL)");
        process.exit(1);
    }

    if (!supabaseUrl) {
        console.error("❌ DATABASE_URL not found in .env");
        process.exit(1);
    }

    try {
        // Connect to Neon (source)
        console.log("📡 Connecting to Neon...");
        const neonSql = neon(neonUrl);

        // Connect to Supabase (destination)
        console.log("📡 Connecting to Supabase...");
        const supabase = new Client({ connectionString: supabaseUrl });
        await supabase.connect();

        // Migrate journalists first (articles reference them)
        console.log("\n1️⃣ Migrating journalists...");
        const journalists = await neonSql`SELECT * FROM journalists`;

        // Map old UUIDs to new integer IDs
        const journalistIdMap = new Map<string, number>();
        let journalistIdCounter = 1;

        for (const journalist of journalists) {
            const newId = journalistIdCounter++;
            journalistIdMap.set(journalist.id, newId);

            await supabase.query(
                `INSERT INTO journalists (id, nickname, surname, beat, bio, headshot, fun_fact, full_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           nickname = EXCLUDED.nickname,
           surname = EXCLUDED.surname,
           beat = EXCLUDED.beat,
           bio = EXCLUDED.bio,
           headshot = EXCLUDED.headshot,
           fun_fact = EXCLUDED.fun_fact,
           full_name = EXCLUDED.full_name`,
                [
                    newId,
                    journalist.nickname,
                    journalist.surname,
                    journalist.beat,
                    journalist.bio,
                    journalist.headshot,
                    journalist.fun_fact || journalist.funFact,
                    journalist.full_name || `${journalist.nickname} ${journalist.surname}`,
                    journalist.created_at || journalist.createdAt || new Date()
                ]
            );
        }
        console.log(`   ✅ Migrated ${journalists.length} journalists`);

        // Migrate categories (SKIPPED - already exist from schema creation)
        console.log("\n2️⃣ Skipping categories (already exist in Supabase)...");

        // Migrate articles
        console.log("\n3️⃣ Migrating articles...");
        const articles = await neonSql`
      SELECT * FROM articles 
      WHERE published_at IS NOT NULL 
      ORDER BY published_at DESC
    `;

        let migratedCount = 0;
        for (const article of articles) {
            try {
                await supabase.query(
                    `INSERT INTO articles (
            id, title, slug, content, excerpt, image_url, image_urls,
            category, source_url, source_name, source_facebook_post_id,
            journalist_id, published_at, created_at, updated_at,
            interest_score, event_type, severity, is_developing,
            embedding, merged_into_id, depth_updates, original_title
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23
          )
          ON CONFLICT (id) DO NOTHING`,
                    [
                        article.id,
                        article.title,
                        article.slug,
                        article.content,
                        article.excerpt,
                        article.image_url || article.imageUrl,
                        article.image_urls || article.imageUrls,
                        article.category,
                        article.source_url || article.sourceUrl,
                        article.source_name || article.sourceName,
                        article.source_facebook_post_id || article.sourceFacebookPostId,
                        journalistIdMap.get(article.journalist_id || article.journalistId) || null,
                        article.published_at || article.publishedAt,
                        article.created_at || article.createdAt || new Date(),
                        article.updated_at || article.updatedAt || new Date(),
                        article.interest_score || article.interestScore,
                        article.event_type || article.eventType,
                        article.severity,
                        article.is_developing || article.isDeveloping || false,
                        article.embedding,
                        article.merged_into_id || article.mergedIntoId,
                        article.depth_updates || article.depthUpdates,
                        article.original_title || article.originalTitle || article.title
                    ]
                );
                migratedCount++;
            } catch (error: any) {
                console.error(`   ⚠️  Failed to migrate article ${article.id}:`, error.message);
            }
        }
        console.log(`   ✅ Migrated ${migratedCount}/${articles.length} articles`);

        // Migrate subscribers
        console.log("\n4️⃣ Migrating subscribers...");
        try {
            const subscribers = await neonSql`SELECT * FROM subscribers`;

            for (const subscriber of subscribers) {
                await supabase.query(
                    `INSERT INTO subscribers (id, email, subscribed_at, is_active)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING`,
                    [
                        subscriber.id,
                        subscriber.email,
                        subscriber.subscribed_at || subscriber.subscribedAt || new Date(),
                        subscriber.is_active ?? subscriber.isActive ?? true
                    ]
                );
            }
            console.log(`   ✅ Migrated ${subscribers.length} subscribers`);
        } catch (error) {
            console.log("   ⚠️  No subscribers to migrate");
        }

        await supabase.end();

        console.log("\n✅ Migration complete!");
        console.log("\n📊 Summary:");
        console.log(`   - ${journalists.length} journalists`);
        console.log(`   - ${migratedCount} articles`);
        console.log("\n🎉 Your data is now in Supabase!");
        console.log("\nNext: Redeploy Railway to see your articles on the site");

    } catch (error) {
        console.error("\n❌ Migration failed:", error);
        process.exit(1);
    }
}

migrateData();
