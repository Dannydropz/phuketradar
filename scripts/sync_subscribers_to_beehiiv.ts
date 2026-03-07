/**
 * One-time script to sync all existing local subscribers to Beehiiv.
 * Run once after the Beehiiv migration to backfill the list.
 *
 * Usage:
 *   PGSSLMODE=disable npx tsx scripts/sync_subscribers_to_beehiiv.ts
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { addBeehiivSubscriber } from "../server/lib/beehiiv-client";

async function syncAllSubscribers() {
    console.log("🚀 Starting one-time Beehiiv subscriber sync...\n");

    if (!process.env.BEEHIIV_API_KEY || !process.env.BEEHIIV_PUBLICATION_ID) {
        console.error("❌ BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID not set in .env");
        process.exit(1);
    }

    const subscribers = await storage.getAllActiveSubscribers();
    console.log(`👥 Found ${subscribers.length} active local subscribers to sync\n`);

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (const sub of subscribers) {
        try {
            const result = await addBeehiivSubscriber(sub.email, {
                utmSource: "phuketradar_website",
                utmMedium: "organic",
                utmCampaign: "backfill_migration",
                reactivateExisting: true,
                sendWelcomeEmail: false, // don't spam existing subscribers
            });

            if (result.success) {
                console.log(`  ✅ ${sub.email} → Beehiiv (status: ${result.status})`);
                synced++;
            } else {
                console.warn(`  ⚠️  ${sub.email} → failed: ${result.error}`);
                failed++;
            }
        } catch (err) {
            console.error(`  ❌ ${sub.email} → error:`, err);
            failed++;
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n🏁 Sync complete!`);
    console.log(`   ✅ Synced:  ${synced}`);
    console.log(`   ❌ Failed:  ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
}

syncAllSubscribers().catch(console.error);
