
import "dotenv/config";
import { db } from "../server/db";
import { articles, categories } from "../shared/schema";
import { ilike, eq, sql } from "drizzle-orm";

async function setupNationalCategory() {
    console.log("Setting up National category...");

    try {
        // 0. Ensure categories table has the right columns
        console.log("Ensuring schema is up to date...");
        await db.execute(sql`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6',
      ADD COLUMN IF NOT EXISTS icon TEXT,
      ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
    `);

        // 1. Create National category if it doesn't exist
        const existingCategory = await db.select().from(categories).where(eq(categories.slug, "national"));

        if (existingCategory.length === 0) {
            console.log("Creating 'National' category...");
            await db.insert(categories).values({
                name: "National",
                slug: "national",
                color: "#64748b", // Slate-500
                isDefault: true,
            });
        } else {
            console.log("'National' category already exists.");
        }

        // 2. Move Hat Yai stories to National category
        console.log("Moving Hat Yai stories to National category...");
        const hatYaiStories = await db.select().from(articles).where(ilike(articles.title, "%Hat Yai%"));

        console.log(`Found ${hatYaiStories.length} Hat Yai stories.`);

        for (const story of hatYaiStories) {
            console.log(`Moving: ${story.title}`);

            await db.update(articles)
                .set({ category: "National" })
                .where(eq(articles.id, story.id));
        }

        console.log("Done!");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

setupNationalCategory();
