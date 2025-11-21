#!/usr/bin/env tsx

/**
 * EMERGENCY FIX: Revert embedding column from vector to real[]
 * 
 * This fixes the error: operator does not exist: real[] <=> vector
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function fixVectorType() {
    console.log("🚨 EMERGENCY: Reverting embedding column from vector to real[]...\n");

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not found");
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        // Check current type
        console.log("1️⃣ Checking current column type...");
        const typeCheck = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'articles' AND column_name = 'embedding';
    `;
        console.log("   Current type:", typeCheck[0]);

        if (typeCheck[0]?.udt_name === 'vector') {
            console.log("\n2️⃣ Converting vector to real[]...");

            // Drop the vector column and recreate as real[]
            await sql`ALTER TABLE articles DROP COLUMN IF EXISTS embedding CASCADE;`;
            console.log("   ✅ Dropped vector column");

            await sql`ALTER TABLE articles ADD COLUMN embedding real[];`;
            console.log("   ✅ Added real[] column");

            console.log("\n✅ SUCCESS: Column reverted to real[]");
            console.log("   The site should work now!");
        } else {
            console.log("\n✅ Column is already real[] - no changes needed");
        }

        process.exit(0);
    } catch (error) {
        console.error("\n❌ ERROR:", error);
        process.exit(1);
    }
}

fixVectorType();
