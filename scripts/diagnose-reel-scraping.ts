#!/usr/bin/env tsx

/**
 * Diagnose Facebook Reel/Video Scraping Issues
 * 
 * This script investigates why specific reels are not being picked up by the scraper.
 * Tests:
 * 1. Direct scraping of the specific reel URL
 * 2. Page scraping to see if reels appear in the feed
 * 3. Checking for any filtering logic that might skip reels
 */

import "dotenv/config";

const REEL_URL = "https://www.facebook.com/reel/845589071817523";
const PAGE_URL = "https://www.facebook.com/NewshawkPhuket";

async function testScrapeCreatorsReel() {
    const apiKey = process.env.SCRAPECREATORS_API_KEY;

    if (!apiKey) {
        console.log("❌ SCRAPECREATORS_API_KEY not set");
        return null;
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎬 TEST 1: Direct Reel Scraping via ScrapeCreators");
    console.log("=".repeat(80));
    console.log(`URL: ${REEL_URL}\n`);

    try {
        // Try the single post endpoint
        const response = await fetch(
            `https://api.scrapecreators.com/v1/facebook/post?url=${encodeURIComponent(REEL_URL)}`,
            {
                headers: {
                    'x-api-key': apiKey
                }
            }
        );

        console.log(`Response Status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ Error: ${errorText}`);

            // Try alternative URL formats
            console.log("\n🔄 Trying alternative URL formats...");

            const reelId = REEL_URL.match(/\/reel\/(\d+)/)?.[1];
            if (reelId) {
                const altUrls = [
                    `https://www.facebook.com/watch?v=${reelId}`,
                    `https://www.facebook.com/videos/${reelId}`,
                ];

                for (const altUrl of altUrls) {
                    console.log(`\nTrying: ${altUrl}`);
                    const altResponse = await fetch(
                        `https://api.scrapecreators.com/v1/facebook/post?url=${encodeURIComponent(altUrl)}`,
                        { headers: { 'x-api-key': apiKey } }
                    );
                    console.log(`Status: ${altResponse.status}`);
                    if (altResponse.ok) {
                        const data = await altResponse.json();
                        console.log(`✅ Success! Data:`);
                        console.log(JSON.stringify(data, null, 2));
                        return data;
                    }
                }
            }

            return null;
        }

        const data = await response.json();
        console.log("\n✅ Response Data:");
        console.log(JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error("❌ Error:", error);
        return null;
    }
}

async function testPageScraping() {
    const apiKey = process.env.SCRAPECREATORS_API_KEY;

    if (!apiKey) {
        console.log("❌ SCRAPECREATORS_API_KEY not set");
        return null;
    }

    console.log("\n" + "=".repeat(80));
    console.log("📄 TEST 2: Page Scraping to Find Reels");
    console.log("=".repeat(80));
    console.log(`Page URL: ${PAGE_URL}\n`);

    try {
        const response = await fetch(
            `https://api.scrapecreators.com/v1/facebook/profile/posts?url=${encodeURIComponent(PAGE_URL)}`,
            {
                headers: {
                    'x-api-key': apiKey
                }
            }
        );

        console.log(`Response Status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ Error: ${errorText}`);
            return null;
        }

        const data = await response.json();
        console.log(`\n📊 Total posts returned: ${data.posts?.length || 0}`);

        // Check for reels/videos in the response
        let reelCount = 0;
        let videoCount = 0;

        if (data.posts) {
            for (const post of data.posts) {
                const url = post.url || post.permalink || '';
                const isReel = url.includes('/reel/') || url.includes('/reels/');
                const isVideo = url.includes('/videos/') || post.videoDetails?.sdUrl || post.video?.sd_url;

                if (isReel) {
                    reelCount++;
                    console.log(`\n🎬 REEL FOUND:`);
                    console.log(`   URL: ${url}`);
                    console.log(`   ID: ${post.id}`);
                    console.log(`   Text: ${post.text?.substring(0, 100)}...`);
                    console.log(`   Video Details: ${JSON.stringify(post.videoDetails || post.video || 'none')}`);
                }

                if (isVideo) {
                    videoCount++;
                }
            }
        }

        console.log(`\n📈 Summary:`);
        console.log(`   Reels found: ${reelCount}`);
        console.log(`   Videos found: ${videoCount}`);
        console.log(`   Total posts: ${data.posts?.length || 0}`);

        // Show first 3 posts for debugging
        console.log(`\n📋 First 3 posts (structure preview):`);
        data.posts?.slice(0, 3).forEach((post: any, idx: number) => {
            console.log(`\n--- Post ${idx + 1} ---`);
            console.log(`ID: ${post.id}`);
            console.log(`URL: ${post.url || post.permalink || 'N/A'}`);
            console.log(`Text: ${post.text?.substring(0, 80)}...`);
            console.log(`Video: ${!!post.videoDetails || !!post.video}`);
            console.log(`Created: ${post.created_time}`);
        });

        return data;
    } catch (error) {
        console.error("❌ Error:", error);
        return null;
    }
}

async function checkSpecificReelInPageFeed() {
    const apiKey = process.env.SCRAPECREATORS_API_KEY;

    if (!apiKey) return;

    console.log("\n" + "=".repeat(80));
    console.log("🔍 TEST 3: Search for Specific Reel in Page Feed");
    console.log("=".repeat(80));

    const reelId = REEL_URL.match(/\/reel\/(\d+)/)?.[1];
    console.log(`Looking for Reel ID: ${reelId}\n`);

    try {
        // Fetch multiple pages
        let cursor: string | undefined;
        let found = false;

        for (let page = 1; page <= 3; page++) {
            const url = cursor
                ? `https://api.scrapecreators.com/v1/facebook/profile/posts?url=${encodeURIComponent(PAGE_URL)}&cursor=${cursor}`
                : `https://api.scrapecreators.com/v1/facebook/profile/posts?url=${encodeURIComponent(PAGE_URL)}`;

            console.log(`Fetching page ${page}...`);

            const response = await fetch(url, {
                headers: { 'x-api-key': apiKey }
            });

            if (!response.ok) break;

            const data = await response.json();
            console.log(`   Posts on page ${page}: ${data.posts?.length || 0}`);

            if (data.posts) {
                for (const post of data.posts) {
                    const postUrl = post.url || post.permalink || '';
                    if (reelId && (postUrl.includes(reelId) || post.id === reelId)) {
                        console.log(`\n🎯 FOUND THE SPECIFIC REEL!`);
                        console.log(JSON.stringify(post, null, 2));
                        found = true;
                        break;
                    }
                }
            }

            if (found) break;

            cursor = data.cursor;
            if (!cursor) {
                console.log("   No more pages available");
                break;
            }
        }

        if (!found) {
            console.log(`\n❌ Reel ${reelId} NOT found in the page feed (checked 3 pages)`);
            console.log("   Possible reasons:");
            console.log("   1. Reels might not be included in the profile/posts endpoint");
            console.log("   2. The reel might be too old (not in recent posts)");
            console.log("   3. Different API endpoint needed for reels");
        }
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

async function testApifyScraper() {
    const apiKey = process.env.APIFY_API_KEY;

    if (!apiKey) {
        console.log("\n❌ APIFY_API_KEY not set - skipping Apify test");
        return;
    }

    console.log("\n" + "=".repeat(80));
    console.log("🔄 TEST 4: Apify Scraper Test");
    console.log("=".repeat(80));
    console.log(`Testing with URL: ${REEL_URL}\n`);

    // Note: Apify requires running an actor which takes time
    // Just check if the API key is valid
    console.log("✅ APIFY_API_KEY is configured");
    console.log("   Apify is used as a fallback for manual single-post scrapes");
}

async function main() {
    console.log("🔍 FACEBOOK REEL SCRAPING DIAGNOSTIC");
    console.log("=====================================");
    console.log(`Target Reel: ${REEL_URL}`);
    console.log(`Target Page: ${PAGE_URL}`);
    console.log(`Time: ${new Date().toISOString()}\n`);

    // Check environment
    console.log("📋 Environment Check:");
    console.log(`   SCRAPECREATORS_API_KEY: ${process.env.SCRAPECREATORS_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   APIFY_API_KEY: ${process.env.APIFY_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   FACEBOOK_COOKIES: ${process.env.FACEBOOK_COOKIES ? '✅ Set' : '❌ Not set'}`);

    await testScrapeCreatorsReel();
    await testPageScraping();
    await checkSpecificReelInPageFeed();
    await testApifyScraper();

    console.log("\n" + "=".repeat(80));
    console.log("📝 DIAGNOSIS COMPLETE");
    console.log("=".repeat(80));
    console.log("\nNext steps based on results:");
    console.log("1. If direct reel scraping fails → ScrapeCreators may not support reels");
    console.log("2. If page feed has no reels → Reels are not returned in profile/posts endpoint");
    console.log("3. Solution: May need dedicated reel scraping or manual scrape feature");
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
