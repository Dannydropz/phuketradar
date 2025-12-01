
import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

async function checkUnposted() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
      SELECT id, title, interest_score, is_manually_created, published_at 
      FROM articles 
      WHERE is_published = true 
      ORDER BY published_at DESC 
      LIMIT 5;
    `);

        console.log('--- Absolute Latest Published Articles ---');
        if (res.rows.length === 0) {
            console.log('No articles found.');
        } else {
            res.rows.forEach(r => {
                console.log(`[${r.published_at}] Score: ${r.interest_score} | Manual: ${r.is_manually_created} - ${r.title}`);
            });
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkUnposted();
