/**
 * ScrapeCreators Comments Endpoint Test Script
 * 
 * Tests the /v1/facebook/post/comments endpoint to see:
 * 1. What data structure is returned
 * 2. What fields are available per comment
 * 3. How to use this for adding story context
 * 
 * Usage: npx tsx scripts/test-scrapecreators-comments.ts
 */

import 'dotenv/config';

const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY;
const COMMENTS_API_URL = "https://api.scrapecreators.com/v1/facebook/post/comments";

// Test with real posts from PhuketRadar database
const TEST_POST_URLS = [
    // Recent pfbid format posts
    "https://www.facebook.com/phukethotnews/posts/pfbid028rCgSdkDnHA1s9VF4AL9Wui9taKZQ6cSUDzqPFYKg6dpZkrjFJz7cZdHXcG8xGjrl",
    "https://www.facebook.com/NewshawkPhuket/posts/pfbid02hBtJgDgLh1ccrLhhuvbyqex9AwdiJSbeKLECJHUJthWvURS5fKkfYfQm5zBrTckcl",
    // Try a popular page post (might have more comments)
    "https://www.facebook.com/PhuketTimeNews/posts/pfbid04ppZRX8uT3Y51m28t3wE9cM1DgG9bTBa6otXQA6YYLMbu19bZE2KLr2bkZz69wQjl",
];

interface CommentData {
    id?: string;
    text?: string;
    message?: string;
    author?: {
        name: string;
        id?: string;
        profileUrl?: string;
    };
    authorName?: string;
    likeCount?: number;
    likes?: number;
    replyCount?: number;
    replies?: number;
    timestamp?: string;
    createdTime?: string;
    created_time?: string;
    reactions?: {
        like?: number;
        love?: number;
        haha?: number;
        wow?: number;
        sad?: number;
        angry?: number;
    };
    parentId?: string;
    isReply?: boolean;
}

interface CommentsResponse {
    success?: boolean;
    comments?: CommentData[];
    data?: CommentData[];
    error?: string;
    message?: string;
}

async function testCommentsEndpoint() {
    console.log("🔍 Testing ScrapeCreators Comments Endpoint\n");
    console.log("=".repeat(60) + "\n");

    if (!SCRAPECREATORS_API_KEY) {
        console.error("❌ Error: SCRAPECREATORS_API_KEY not found in environment variables");
        console.log("   Make sure you have a .env file with SCRAPECREATORS_API_KEY set");
        process.exit(1);
    }

    console.log("✅ API Key found\n");

    for (const testUrl of TEST_POST_URLS) {
        console.log(`\n📡 Testing post: ${testUrl}\n`);
        console.log("-".repeat(60));

        try {
            // Try different parameter formats
            const paramFormats = [
                `?url=${encodeURIComponent(testUrl)}`,
                `?post_url=${encodeURIComponent(testUrl)}`,
                `?postUrl=${encodeURIComponent(testUrl)}`,
            ];

            for (const params of paramFormats) {
                const fullUrl = `${COMMENTS_API_URL}${params}`;
                console.log(`\n🔗 Trying: ${COMMENTS_API_URL}${params.substring(0, 50)}...`);

                const response = await fetch(fullUrl, {
                    headers: {
                        'x-api-key': SCRAPECREATORS_API_KEY,
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`   Status: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.log(`   ❌ Error response: ${errorText.substring(0, 200)}`);
                    continue;
                }

                const data: CommentsResponse = await response.json();

                console.log("\n📋 RAW API RESPONSE:");
                console.log(JSON.stringify(data, null, 2));

                // Analyze the response structure
                const comments = data.comments || data.data || [];

                if (comments.length === 0) {
                    console.log("\n⚠️  No comments returned (might be post with no comments or different response format)");
                    console.log("   Check the raw response above for actual structure");
                } else {
                    console.log(`\n✅ SUCCESS! Found ${comments.length} comments\n`);

                    console.log("📊 COMMENT FIELDS DETECTED:");
                    const firstComment = comments[0];
                    Object.keys(firstComment).forEach(key => {
                        const value = firstComment[key as keyof CommentData];
                        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                        console.log(`   • ${key}: ${valueStr.substring(0, 100)}${valueStr.length > 100 ? '...' : ''}`);
                    });

                    console.log("\n📝 TOP 5 COMMENTS (for context):");
                    comments.slice(0, 5).forEach((comment, idx) => {
                        const text = comment.text || comment.message || '(no text)';
                        const author = comment.author?.name || comment.authorName || 'Anonymous';
                        const likes = comment.likeCount || comment.likes || 0;

                        console.log(`\n   ${idx + 1}. [${likes} likes] ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}`);
                    });

                    // Summary for implementation
                    console.log("\n" + "=".repeat(60));
                    console.log("📋 IMPLEMENTATION NOTES:");
                    console.log("=".repeat(60));

                    // Check what fields are available
                    const hasText = comments.some(c => c.text || c.message);
                    const hasLikes = comments.some(c => c.likeCount !== undefined || c.likes !== undefined);
                    const hasTimestamp = comments.some(c => c.timestamp || c.createdTime || c.created_time);
                    const hasAuthor = comments.some(c => c.author || c.authorName);

                    console.log(`   ✅ Has comment text: ${hasText}`);
                    console.log(`   ✅ Has like counts: ${hasLikes}`);
                    console.log(`   ✅ Has timestamps: ${hasTimestamp}`);
                    console.log(`   ✅ Has author info: ${hasAuthor}`);

                    if (hasText && hasLikes) {
                        console.log("\n   🎯 READY FOR IMPLEMENTATION!");
                        console.log("   Can sort by likes and extract top comments for AI summarization.");
                    }
                }

                // Found working format, break the loop
                break;
            }

        } catch (error) {
            console.error(`\n❌ Error testing ${testUrl}:`, error);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Test complete!\n");
}

// Also test what a typical response looks like with more details
async function exploreEndpointVariations() {
    console.log("\n🔬 EXPLORING ENDPOINT VARIATIONS\n");

    if (!SCRAPECREATORS_API_KEY) return;

    // Try to discover available endpoints
    const endpoints = [
        "/v1/facebook/post/comments",
        "/v1/facebook/comments",
        "/v1/facebook/post",
    ];

    for (const endpoint of endpoints) {
        console.log(`\n📡 Checking endpoint: ${endpoint}`);
        try {
            const response = await fetch(`https://api.scrapecreators.com${endpoint}`, {
                method: 'OPTIONS',
                headers: {
                    'x-api-key': SCRAPECREATORS_API_KEY,
                }
            });
            console.log(`   Status: ${response.status}`);
        } catch (e) {
            console.log(`   Error: ${e}`);
        }
    }
}

// Run the test
testCommentsEndpoint()
    .then(() => exploreEndpointVariations())
    .catch(console.error);
