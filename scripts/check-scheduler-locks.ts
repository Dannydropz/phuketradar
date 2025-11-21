#!/usr/bin/env tsx

/**
 * Check current scheduler locks
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function checkLocks() {
    try {
        console.log("🔍 Checking scheduler locks...\n");

        const locks = await sql`
      SELECT lock_name, acquired_at, instance_id,
             EXTRACT(EPOCH FROM (NOW() - acquired_at)) as age_seconds
      FROM scheduler_locks
    `;

        if (locks.length === 0) {
            console.log("✅ No locks found - system is clear");
        } else {
            console.log(`⚠️  Found ${locks.length} lock(s):\n`);
            for (const lock of locks) {
                console.log(`Lock: ${lock.lock_name}`);
                console.log(`  Acquired: ${lock.acquired_at}`);
                console.log(`  Instance: ${lock.instance_id}`);
                console.log(`  Age: ${Math.round(lock.age_seconds)} seconds`);
                console.log();
            }
        }
    } catch (error) {
        console.error("❌ Error checking locks:", error);
        process.exit(1);
    }
}

checkLocks();
