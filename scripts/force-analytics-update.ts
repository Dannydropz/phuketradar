import { execSync } from 'child_process';

console.log("🚀 Forcing full analytics update...");

try {
    console.log("\n1️⃣ Syncing Google Analytics...");
    execSync('npx tsx scripts/sync-google-analytics.ts', { stdio: 'inherit' });

    console.log("\n2️⃣ Syncing Google Search Console...");
    execSync('npx tsx scripts/sync-google-search-console.ts', { stdio: 'inherit' });

    console.log("\n3️⃣ Syncing Facebook Insights...");
    execSync('npx tsx scripts/sync-facebook-insights.ts', { stdio: 'inherit' });

    console.log("\n4️⃣ Recalculating Engagement Scores...");
    execSync('npx tsx scripts/run-smart-learning.ts', { stdio: 'inherit' });

    console.log("\n✅ All analytics updated successfully!");
} catch (error) {
    console.error("\n❌ Error updating analytics:", error);
}
