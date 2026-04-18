import { db } from "../server/db";
import { articles } from "../shared/schema";
import { like, eq } from "drizzle-orm";

async function main() {
    const result = await db.select().from(articles).where(like(articles.slug, "%air-india-express-flight-blocks-phuket-airport-runway-forces-multiple-diversions%")).limit(5);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}
main().catch(console.error);
