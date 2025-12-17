#!/usr/bin/env npx tsx
/**
 * Check articles eligible for Instagram/Threads posting
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkArticles() {
    const client = await pool.connect();
    try {
        // Check for high-interest articles in last 24 hours
        const eligibleResult = await client.query(`
      SELECT id, title, interest_score, instagram_post_id, published_at
      FROM articles 
      WHERE is_published = true 
        AND interest_score >= 4 
        AND image_url IS NOT NULL
        AND is_manually_created = false
        AND published_at > NOW() - INTERVAL '24 hours'
      ORDER BY interest_score DESC, published_at DESC
      LIMIT 10
    `);

        console.log('\n=== High-interest articles in last 24 hours ===');
        if (eligibleResult.rows.length === 0) {
            console.log('❌ No high-interest (score >= 4) articles found in last 24 hours');
        } else {
            eligibleResult.rows.forEach((a: any) => {
                const igStatus = a.instagram_post_id ? `✅ Posted: ${a.instagram_post_id}` : '❌ NOT POSTED';
                console.log(`[${a.interest_score}] ${a.title.substring(0, 50)}...`);
                console.log(`    ID: ${a.id} | IG: ${igStatus}`);
            });
        }

        // Check for any articles with instagram_post_id set
        const postedResult = await client.query(`
      SELECT id, title, instagram_post_id, published_at
      FROM articles 
      WHERE instagram_post_id IS NOT NULL
      ORDER BY published_at DESC
      LIMIT 5
    `);

        console.log('\n=== Articles already marked as posted to Instagram ===');
        if (postedResult.rows.length === 0) {
            console.log('No articles have instagram_post_id set');
        } else {
            postedResult.rows.forEach((a: any) => {
                console.log(`- ${a.title.substring(0, 40)}...`);
                console.log(`  ID: ${a.id} | IG Post ID: ${a.instagram_post_id}`);
            });
        }

        // Check most recent high-interest articles regardless of time
        const recentHighResult = await client.query(`
      SELECT id, title, interest_score, instagram_post_id, published_at
      FROM articles 
      WHERE is_published = true 
        AND interest_score >= 4 
        AND image_url IS NOT NULL
      ORDER BY published_at DESC
      LIMIT 5
    `);

        console.log('\n=== Most recent high-interest articles (any time) ===');
        recentHighResult.rows.forEach((a: any) => {
            const igStatus = a.instagram_post_id ? `Posted` : 'Not posted';
            const date = new Date(a.published_at).toLocaleString();
            console.log(`[${a.interest_score}] ${a.title.substring(0, 40)}... | ${igStatus} | ${date}`);
        });

    } finally {
        client.release();
        await pool.end();
    }
}

checkArticles().catch(console.error);
