import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";

// Manually load .env file BEFORE importing db
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function main() {
    console.log("🔍 Checking database schema...");

    // Dynamic import AFTER env vars are loaded
    const { db } = await import("../server/db");

    try {
        // Query postgres information_schema to check for the column
        const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'articles' 
      AND column_name = 'facebook_headline';
    `);

        if (result.rows.length > 0) {
            console.log("✅ SUCCESS: 'facebook_headline' column EXISTS in the remote database!");
            console.log("   Type:", result.rows[0].data_type);
        } else {
            console.log("❌ FAILURE: 'facebook_headline' column does NOT exist.");
        }
    } catch (error) {
        console.error("Error checking schema:", error);
    }

    process.exit(0);
}

main();
