#!/usr/bin/env tsx

/**
 * Migrate existing Facebook image URLs to Cloudinary
 * This script finds all articles with Facebook CDN URLs and re-uploads them to Cloudinary
 */

import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { sql } from "drizzle-orm";
import { imageDownloaderService } from "../server/services/image-downloader";

async function migrateImages() {
    try {
        console.log("🔄 Starting image migration to Cloudinary...\n");

        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.error("❌ Cloudinary not configured. Please set CLOUDINARY_* environment variables.");
            process.exit(1);
        }

        // Find all articles with Facebook CDN URLs
        const articlesWithFbImages = await db
            .select({
                id: articles.id,
                title: articles.title,
                imageUrl: articles.imageUrl,
            })
            .from(articles)
            .where(
                sql`${articles.imageUrl} LIKE '%fbcdn.net%' OR ${articles.imageUrl} LIKE '%facebook.com%'`
            );

        console.log(`📊 Found ${articlesWithFbImages.length} articles with Facebook images\n`);

        if (articlesWithFbImages.length === 0) {
            console.log("✅ No images to migrate!");
            return;
        }

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (const article of articlesWithFbImages) {
            if (!article.imageUrl) {
                skippedCount++;
                continue;
            }

            console.log(`\n📸 Processing: ${article.title.substring(0, 60)}...`);
            console.log(`   Current URL: ${article.imageUrl.substring(0, 80)}...`);

            try {
                // Download and upload to Cloudinary
                const cloudinaryUrl = await imageDownloaderService.downloadAndSaveImage(
                    article.imageUrl,
                    "migrated"
                );

                if (cloudinaryUrl && cloudinaryUrl !== article.imageUrl) {
                    // Update article with new Cloudinary URL
                    await db
                        .update(articles)
                        .set({ imageUrl: cloudinaryUrl })
                        .where(sql`${articles.id} = ${article.id}`);

                    console.log(`   ✅ Migrated to: ${cloudinaryUrl.substring(0, 80)}...`);
                    successCount++;
                } else if (cloudinaryUrl === article.imageUrl) {
                    console.log(`   ⏭️  Kept original URL (Cloudinary upload failed)`);
                    skippedCount++;
                } else {
                    console.log(`   ❌ Failed to migrate`);
                    failCount++;
                }

                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`   ❌ Error:`, error instanceof Error ? error.message : error);
                failCount++;
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log("📊 Migration Summary:");
        console.log(`   ✅ Successfully migrated: ${successCount}`);
        console.log(`   ❌ Failed: ${failCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log("=".repeat(60));

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrateImages();
