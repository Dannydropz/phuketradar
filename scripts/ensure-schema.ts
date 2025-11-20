import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Ensures the database schema has all required columns.
 * This runs on every server startup to handle Replit's broken migration system.
 */
export async function ensureSchema() {
    try {
        console.log("🔧 [SCHEMA] Ensuring database schema is up to date...");

        // Add facebook_headline column if it doesn't exist
        await db.execute(sql`
      ALTER TABLE articles 
      ADD COLUMN IF NOT EXISTS facebook_headline text;
    `);

        console.log("✅ [SCHEMA] Database schema verified");
    } catch (error) {
        console.error("❌ [SCHEMA] Error ensuring schema:");
        console.error(error);
        // Don't throw - let the server start anyway
    }
}
