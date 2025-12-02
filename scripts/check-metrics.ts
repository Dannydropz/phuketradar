import "dotenv/config";
import { db } from "../server/db";
import { articleMetrics } from "@shared/schema";
import { sql } from "drizzle-orm";

async function checkMetrics() {
    const result = await db.select({
        count: sql<number>`count(*)`,
        minDate: sql<string>`min(${articleMetrics.metricDate})`,
        maxDate: sql<string>`max(${articleMetrics.metricDate})`
    }).from(articleMetrics);

    console.log("Metrics Stats:", result[0]);
    process.exit(0);
}

checkMetrics();
