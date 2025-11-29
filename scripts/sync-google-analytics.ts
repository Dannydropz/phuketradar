import "dotenv/config";
import { googleAnalyticsService } from "../server/services/google-analytics-client";

async function main() {
    console.log('Starting Google Analytics Sync...');

    if (!process.env.GA_PROPERTY_ID || !process.env.GA_CLIENT_EMAIL || !process.env.GA_PRIVATE_KEY) {
        console.error('Missing Google Analytics credentials in .env');
        process.exit(1);
    }

    try {
        const result = await googleAnalyticsService.batchSyncArticleMetrics(7); // Sync last 7 days
        console.log(`Sync complete! Updated: ${result.updated}, Errors: ${result.errors}`);
    } catch (error) {
        console.error('Sync failed:', error);
    }

    process.exit(0);
}

main();
