import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function checkIndexes() {
    console.log("📊 Checking database indexes...\n");

    try {
        // Check all indexes on articles table
        const indexes = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'articles'
      ORDER BY indexname;
    `);

        console.log(`Found ${indexes.rows.length} indexes on 'articles' table:\n`);
        indexes.rows.forEach((row: any, idx: number) => {
            console.log(`${idx + 1}. ${row.indexname}`);
            console.log(`   ${row.indexdef}\n`);
        });

        // Check table statistics
        console.log("\n📈 Table statistics:");
        const stats = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE tablename = 'articles';
    `);

        if (stats.rows.length > 0) {
            const stat = stats.rows[0];
            console.log(`   Live rows: ${stat.row_count}`);
            console.log(`   Dead rows: ${stat.dead_rows}`);
            console.log(`   Last vacuum: ${stat.last_vacuum || 'Never'}`);
            console.log(`   Last autovacuum: ${stat.last_autovacuum || 'Never'}`);
            console.log(`   Last analyze: ${stat.last_analyze || 'Never'}`);
            console.log(`   Last autoanalyze: ${stat.last_autoanalyze || 'Never'}`);
        }

        // Check for missing indexes on frequently queried columns
        console.log("\n🔍 Checking for potentially missing indexes:");

        const frequentlyQueriedColumns = [
            'source_url',
            'source_facebook_post_id',
            'slug',
            'category',
            'is_published',
            'published_at',
            'image_url',
            'journalist_id'
        ];

        for (const column of frequentlyQueriedColumns) {
            const hasIndex = indexes.rows.some((row: any) =>
                row.indexdef.toLowerCase().includes(column.toLowerCase())
            );

            const status = hasIndex ? '✅' : '❌';
            console.log(`   ${status} ${column}`);
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        await pool.end();
        process.exit(1);
    }
}

checkIndexes();
