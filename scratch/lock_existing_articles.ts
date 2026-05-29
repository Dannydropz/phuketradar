import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { pool } from "../server/db";

async function run() {
  console.log("Locking all un-posted articles from n8n...");
  try {
    const result = await pool.query(`
      UPDATE articles 
      SET 
        facebook_post_id = COALESCE(facebook_post_id, 'LOCK:MANUAL:' || id),
        instagram_post_id = COALESCE(instagram_post_id, 'IG-LOCK:MANUAL:' || id),
        threads_post_id = COALESCE(threads_post_id, 'THREADS-LOCK:MANUAL:' || id)
      WHERE is_published = true 
        AND (facebook_post_id IS NULL OR instagram_post_id IS NULL OR threads_post_id IS NULL)
    `);
    console.log(`Locked ${result.rowCount} articles.`);
  } catch (error) {
    console.error("Error updating database:", error);
  } finally {
    process.exit(0);
  }
}

run();
