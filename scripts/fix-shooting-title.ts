/**
 * Script to update the storySeriesTitle for the shooting incident timeline
 * 
 * This script connects directly without using the db module to allow SSL flexibility
 */

import "dotenv/config";
import pg from 'pg';

const { Pool } = pg;

async function main() {
    // Connect without SSL since the local/dev DB may not support it
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false, // Disable SSL for local connection
    });

    try {
        console.log('🔌 Connecting to database...');

        // First, find the shooting incident timeline
        const findResult = await pool.query(`
            SELECT 
                id, 
                title, 
                story_series_title,
                series_id,
                is_parent_story,
                auto_match_enabled
            FROM articles
            WHERE 
                is_parent_story = true 
                AND series_id IS NOT NULL
                AND (
                    title ILIKE '%Iraqi%' 
                    OR title ILIKE '%shooting%' 
                    OR title ILIKE '%Ameer Mundher%'
                    OR title ILIKE '%Patong%killed%'
                    OR story_series_title ILIKE '%Developing Story%Patong%'
                )
            LIMIT 5
        `);

        if (findResult.rows.length === 0) {
            console.log('❌ No matching timeline story found.');
            console.log('\n📋 Listing all active timelines instead:');

            const allTimelines = await pool.query(`
                SELECT 
                    id, 
                    title, 
                    story_series_title,
                    series_id,
                    auto_match_enabled
                FROM articles
                WHERE 
                    is_parent_story = true 
                    AND series_id IS NOT NULL
                ORDER BY published_at DESC
                LIMIT 10
            `);

            for (const t of allTimelines.rows) {
                console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`📰 Title: ${t.title?.substring(0, 80)}...`);
                console.log(`📌 Series Title: ${t.story_series_title || '[NOT SET]'}`);
                console.log(`🔗 ID: ${t.id}`);
            }
            process.exit(1);
        }

        console.log(`✅ Found ${findResult.rows.length} matching story/stories:\n`);

        for (const article of findResult.rows) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📰 Title: ${article.title}`);
            console.log(`📌 Current Series Title: ${article.story_series_title || '[NOT SET]'}`);
            console.log(`🔗 Article ID: ${article.id}`);
            console.log(`🔗 Series ID: ${article.series_id}`);
        }

        const newTitle = 'Phuket Shooting Incident: Iraqi National Killed in Patong - Developing';

        console.log(`\n🔄 Updating series title to: "${newTitle}"...\n`);

        // Update the story
        const updateResult = await pool.query(`
            UPDATE articles
            SET story_series_title = $1
            WHERE 
                is_parent_story = true 
                AND series_id IS NOT NULL
                AND (
                    title ILIKE '%Iraqi%' 
                    OR title ILIKE '%shooting%' 
                    OR title ILIKE '%Ameer Mundher%'
                    OR title ILIKE '%Patong%killed%'
                    OR story_series_title ILIKE '%Developing Story%Patong%'
                )
        `, [newTitle]);

        console.log(`✅ Updated ${updateResult.rowCount} article(s)`);

        // Also update all child articles in the same series
        for (const article of findResult.rows) {
            if (article.series_id) {
                const childUpdate = await pool.query(`
                    UPDATE articles
                    SET story_series_title = $1
                    WHERE series_id = $2
                `, [newTitle, article.series_id]);
                console.log(`✅ Updated ${childUpdate.rowCount} article(s) in series ${article.series_id}`);
            }
        }

        console.log(`\n🎉 Done! The timeline title has been updated to:`);
        console.log(`   "${newTitle}"`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
