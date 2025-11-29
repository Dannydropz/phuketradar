import "dotenv/config";
import { pool } from "../server/db";
import fs from "fs";
import path from "path";

async function runMigration() {
    console.log('Running analytics migration...');

    try {
        const sqlPath = path.join(process.cwd(), 'migrations', 'analytics-schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

runMigration();
