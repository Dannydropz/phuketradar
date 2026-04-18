import { db } from "../server/db";
import { articles } from "../shared/schema";
import { like, eq } from "drizzle-orm";

async function main() {
    const result = await db.select().from(articles).where(like(articles.slug, "%0c5b13cd%"));
    if (result.length > 0) {
        const article = result[0];
        const newSlug = "air-india-express-flight-blocks-phuket-airport-runway-forces-multiple-diversions-0c5b13cd";
        await db.update(articles).set({ slug: newSlug }).where(eq(articles.id, article.id));
        console.log(`Updated slug for article ID ${article.id} to ${newSlug}`);
    } else {
        console.log("Article not found.");
    }
    process.exit(0);
}
main().catch(console.error);
