
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Manually load .env file BEFORE importing db
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

// Dynamic imports
const { storage } = await import("../server/storage");

async function main() {
    console.log("🔍 Debugging Article Fetch...");

    // Try to fetch the specific article from the screenshot (or any article)
    // The slug in the screenshot is: heavy-rain-causes-flooding-in-patong-phuket-40366f4b
    const slug = "heavy-rain-causes-flooding-in-patong-phuket-40366f4b";

    console.log(`Attempting to fetch article with slug: ${slug}`);

    try {
        const article = await storage.getArticleBySlug(slug);
        if (article) {
            console.log("✅ Success! Article found:");
            console.log(`   ID: ${article.id}`);
            console.log(`   Title: ${article.title}`);
            console.log(`   FB Headline: ${article.facebookHeadline}`);
        } else {
            console.log("⚠️  Article not found (returned null/undefined)");
        }
    } catch (error) {
        console.error("❌ CRITICAL ERROR fetching article:");
        console.error(error);
    }

    // Also try fetching ANY article to see if it's a general issue
    console.log("\nAttempting to fetch first available article...");
    try {
        const all = await storage.getPublishedArticles();
        if (all.length > 0) {
            console.log(`✅ Success! Found ${all.length} articles.`);
            console.log(`   First article: ${all[0].title}`);
        } else {
            console.log("⚠️  No published articles found.");
        }
    } catch (error) {
        console.error("❌ CRITICAL ERROR fetching all articles:");
        console.error(error);
    }


    // TEST CRASH: Try to fetch by ID using the slug (simulating the fallback logic)
    console.log("\n⚠️  TESTING CRASH SCENARIO: calling getArticleById with a slug...");
    try {
        const crashTest = await storage.getArticleById(slug);
        console.log("✅ Did not crash. Result:", crashTest ? "Found" : "Not found");
    } catch (error) {
        console.error("❌ CONFIRMED CRASH in getArticleById:");
        console.error(error);
    }

    process.exit(0);
}

main();
