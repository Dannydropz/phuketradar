
import { imageDownloaderService } from "../server/services/image-downloader";
import fs from "fs/promises";
import path from "path";

async function main() {
    console.log("🧪 Testing ImageDownloaderService...");

    // Test URL (Google logo)
    const testUrl = "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png";

    console.log(`⬇️  Downloading: ${testUrl}`);
    const result = await imageDownloaderService.downloadAndSaveImage(testUrl, "test");

    if (result) {
        console.log(`✅ Success! Saved to: ${result}`);

        // Verify file exists
        const fullPath = path.join(process.cwd(), "public", result);
        try {
            await fs.access(fullPath);
            console.log(`✅ File exists at: ${fullPath}`);

            // Clean up
            await fs.unlink(fullPath);
            console.log(`🧹 Cleaned up test file`);
        } catch (e) {
            console.error(`❌ File missing at: ${fullPath}`);
        }
    } else {
        console.error("❌ Download failed");
    }
}

main();
