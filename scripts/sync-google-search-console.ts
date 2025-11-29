import "dotenv/config";
import { googleSearchConsoleService } from "../server/services/google-search-console-client";

async function main() {
    console.log('Starting Google Search Console Sync...');

    if (!process.env.GSC_SITE_URL || !process.env.GA_CLIENT_EMAIL || !process.env.GA_PRIVATE_KEY) {
        console.error('Missing Google Search Console credentials in .env');
        process.exit(1);
    }

    try {
        // GSC data is usually delayed by ~2 days, so we look back 3-5 days
        const result = await googleSearchConsoleService.batchSyncSearchMetrics(3);
        console.log(`Sync complete! Updated: ${result.updated}, Errors: ${result.errors}`);
    } catch (error) {
        console.error('Sync failed:', error);
    }

    process.exit(0);
}

main();
