#!/usr/bin/env tsx

/**
 * Fix embedding column type
 * Converts 'embedding' from real[] to vector(1536)
 */

import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fixVectorColumn() {
    try {
        console.log("🔧 Fixing vector column...");

        // 1. Enable pgvector extension
        console.log("   Enabling pgvector extension...");
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);

        // 2. Check current column type
        console.log("   Checking current column type...");
        const result = await db.execute(sql`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'articles' AND column_name = 'embedding';
    `);

        console.log("   Current type:", result.rows[0]);

        // 3. Alter column to vector
        console.log("   Converting column to vector(1536)...");
        await db.execute(sql`
      ALTER TABLE articles 
      ALTER COLUMN embedding TYPE vector(1536) 
      USING embedding::vector;
    `);

        console.log("✅ Column converted successfully!");

        // 4. Create index for faster search (optional but recommended)
        console.log("   Creating HNSW index...");
        await db.execute(sql`
      CREATE INDEX IF NOT EXISTS articles_embedding_idx 
      ON articles 
      USING hnsw (embedding vector_cosine_ops);
    `);

        console.log("✅ Index created!");

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixVectorColumn();
