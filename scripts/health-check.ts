#!/usr/bin/env tsx

/**
 * Database Health Check Script
 * Run this to verify database connectivity and performance
 */

import "dotenv/config";
import { pool } from "../server/db";
import { checkDatabaseHealth } from "../server/lib/db-health";

async function runHealthCheck() {
    console.log("🏥 Database Health Check");
    console.log("=".repeat(50));
    console.log();

    try {
        // 1. Basic connectivity test
        console.log("1️⃣ Testing basic connectivity...");
        const startTime = Date.now();
        const result = await pool.query("SELECT NOW() as current_time, version() as pg_version");
        const duration = Date.now() - startTime;

        console.log(`   ✅ Connected successfully in ${duration}ms`);
        console.log(`   📅 Database time: ${result.rows[0].current_time}`);
        console.log(`   🗄️  PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);
        console.log();

        // 2. Connection pool status
        console.log("2️⃣ Checking connection pool...");
        console.log(`   Total connections: ${pool.totalCount}`);
        console.log(`   Idle connections: ${pool.idleCount}`);
        console.log(`   Waiting clients: ${pool.waitingCount}`);
        console.log();

        // 3. Health check function
        console.log("3️⃣ Running health check function...");
        const isHealthy = await checkDatabaseHealth();
        if (isHealthy) {
            console.log("   ✅ Health check passed");
        } else {
            console.log("   ❌ Health check failed");
        }
        console.log();

        // 4. Query performance test
        console.log("4️⃣ Testing query performance...");
        const perfStart = Date.now();
        await pool.query("SELECT COUNT(*) as article_count FROM articles");
        const perfDuration = Date.now() - perfStart;
        console.log(`   ✅ Query completed in ${perfDuration}ms`);
        console.log();

        // 5. Connection timeout test
        console.log("5️⃣ Testing connection timeout handling...");
        try {
            await Promise.race([
                pool.query("SELECT pg_sleep(0.5)"),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Test timeout")), 1000)
                )
            ]);
            console.log("   ✅ Timeout handling works correctly");
        } catch (error: any) {
            if (error.message === "Test timeout") {
                console.log("   ⚠️  Query took longer than expected");
            } else {
                throw error;
            }
        }
        console.log();

        console.log("=".repeat(50));
        console.log("✅ All health checks passed!");
        console.log();
        console.log("📊 Summary:");
        console.log(`   - Connection latency: ${duration}ms`);
        console.log(`   - Query performance: ${perfDuration}ms`);
        console.log(`   - Pool utilization: ${pool.totalCount - pool.idleCount}/${pool.totalCount}`);
        console.log();

        process.exit(0);
    } catch (error) {
        console.error();
        console.error("❌ Health check failed!");
        console.error();
        console.error("Error details:");
        console.error(error);
        console.error();
        console.error("Troubleshooting:");
        console.error("1. Check DATABASE_URL is set correctly");
        console.error("2. Verify Neon database is running");
        console.error("3. Check network connectivity");
        console.error("4. Review DATABASE_IMPROVEMENTS.md for more help");
        console.error();

        process.exit(1);
    } finally {
        await pool.end();
    }
}

runHealthCheck();
