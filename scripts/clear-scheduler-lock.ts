#!/usr/bin/env tsx

/**
 * Manually clear the scheduler lock
 * Run this if a scrape job gets stuck and you need to force-clear the lock
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function clearLock() {
    try {
        console.log("🔓 Clearing scheduler lock...");

        const result = await sql`
      DELETE FROM scheduler_locks
      WHERE lock_name = 'scheduler_scrape'
      RETURNING lock_name, acquired_at
    `;

        if (result.length > 0) {
            console.log("✅ Lock cleared successfully");
            console.log("Lock details:", result[0]);
        } else {
            console.log("ℹ️  No lock found (already cleared or never existed)");
        }
    } catch (error) {
        console.error("❌ Error clearing lock:", error);
        process.exit(1);
    }
}

clearLock();
