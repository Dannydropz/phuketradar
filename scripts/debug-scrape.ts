/**
 * Debug script to test scraping specific Facebook posts
 * 
 * Usage: npx tsx scripts/debug-scrape.ts <facebook-post-url>
 */

import 'dotenv/config';

const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY;
const SINGLE_POST_API = 'https://api.scrapecreators.com/v1/facebook/post';
const PAGE_POSTS_API = 'https://api.scrapecreators.com/v1/facebook/profile/posts';

async function testSinglePostEndpoint(postUrl: string): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING SINGLE POST ENDPOINT');
    console.log('='.repeat(80));
    console.log(`URL: ${postUrl}`);

    if (!SCRAPECREATORS_API_KEY) {
        console.error('❌ SCRAPECREATORS_API_KEY not set!');
        return;
    }

    try {
        const response = await fetch(`${SINGLE_POST_API}?url=${encodeURIComponent(postUrl)}`, {
            headers: {
                'x-api-key': SCRAPECREATORS_API_KEY
            }
        });

        console.log(`\n📡 Response Status: ${response.status}`);
        console.log(`📡 Response Status Text: ${response.statusText}`);

        const data = await response.json();

        console.log('\n📋 RESPONSE DATA:');
        console.log(JSON.stringify(data, null, 2));

        // Check for error fields
        if (data.error || data.errorDescription || data.success === false) {
            console.log('\n❌ API RETURNED ERROR:');
            console.log(`   Error: ${data.error || 'none'}`);
            console.log(`   Error Description: ${data.errorDescription || data.message || 'none'}`);
            console.log(`   Success: ${data.success}`);
        } else if (data.text || data.description) {
            console.log('\n✅ POST DATA FOUND:');
            console.log(`   Text Preview: ${(data.text || data.description)?.substring(0, 200)}...`);
            console.log(`   Has Image: ${!!(data.image || data.full_picture)}`);
            console.log(`   Has Video: ${!!(data.video || data.video_url)}`);
        } else {
            console.log('\n⚠️ UNEXPECTED RESPONSE STRUCTURE');
            console.log(`   Keys: ${Object.keys(data).join(', ')}`);
        }
    } catch (error) {
        console.error('\n❌ FETCH ERROR:', error);
    }
}

async function testPageEndpoint(pageUrl: string): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING PAGE POSTS ENDPOINT');
    console.log('='.repeat(80));
    console.log(`URL: ${pageUrl}`);

    if (!SCRAPECREATORS_API_KEY) {
        console.error('❌ SCRAPECREATORS_API_KEY not set!');
        return;
    }

    try {
        const response = await fetch(`${PAGE_POSTS_API}?url=${encodeURIComponent(pageUrl)}`, {
            headers: {
                'x-api-key': SCRAPECREATORS_API_KEY
            }
        });

        console.log(`\n📡 Response Status: ${response.status}`);
        console.log(`📡 Response Status Text: ${response.statusText}`);

        const data = await response.json();

        console.log(`\n📋 Response Success: ${data.success}`);
        console.log(`📋 Posts Count: ${data.posts?.length || 0}`);

        if (data.posts && data.posts.length > 0) {
            console.log('\n📰 FIRST 5 POSTS:');
            data.posts.slice(0, 5).forEach((post: any, idx: number) => {
                console.log(`\n--- Post ${idx + 1} ---`);
                console.log(`   ID: ${post.id}`);
                console.log(`   URL: ${post.url || post.permalink}`);
                console.log(`   Text: ${post.text?.substring(0, 100)}...`);
                console.log(`   Has Image: ${!!(post.image || post.full_picture)}`);
                console.log(`   Created: ${post.created_time}`);
            });
        }

        // Check for error
        if (!data.success || data.error) {
            console.log('\n❌ API RETURNED ERROR:');
            console.log(`   Error: ${data.error || 'none'}`);
            console.log(`   Message: ${data.message || 'none'}`);
        }
    } catch (error) {
        console.error('\n❌ FETCH ERROR:', error);
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: npx tsx scripts/debug-scrape.ts <facebook-post-url>');
        console.log('\nExamples:');
        console.log('  npx tsx scripts/debug-scrape.ts "https://www.facebook.com/PhuketTimeNews/posts/pfbid05Q3EwUipcSZJcpX98mz6cfV8Potv46Vf9mc6RZ6kiKN7ARHwAEf7kk2uiXApZBaCl"');
        console.log('  npx tsx scripts/debug-scrape.ts "https://www.facebook.com/phukethotnews/posts/pfbid0c8MAK1zjbyzaPMYJm5Sy2y16xyZ5qd67U9DsAsiVVJnSoetbH32aWf6SGmRUA28Hl"');

        // Run with default test URLs if no args
        console.log('\n🧪 Running with default test URLs...\n');

        const testUrls = [
            'https://www.facebook.com/PhuketTimeNews/posts/pfbid05Q3EwUipcSZJcpX98mz6cfV8Potv46Vf9mc6RZ6kiKN7ARHwAEf7kk2uiXApZBaCl',
            'https://www.facebook.com/phukethotnews/posts/pfbid0c8MAK1zjbyzaPMYJm5Sy2y16xyZ5qd67U9DsAsiVVJnSoetbH32aWf6SGmRUA28Hl'
        ];

        for (const url of testUrls) {
            await testSinglePostEndpoint(url);

            // Also test the page endpoint to find the post
            const pageMatch = url.match(/facebook\.com\/([^\/]+)\//);
            if (pageMatch) {
                await testPageEndpoint(`https://www.facebook.com/${pageMatch[1]}`);
            }

            console.log('\n');
        }
    } else {
        const postUrl = args[0];
        await testSinglePostEndpoint(postUrl);

        // Also test the page endpoint
        const pageMatch = postUrl.match(/facebook\.com\/([^\/]+)\//);
        if (pageMatch) {
            await testPageEndpoint(`https://www.facebook.com/${pageMatch[1]}`);
        }
    }
}

main().catch(console.error);
