#!/usr/bin/env tsx

/**
 * Seed categories into the database
 */

import "dotenv/config";
import { db } from "../server/db";
import { categories } from "../shared/schema";
import { sql } from "drizzle-orm";

const CATEGORIES = [
    { id: "breaking-news", name: "Breaking News", slug: "breaking-news", displayOrder: 1 },
    { id: "local-news", name: "Local News", slug: "local-news", displayOrder: 2 },
    { id: "tourism", name: "Tourism", slug: "tourism", displayOrder: 3 },
    { id: "business", name: "Business", slug: "business", displayOrder: 4 },
    { id: "crime", name: "Crime & Safety", slug: "crime", displayOrder: 5 },
    { id: "environment", name: "Environment", slug: "environment", displayOrder: 6 },
    { id: "lifestyle", name: "Lifestyle", slug: "lifestyle", displayOrder: 7 },
    { id: "events", name: "Events", slug: "events", displayOrder: 8 },
];

async function seedCategories() {
    try {
        console.log("🌱 Seeding categories...");

        // Ensure table exists
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#3b82f6',
        icon TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_default BOOLEAN NOT NULL DEFAULT false
      );
    `);

        for (const category of CATEGORIES) {
            try {
                await db.insert(categories).values(category).onConflictDoNothing();
                console.log(`✅ ${category.name}`);
            } catch (error) {
                console.log(`⏭️  ${category.name} (already exists)`);
            }
        }

        console.log("\n✅ Categories seeded successfully!");
    } catch (error) {
        console.error("❌ Error seeding categories:", error);
        process.exit(1);
    }
}

seedCategories();
