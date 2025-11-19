
import { imageDownloaderService } from "../server/services/image-downloader";

async function main() {
    const url = "https://scontent-ord5-2.xx.fbcdn.net/v/t39.30808-6/584840015_1137316148610414_5062064735278080204_n.jpg?stp=dst-jpg_s1080x2048_tt6&_nc_cat=105&ccb=1-7&_nc_sid=833d8c&_nc_ohc=kBDeXPNsw4cQ7kNvwFEo-4H&_nc_oc=AdmlKg7uuRUda-NeXq7-4kNxzQ2oR0jErSfUl4LL7jGC0JYb3_DZKom2QzYjUKRcKUk&_nc_zt=23&_nc_ht=scontent-ord5-2.xx&_nc_gid=2CmM167a8y2q0L07a4lkSw&oh=00_AfizQTE05KOn55fnTGUGWXvpi9GWNlgnDvD-oAMe9ucqag&oe=69227C9A";

    console.log("🧪 Testing download of specific URL...");
    console.log(`   URL: ${url}`);

    const result = await imageDownloaderService.downloadAndSaveImage(url, "test-specific");

    if (result) {
        console.log(`✅ Success! Saved to: ${result}`);
    } else {
        console.log("❌ Failed to download.");
    }
}

main();
