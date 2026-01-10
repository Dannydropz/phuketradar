/**
 * Test: Verify headlines match actual assets
 * This ensures we don't say "See the video" when no video exists
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function main() {
    console.log('🧪 ASSET VERIFICATION TEST\n');
    console.log('Goal: Ensure headlines only mention assets that actually exist\n');
    console.log('='.repeat(80));

    const { generateFacebookHeadlines } = await import(
        '../server/services/facebook-headline-generator'
    );

    const testCases = [
        {
            name: '✅ HAS VIDEO - Should mention video',
            input: {
                title: 'Tourist Arrested in Patong After Street Fight',
                content: 'Police arrested a tourist after a street fight...',
                excerpt: 'Tourist arrested after street fight in Patong.',
                category: 'Crime',
                interestScore: 5,
                hasVideo: true,  // HAS VIDEO
                hasMultipleImages: true,
            },
            expectVideo: true,
        },
        {
            name: '❌ NO VIDEO - Should NOT mention video, use photos/details instead',
            input: {
                title: 'Jet Ski Scam Leaves Australian Tourist 100,000 Baht Poorer',
                content: 'An Australian family was allegedly scammed...',
                excerpt: 'Australian family loses 100,000 baht to jet ski scam.',
                category: 'Crime',
                interestScore: 5,
                hasVideo: false,  // NO VIDEO
                hasMultipleImages: true,  // But has photos
            },
            expectVideo: false,
        },
        {
            name: '❌ NO VIDEO, NO PHOTOS - Should focus on consequences/facts',
            input: {
                title: 'Visa Overstay Results in 5-Year Ban for Russian Tourist',
                content: 'A Russian tourist faces a 5-year ban from Thailand...',
                excerpt: 'Russian tourist banned for 5 years after visa overstay.',
                category: 'Crime',
                interestScore: 4,
                hasVideo: false,
                hasMultipleImages: false,  // Only 1 image
            },
            expectVideo: false,
        },
        {
            name: '✅ HAS CCTV - Should mention CCTV footage',
            input: {
                title: 'Motorcycle Collision on Patong Hill Captured on Camera',
                content: 'CCTV cameras captured a motorcycle collision...',
                excerpt: 'CCTV captures motorcycle collision on Patong Hill.',
                category: 'Traffic',
                interestScore: 4,
                hasVideo: false,
                hasMultipleImages: true,
                hasCCTV: true,  // HAS CCTV
            },
            expectVideo: false,  // No direct video, but CCTV mentioned in content
        },
    ];

    let passCount = 0;
    let failCount = 0;

    for (const testCase of testCases) {
        console.log(`\n${testCase.name}`);
        console.log('-'.repeat(60));
        console.log(`   hasVideo: ${testCase.input.hasVideo}`);
        console.log(`   hasMultipleImages: ${testCase.input.hasMultipleImages}`);
        console.log(`   hasCCTV: ${testCase.input.hasCCTV || false}`);

        try {
            const result = await generateFacebookHeadlines(testCase.input);

            // Check if the recommended headline mentions video when it shouldn't
            const videoWords = ['video', 'footage', 'watch', 'clip'];
            const hasVideoMention = videoWords.some(word =>
                result.recommended.toLowerCase().includes(word)
            );

            // Allow CCTV mention if hasCCTV is true
            const cctvMention = result.recommended.toLowerCase().includes('cctv');
            const allowedCCTV = testCase.input.hasCCTV && cctvMention;

            console.log(`\n   Recommended headline: "${result.recommended}"`);
            console.log(`   Angle: ${result.recommendedAngle}`);

            if (testCase.expectVideo) {
                if (hasVideoMention) {
                    console.log(`   ✅ PASS: Correctly mentions video (video exists)`);
                    passCount++;
                } else {
                    console.log(`   ⚠️ WEAK: Could mention video but didn't (acceptable)`);
                    passCount++;
                }
            } else {
                if (hasVideoMention && !allowedCCTV) {
                    console.log(`   ❌ FAIL: Mentions video but NO video exists!`);
                    console.log(`      This is a FALSE PROMISE that could hurt trust.`);
                    failCount++;
                } else {
                    console.log(`   ✅ PASS: Correctly avoids video mention (no video)`);
                    passCount++;
                }
            }

        } catch (error) {
            console.log(`   ❌ ERROR: ${error}`);
            failCount++;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 ASSET VERIFICATION RESULTS:');
    console.log(`   ✅ Passed: ${passCount}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failCount}/${testCases.length}`);

    if (failCount === 0) {
        console.log('\n🎉 SUCCESS! Headlines accurately reflect available assets.');
        console.log('   Users will never click expecting video and find only text.\n');
    } else {
        console.log('\n⚠️  ATTENTION: Some headlines make false asset claims.\n');
    }
}

main().catch(console.error);
