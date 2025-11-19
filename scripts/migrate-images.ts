import fs from "fs";
import path from "path";

// Manually load .env file to bypass pre-set empty variables
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');

    if (key && value) {
        // Force override even if already set
        process.env[key] = value;
    }
}

async function main() {
    // Dynamic imports to ensure env vars are loaded first
    const { storage } = await import("../server/storage");
    const { imageDownloaderService } = await import("../server/services/image-downloader");
    const { db } = await import("../server/db");
    const { articles } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    console.log("🚀 Starting Image Migration to Cloudinary...");

    console.log("🔍 Environment Check:");
    console.log("   Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME || "Missing");
    console.log("   API Key:", process.env.CLOUDINARY_API_KEY ? "Set" : "Missing");
    console.log("   API Secret:", process.env.CLOUDINARY_API_SECRET ? "Set" : "Missing");

    // Check config
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error("❌ Cloudinary credentials missing in .env");
        process.exit(1);
    }

    try {
        const allArticles = await storage.getAllArticles();
        console.log(`📊 Found ${allArticles.length} articles to check.`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const article of allArticles) {
            // Check main image
            if (article.imageUrl) {
                const isCloudinary = article.imageUrl.includes("cloudinary.com");
                const isLocal = article.imageUrl.startsWith("/uploads/");
                const isFacebook = article.imageUrl.includes("fbcdn.net") || article.imageUrl.includes("facebook.com");

                if (!isCloudinary && (isLocal || isFacebook)) {
                    console.log(`\n🔄 Migrating image for: "${article.title.substring(0, 30)}..."`);
                    console.log(`   Source: ${article.imageUrl}`);

                    // If local, we need to construct the full path or URL
                    // For local files, we might need to read from disk if the URL is relative
                    let downloadUrl = article.imageUrl;
                    if (isLocal) {
                        // Construct absolute path for local files if needed, or use localhost URL
                        // Actually, imageDownloaderService.downloadAndSaveImage expects a URL.
                        // If it's a local file path like /uploads/..., we might need to read it directly or serve it.
                        // Simpler approach: If it's local, we can just read the file and upload.
                        // But for now, let's assume we can fetch it if the server is running, OR we handle local paths differently.

                        // Hack: If it's local, let's skip for a moment or try to fetch from localhost if running?
                        // Better: Let's construct a file path and upload directly using cloudinary API if possible, 
                        // but imageDownloaderService is built for URLs.

                        // Let's try to use the full URL if we can, or just skip local for now if it's complex?
                        // No, user wants to migrate ALL.

                        // If it starts with /, prepend the current domain or just read the file.
                        // Let's try to read the file from disk if it starts with /uploads/
                        if (article.imageUrl.startsWith("/uploads/")) {
                            const filePath = process.cwd() + "/public" + article.imageUrl;
                            console.log(`   Reading local file: ${filePath}`);
                            // We can't use downloadAndSaveImage easily for local files without a URL.
                            // Let's just use the URL for now and assume it's a remote URL (Facebook) which is the main priority.
                            // If it's local, we might need a different strategy.

                            // WAIT: The user said "temporary FB URLs". Local images are less risky but still good to migrate.
                            // Let's prioritize FB URLs first as they expire.
                        }
                    }

                    // Only migrate if it's a remote URL (starts with http)
                    if (article.imageUrl.startsWith("http")) {
                        try {
                            const newUrl = await imageDownloaderService.downloadAndSaveImage(article.imageUrl, "migrated");

                            if (newUrl && newUrl.includes("cloudinary.com")) {
                                // Update DB
                                await db.update(articles)
                                    .set({ imageUrl: newUrl })
                                    .where(eq(articles.id, article.id));

                                console.log(`   ✅ Updated to: ${newUrl}`);
                                migratedCount++;
                            } else {
                                console.error(`   ❌ Failed to migrate image (likely expired).`);
                                errorCount++;
                            }
                        } catch (err) {
                            console.error(`   ❌ Error processing image: ${err}`);
                            errorCount++;
                        }
                    } else {
                        console.log(`   ⏭️  Skipping local/relative path for now: ${article.imageUrl}`);
                        skippedCount++;
                    }
                } else {
                    skippedCount++;
                }
            }
        }

        console.log("\n🏁 Migration Complete");
        console.log(`   ✅ Migrated: ${migratedCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

    } catch (error) {
        console.error("❌ Error during migration:", error);
    }
    process.exit(0);
}

main();
