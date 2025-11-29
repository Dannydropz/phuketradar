import "dotenv/config";
import { metaBusinessSuiteService } from "../server/services/meta-business-suite-client";

async function main() {
    console.log('Starting Facebook Insights Sync...');

    if (!process.env.FB_PAGE_ACCESS_TOKEN || !process.env.FB_PAGE_ID) {
        console.error('Missing FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID env vars');
        process.exit(1);
    }

    try {
        const result = await metaBusinessSuiteService.batchUpdatePostInsights(7); // Sync last 7 days
        console.log(`Sync complete! Updated: ${result.updated}, Errors: ${result.errors}`);
    } catch (error) {
        console.error('Sync failed:', error);
    }

    process.exit(0);
}

main();
