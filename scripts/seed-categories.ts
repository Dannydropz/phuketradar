#!/usr/bin/env tsx

/**
 * Seed categories into the database
 */

import "dotenv/config";
import { db } from "../server/db";
import { categories } from "@shared/schema";

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
        console.log("🌱 Seeding categories...\n");

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
