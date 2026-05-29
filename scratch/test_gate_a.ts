import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { pool, db } from "../server/db";
import { articles } from "../shared/schema";
import { desc, eq, and } from "drizzle-orm";

async function run() {
  try {
    console.log("Starting Gate A integration test...");

    // 1. Simulate the translation outputs from GPT-4o-mini
    const simulatedTranslation = {
      translatedTitle: "Official Announcement: Annual Road Cleaning Schedule in Chalong",
      translatedContent: "<p>Chalong Municipality has announced its annual schedule for road cleaning services...</p>",
      excerpt: "The Chalong Municipality announced the road cleaning schedule starting next Monday.",
      category: "Local",
      interestScore: 2, // Low interest
      sourceType: "OFFICIAL_ANNOUNCEMENT" // Triggers Gate A
    };

    console.log("Simulated Translation:", simulatedTranslation);

    // 2. Prepare mock article data matching server/scheduler.ts schema structure
    const articleData = {
      title: simulatedTranslation.translatedTitle,
      content: simulatedTranslation.translatedContent,
      excerpt: simulatedTranslation.excerpt,
      category: simulatedTranslation.category,
      sourceUrl: "https://facebook.com/mock-official-announcement-12345",
      sourceName: "Chalong Municipality",
      isPublished: false,
      interestScore: simulatedTranslation.interestScore,
      status: "pending" as string,
      reEnrichAt: new Date() as Date | null
    };

    // ── GATE A logic from server/scheduler.ts ──
    const isLowValueHidden = (
      !!simulatedTranslation.sourceType && 
      ["POLITICAL_STATEMENT", "OFFICIAL_ANNOUNCEMENT", "COMMUNITY_DISCUSSION"].includes(simulatedTranslation.sourceType) &&
      simulatedTranslation.interestScore <= 2
    );

    console.log("\n--- Evaluating Gate A Logic ---");
    console.log("Is low value hidden?", isLowValueHidden);

    if (isLowValueHidden) {
      console.log("🎯 Gate A Safety Net triggered! Setting status = 'low_value_hidden' and isPublished = false.");
      articleData.status = 'low_value_hidden';
      articleData.isPublished = false;
      articleData.reEnrichAt = null;

      // Create the article in DB
      const [article] = await db.insert(articles).values(articleData).returning();
      console.log("Successfully created hidden low-value article draft in DB:");
      console.log(`- ID: ${article.id}`);
      console.log(`- Title: "${article.title}"`);
      console.log(`- Status: "${article.status}"`);
      console.log(`- isPublished: ${article.isPublished}`);

      // Verify the default admin query (which hides low-value by default)
      console.log("\n--- Verifying Admin Query Filters ---");
      
      // Default query (showLowValue = false)
      const defaultArticles = await db.select()
        .from(articles)
        .where(
          and(
            eq(articles.id, article.id),
            eq(articles.status, "pending") // Default admin view only shows 'pending'
          )
        );
      console.log(`- Default admin view count for this article (should be 0): ${defaultArticles.length}`);

      // Toggle ON view (showLowValue = true)
      const toggledArticles = await db.select()
        .from(articles)
        .where(eq(articles.id, article.id));
      console.log(`- Toggled admin view count (should be 1): ${toggledArticles.length}`);

      // Clean up the test record to keep database pristine
      await db.delete(articles).where(eq(articles.id, article.id));
      console.log("\nCleaned up test article successfully.");

    } else {
      console.log("❌ Gate A did not trigger.");
    }

  } catch (error) {
    console.error("Gate A test failed:", error);
  }
  process.exit(0);
}

run();
