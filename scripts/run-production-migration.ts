import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { sql } from "drizzle-orm";

async function runProductionMigration() {
    const { db } = await import("../server/db");
    try {
        console.log("🔧 Running production database migration...");
        console.log("   Adding video_url and video_thumbnail columns\n");

        await db.execute(sql`
      ALTER TABLE articles 
      ADD COLUMN IF NOT EXISTS video_url text;
    `);

        await db.execute(sql`
      ALTER TABLE articles 
      ADD COLUMN IF NOT EXISTS video_thumbnail text;
    `);

        await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_articles_video_url 
      ON articles(video_url) 
      WHERE video_url IS NOT NULL;
    `);

        console.log("✅ Migration completed successfully");
        console.log("   - Added video_url column");
        console.log("   - Added video_thumbnail column");
        console.log("   - Created index for video queries");

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runProductionMigration();
