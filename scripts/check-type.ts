#!/usr/bin/env tsx

import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkColumnType() {
    try {
        const result = await db.execute(sql`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'articles' AND column_name = 'embedding';
    `);
        console.log("Current type:", result.rows[0]);
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

checkColumnType();
