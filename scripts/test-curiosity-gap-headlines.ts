/**
 * Test script for Facebook Headline Generator with Curiosity Gap Strategy
 * 
 * This script tests the headline generation for various article types
 * to verify the 3 engagement angles are working correctly.
 * 
 * Usage: npx tsx scripts/test-curiosity-gap-headlines.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Manually load .env file
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
    console.log('🧪 Testing Curiosity Gap Facebook Headlines...\n');

    const { generateFacebookHeadlines, validateHeadline } = await import(
        '../server/services/facebook-headline-generator'
    );

    // Test cases covering different story types
    const testCases = [
        {
            name: 'Crime Story - Tourist Arrest',
            input: {
                title: 'Russian Tourist Arrested in Patong for Visa Overstay',
                content: `<p><strong>PATONG, PHUKET –</strong> A Russian tourist was arrested in Patong Beach on Thursday for overstaying his visa by 127 days.</p>
        <p>Immigration officers apprehended the 35-year-old man during a routine checkpoint on Bangla Road. The tourist faces a fine of 20,000 baht and deportation proceedings.</p>
        <p>According to Thai law, overstaying a visa by more than 90 days results in a ban from re-entering Thailand for 5 years.</p>`,
                excerpt: 'A Russian tourist was arrested in Patong for overstaying his visa by 127 days. He faces fines and deportation.',
                category: 'Crime',
                interestScore: 5,
                hasVideo: true,
                hasMultipleImages: false,
            },
        },
        {
            name: 'Traffic Accident with CCTV',
            input: {
                title: 'Two Injured in Patong Hill Motorcycle Collision',
                content: `<p><strong>PATONG, PHUKET –</strong> Two motorcyclists were injured in a collision on Patong Hill early Friday morning.</p>
        <p>CCTV footage shows the moment a truck merged lanes without signaling, causing the motorcycles to collide. Emergency services responded within 8 minutes.</p>
        <p>Both victims are in stable condition at Patong Hospital.</p>`,
                excerpt: 'Two motorcyclists injured after truck causes collision on Patong Hill. CCTV captured the incident.',
                category: 'Traffic',
                interestScore: 4,
                hasVideo: false,
                hasMultipleImages: true,
                hasCCTV: true,
            },
        },
        {
            name: 'Weather - Developing Flood Story',
            input: {
                title: 'Flash Flooding Hits Kathu, Multiple Roads Closed',
                content: `<p><strong>KATHU, PHUKET –</strong> Heavy rains have caused flash flooding in several areas of Kathu district.</p>
        <p>At least 5 roads have been closed including Wichit Songkram Road. Rescue teams are on standby.</p>
        <p>Authorities warn residents to avoid low-lying areas as more rain is expected.</p>`,
                excerpt: 'Flash floods close 5 roads in Kathu district. Authorities warn of more rain expected.',
                category: 'Weather',
                interestScore: 5,
                hasVideo: true,
                hasMultipleImages: true,
                isDeveloping: true,
            },
        },
        {
            name: 'Feel-Good Wildlife Story',
            input: {
                title: 'Sea Turtle Lays 124 Eggs at Karon Beach',
                content: `<p><strong>KARON, PHUKET –</strong> A green sea turtle laid 124 eggs at Karon Beach late Wednesday night.</p>
        <p>Marine conservation officers discovered the nest and have cordoned off the area. The eggs are expected to hatch in approximately 60 days.</p>
        <p>This is the third turtle nesting recorded in Phuket this season.</p>`,
                excerpt: 'Green sea turtle lays 124 eggs at Karon Beach. Conservation officers protect the nesting site.',
                category: 'Local',
                interestScore: 5,
                hasVideo: false,
                hasMultipleImages: true,
            },
        },
        {
            name: 'Tourist Scam Story',
            input: {
                title: 'British Couple Loses 80,000 Baht to Jet Ski Scam',
                content: `<p><strong>PATONG, PHUKET –</strong> A British couple has filed a police report after falling victim to an alleged jet ski damage scam.</p>
        <p>The tourists claim operators at Patong Beach demanded 80,000 baht for pre-existing scratches on a rental jet ski.</p>
        <p>Tourist police are investigating. The operators face charges of extortion.</p>`,
                excerpt: 'British tourists file police report after alleged jet ski scam at Patong Beach. Operators face charges.',
                category: 'Crime',
                interestScore: 5,
                hasVideo: false,
                hasMultipleImages: true,
            },
        },
    ];

    console.log('='.repeat(80));

    for (const testCase of testCases) {
        console.log(`\n📰 TEST CASE: ${testCase.name}`);
        console.log('-'.repeat(60));
        console.log(`   Title: "${testCase.input.title}"`);
        console.log(`   Category: ${testCase.input.category} | Score: ${testCase.input.interestScore}`);
        console.log(`   Has Video: ${testCase.input.hasVideo} | Multiple Images: ${testCase.input.hasMultipleImages}`);
        if (testCase.input.hasCCTV) console.log(`   Has CCTV: YES`);
        if (testCase.input.isDeveloping) console.log(`   Is Developing: YES`);

        console.log('\n   Generating headlines...\n');

        try {
            const result = await generateFacebookHeadlines(testCase.input);

            console.log(`   📸 VISUAL PROOF:`);
            console.log(`      "${result.visualProof}"`);
            const visualValidation = validateHeadline(result.visualProof);
            if (!visualValidation.valid) {
                console.log(`      ⚠️  Issues: ${visualValidation.issues.join(', ')}`);
            }

            console.log(`\n   ⚖️  SPECIFIC CONSEQUENCE:`);
            console.log(`      "${result.specificConsequence}"`);
            const consequenceValidation = validateHeadline(result.specificConsequence);
            if (!consequenceValidation.valid) {
                console.log(`      ⚠️  Issues: ${consequenceValidation.issues.join(', ')}`);
            }

            console.log(`\n   🚨 BREAKING/UPDATE:`);
            console.log(`      "${result.breakingUpdate}"`);
            const breakingValidation = validateHeadline(result.breakingUpdate);
            if (!breakingValidation.valid) {
                console.log(`      ⚠️  Issues: ${breakingValidation.issues.join(', ')}`);
            }

            console.log(`\n   ✅ RECOMMENDED (${result.recommendedAngle}):`);
            console.log(`      "${result.recommended}"`);
            console.log(`   💡 Reason: ${result.recommendingReason}`);

        } catch (error) {
            console.error(`   ❌ ERROR: ${error}`);
        }

        console.log('\n' + '='.repeat(80));
    }

    console.log('\n✅ Testing complete!');
}

main().catch(console.error);
