
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
    console.log("🧪 Testing Facebook Headline Logic...");

    // Dynamic imports
    const { db } = await import("../server/db");
    const { articles } = await import("@shared/schema");
    const { postArticleToFacebook } = await import("../server/lib/facebook-service");
    const { storage } = await import("../server/storage");

    // 1. Create a test article with a Facebook headline
    const fbHeadline = "Tragedy at Bang Tao: Two family members drown despite red-flag warnings";
    const regularTitle = "Father and daughter drown at Bang Tao Beach";

    const [article] = await db.insert(articles).values({
        title: regularTitle,
        content: "A tragic incident occurred at Bang Tao Beach where two family members drowned...",
        excerpt: "Two tourists drowned at Bang Tao Beach yesterday.",
        slug: "test-fb-headline-" + Date.now(),
        category: "Local",
        isDeveloping: false,
        publishedAt: new Date(),
        facebookHeadline: fbHeadline,
        imageUrl: "https://example.com/image.jpg",
        sourceUrl: "https://example.com/source",
        isPublished: true
    }).returning();

    console.log(`📝 Created Article: ${article.id}`);
    console.log(`   Title: "${article.title}"`);
    console.log(`   FB Headline: "${article.facebookHeadline}"`);

    // 2. Mock the fetch function to intercept the Facebook API call
    const originalFetch = global.fetch;
    let postedMessage = "";

    global.fetch = async (url: any, options: any) => {
        const urlStr = url.toString();

        if (urlStr.includes("graph.facebook.com") && options?.method === "POST") {
            // Only parse body if it exists
            if (options.body) {
                try {
                    const body = JSON.parse(options.body as string);
                    // Capture the MAIN post message (not comments)
                    // We identify the main post by checking if it contains the headline or regular title
                    if (body.message && (body.message.includes(fbHeadline) || body.message.includes(regularTitle))) {
                        postedMessage = body.message;
                    }
                } catch (e) {
                    // Ignore JSON parse errors (some bodies might be FormData or other formats, though here likely JSON)
                }
            }

            // Return success response
            return {
                ok: true,
                json: async () => ({ id: "mock_post_id_" + Date.now() }),
                text: async () => "ok"
            } as any;
        }
        return originalFetch(url, options);
    };

    // 3. Trigger the Facebook post
    // Force environment to production-like to enable posting logic (but we mocked fetch)
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
        console.log("\n🚀 Triggering Facebook Post...");
        await postArticleToFacebook(article, storage);

        console.log("\n📊 Results:");
        const firstLine = postedMessage.split("\n")[0];
        console.log(`   Posted First Line: "${firstLine}"`);

        if (firstLine === fbHeadline) {
            console.log(`✅ SUCCESS: Used Facebook Headline!`);
        } else if (firstLine === regularTitle) {
            console.log(`❌ FAILURE: Used Regular Title instead of FB Headline`);
        } else {
            console.log(`❌ FAILURE: Unexpected output: "${firstLine}"`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        // Cleanup
        process.env.NODE_ENV = originalEnv;
        global.fetch = originalFetch;
        await db.delete(articles).where(eq(articles.id, article.id));
    }
}

main();
