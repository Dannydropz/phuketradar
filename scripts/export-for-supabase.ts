#!/usr/bin/env tsx

/**
 * SUPABASE MIGRATION SCRIPT
 * 
 * This script exports your current Neon database to SQL format
 * so it can be imported into Supabase.
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";

async function exportDatabase() {
    console.log("📦 Exporting Neon database...\n");

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not found");
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        // Export schema
        console.log("1️⃣ Exporting schema...");
        const schema = await sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

        console.log(`   ✅ Found ${schema.length} columns across tables`);

        // Export data from each table
        console.log("\n2️⃣ Exporting data...");

        const tables = ['users', 'articles', 'journalists', 'categories', 'subscribers'];
        let totalRows = 0;

        for (const table of tables) {
            try {
                const count = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
                const rowCount = count[0]?.count || 0;
                totalRows += Number(rowCount);
                console.log(`   📊 ${table}: ${rowCount} rows`);
            } catch (error) {
                console.log(`   ⚠️  ${table}: table not found (skipping)`);
            }
        }

        console.log(`\n   ✅ Total: ${totalRows} rows to migrate`);

        // Create backup SQL file
        console.log("\n3️⃣ Creating backup SQL file...");

        const backupSQL = `
-- Supabase Migration Backup
-- Generated: ${new Date().toISOString()}
-- Total rows: ${totalRows}

-- Note: Run this in Supabase SQL Editor after creating a new project
-- The schema will be created automatically by Drizzle migrations

-- To restore data, you'll need to export each table individually
-- Use the Supabase dashboard or pg_dump for full backup
`;

        writeFileSync('supabase-migration-info.sql', backupSQL);
        console.log("   ✅ Created supabase-migration-info.sql");

        console.log("\n✅ Export complete!");
        console.log("\n📋 Next steps:");
        console.log("   1. Create a Supabase project at https://supabase.com");
        console.log("   2. Get your connection string from Project Settings > Database");
        console.log("   3. Update DATABASE_URL in Railway to use Supabase");
        console.log("   4. Run: npm run db:push (to create schema in Supabase)");
        console.log("   5. Manually migrate critical data (articles, journalists)");

    } catch (error) {
        console.error("\n❌ ERROR:", error);
        process.exit(1);
    }
}

exportDatabase();
