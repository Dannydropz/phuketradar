/**
 * Regenerate Switchy Short URLs Script
 * 
 * This script regenerates all existing Switchy short URLs with correct frontend paths.
 * Run this after deploying the fix for incorrect category URL generation.
 * 
 * Usage: npx tsx scripts/regenerate-switchy-urls.ts
 */

import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { isNotNull, eq } from "drizzle-orm";
import { buildArticleUrl } from "../shared/category-map";
import { switchyService } from "../server/services/switchy";

const BASE_URL = "https://phuketradar.com";

interface ArticleForRegeneration {
    id: string;
    title: string;
    category: string;
    slug: string | null;
    facebookHeadline: string | null;
    imageUrl: string | null;
    switchyShortUrl: string | null;
}

async function regenerateAllSwitchyUrls() {
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║     SWITCHY URL REGENERATION SCRIPT                            ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    // Check if Switchy is configured
    if (!switchyService.isConfigured()) {
        console.error("❌ SWITCHY_API_KEY not configured. Cannot regenerate URLs.");
        process.exit(1);
    }

    console.log("✅ Switchy API is configured\n");

    // Fetch all articles that have existing Switchy URLs
    console.log("🔍 Fetching articles with existing Switchy URLs...\n");

    const articlesWithSwitchy = await db
        .select({
            id: articles.id,
            title: articles.title,
            category: articles.category,
            slug: articles.slug,
            facebookHeadline: articles.facebookHeadline,
            imageUrl: articles.imageUrl,
            switchyShortUrl: articles.switchyShortUrl,
        })
        .from(articles)
        .where(isNotNull(articles.switchyShortUrl));

    console.log(`📊 Found ${articlesWithSwitchy.length} articles with Switchy URLs\n`);

    if (articlesWithSwitchy.length === 0) {
        console.log("✅ No articles need regeneration. Exiting.");
        process.exit(0);
    }

    // Statistics
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: { article: string; error: string }[] = [];

    // Process each article
    for (let i = 0; i < articlesWithSwitchy.length; i++) {
        const article = articlesWithSwitchy[i];
        const progress = `[${i + 1}/${articlesWithSwitchy.length}]`;

        console.log(`${progress} Processing: ${article.title.substring(0, 50)}...`);

        // Build the correct article URL
        const articlePath = buildArticleUrl({
            category: article.category,
            slug: article.slug,
            id: article.id,
        });
        const fullUrl = `${BASE_URL}${articlePath}`;

        console.log(`   📍 Correct URL: ${fullUrl}`);
        console.log(`   🔗 Old Switchy URL: ${article.switchyShortUrl}`);

        try {
            // Generate new Switchy short URL with correct path
            const result = await switchyService.createArticleLink(
                fullUrl,
                "bio", // Default platform
                article.facebookHeadline || article.title,
                article.imageUrl || undefined
            );

            if (result.success && result.link?.shortUrl) {
                // Update the database with the new URL
                await db
                    .update(articles)
                    .set({ switchyShortUrl: result.link.shortUrl })
                    .where(eq(articles.id, article.id));

                console.log(`   ✅ New Switchy URL: ${result.link.shortUrl}`);
                successCount++;
            } else {
                console.log(`   ❌ Failed: ${result.error || "Unknown error"}`);
                failedCount++;
                errors.push({
                    article: article.title.substring(0, 50),
                    error: result.error || "Unknown error",
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.log(`   ❌ Exception: ${errorMessage}`);
            failedCount++;
            errors.push({
                article: article.title.substring(0, 50),
                error: errorMessage,
            });
        }

        // Rate limiting - wait 500ms between API calls to avoid hitting rate limits
        if (i < articlesWithSwitchy.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        console.log(""); // Empty line for readability
    }

    // Print summary
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║     REGENERATION COMPLETE                                      ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    console.log(`📊 Results:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed:  ${failedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);

    if (errors.length > 0) {
        console.log("\n❌ Errors encountered:");
        errors.forEach((e, i) => {
            console.log(`   ${i + 1}. ${e.article}...`);
            console.log(`      Error: ${e.error}`);
        });
    }

    console.log("\n✅ Script complete!");
    process.exit(0);
}

// Run the script
regenerateAllSwitchyUrls().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});
