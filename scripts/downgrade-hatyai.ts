import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { ilike, eq } from "drizzle-orm";

async function downgradeHatYaiStories() {
    console.log("Downgrading Hat Yai stories...");

    try {
        // Find Hat Yai stories
        const hatYaiStories = await db.select().from(articles).where(ilike(articles.title, "%Hat Yai%"));

        console.log(`Found ${hatYaiStories.length} Hat Yai stories.`);

        for (const story of hatYaiStories) {
            console.log(`Downgrading: ${story.title} (Current Score: ${story.interestScore})`);

            await db.update(articles)
                .set({ interestScore: 3 })
                .where(eq(articles.id, story.id));

            console.log(`Updated to score 3.`);
        }

        console.log("Done!");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

downgradeHatYaiStories();
