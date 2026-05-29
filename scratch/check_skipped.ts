import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { pool, db } from "../server/db";
import { articles } from "../shared/schema";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("Querying articles by status...");
    const statusCounts = await db.select({
      status: articles.status,
      count: sql<number>`count(*)`
    }).from(articles).groupBy(articles.status);

    console.log("Articles status distribution:");
    statusCounts.forEach(row => {
      console.log(`- Status: "${row.status}", Count: ${row.count}`);
    });

  } catch (error) {
    console.error("Database query failed:", error);
  }
  process.exit(0);
}

run();
