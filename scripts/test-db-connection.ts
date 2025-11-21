#!/usr/bin/env tsx

import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { sql } from "drizzle-orm";

async function testConnection() {
    console.log("🔌 Testing database connection...");

    try {
        // 1. Simple connection test
        const result = await db.execute(sql`SELECT NOW()`);
        console.log("✅ Database connected:", result.rows[0]);

        // 2. Test reading articles (checks if ORM can handle the vector column)
        console.log("📖 Attempting to read articles...");
        const recent = await db.select().from(articles).limit(1);
        console.log(`✅ Read ${recent.length} articles successfully`);

        if (recent.length > 0) {
            console.log("   Sample embedding type:", typeof recent[0].embedding);
            console.log("   Sample embedding length:", recent[0].embedding?.length);
        }

        console.log("🎉 Server should be able to start!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ CRITICAL ERROR: Server likely crashing due to this:");
        console.error(error);
        process.exit(1);
    }
}

testConnection();
