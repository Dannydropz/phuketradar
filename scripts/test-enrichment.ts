
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";

// Manually load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function main() {
    console.log("🧪 Testing Enrichment Merging Logic...");

    // Dynamic imports to ensure env vars are loaded first
    const { db } = await import("../server/db");
    const { articles } = await import("@shared/schema");
    const { StoryEnrichmentCoordinator } = await import("../server/services/story-enrichment-coordinator");
    const { storage } = await import("../server/storage");
    const { DuplicateDetectionService } = await import("../server/services/duplicate-detection");

    const coordinator = new StoryEnrichmentCoordinator();

    // Mock DuplicateDetectionService to bypass embedding check
    const mockDetector = new DuplicateDetectionService();
    mockDetector.findByEmbedding = async () => {
        // Return Article B when searching for Article A (and vice versa)
        // We'll set this up after creating the articles
        return [articleB];
    };

    // Inject mock into coordinator (bypass private)
    (coordinator as any).duplicateDetector = mockDetector;

    // 1. Create initial story
    const resultA = await db.insert(articles).values({
        title: "Heavy Rain Causes Flooding in Patong",
        content: "Heavy rain has caused flooding in Patong area. Traffic is moving slowly.",
        originalTitle: "Heavy Rain Causes Flooding in Patong",
        originalContent: "Heavy rain has caused flooding in Patong area. Traffic is moving slowly.",
        slug: "heavy-rain-patong-" + Date.now(),
        category: "weather",
        isDeveloping: true,
        publishedAt: new Date(),
        enrichmentCount: 0,
        excerpt: "Heavy rain causes flooding in Patong.",
        sourceUrl: "http://example.com/test-1"
    }).returning();

    const articleA = resultA[0];
    console.log(`📝 Created Article A (Main): ${articleA.id}`);

    // 2. Create update story (same location, different details)
    const resultB = await db.insert(articles).values({
        title: "Patong Hill Road Closed Due to Landslide",
        content: "The road over Patong Hill has been closed due to a landslide caused by the heavy rain. Police are redirecting traffic.",
        originalTitle: "Patong Hill Road Closed Due to Landslide",
        originalContent: "The road over Patong Hill has been closed due to a landslide caused by the heavy rain. Police are redirecting traffic.",
        slug: "patong-hill-closed-" + Date.now(),
        category: "traffic",
        isDeveloping: true,
        publishedAt: new Date(),
        enrichmentCount: 0,
        excerpt: "Patong Hill road closed due to landslide.",
        sourceUrl: "http://example.com/test-2"
    }).returning();

    const articleB = resultB[0];
    console.log(`📝 Created Article B (Update): ${articleB.id}`);

    // Update mock to return the other article
    (coordinator as any).duplicateDetector.findByEmbedding = async (embedding: any) => {
        return [articleB];
    };

    // 3. Run enrichment on Article A
    console.log("\n🔄 Running enrichment on Article A...");

    // We mock the storage.getDevelopingArticles to return just our test article
    const originalGetDeveloping = storage.getDevelopingArticles;
    storage.getDevelopingArticles = async () => [articleA];

    await coordinator.enrichDevelopingStories(storage);

    // Restore storage
    storage.getDevelopingArticles = originalGetDeveloping;

    // 4. Verify results
    const updatedA = await storage.getArticleById(articleA.id);
    const updatedB = await storage.getArticleById(articleB.id);

    console.log("\n📊 Results:");
    console.log(`Article A (Main) Title: "${updatedA?.title}"`);
    console.log(`Article A Content Length: ${updatedA?.content.length}`);
    console.log(`Article A Enrichment Count: ${updatedA?.enrichmentCount}`);

    if (updatedB?.mergedIntoId === articleA.id) {
        console.log(`✅ SUCCESS: Article B was merged into Article A`);
    } else {
        console.log(`❌ FAILURE: Article B was NOT merged (mergedIntoId: ${updatedB?.mergedIntoId})`);
    }

    // Cleanup
    await db.delete(articles).where(eq(articles.id, articleA.id));
    await db.delete(articles).where(eq(articles.id, articleB.id));
}

main();
