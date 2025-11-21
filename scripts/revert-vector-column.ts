#!/usr/bin/env tsx

import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function revertVectorColumn() {
    try {
        console.log("🔧 Reverting vector column to real[]...");

        // Revert column to real[]
        console.log("   Converting column back to real[]...");
        await db.execute(sql`
      ALTER TABLE articles 
      ALTER COLUMN embedding TYPE real[] 
      USING embedding::real[];
    `);

        console.log("✅ Column reverted successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

revertVectorColumn();
