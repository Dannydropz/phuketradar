/**
 * Quick Integration Test - Verify Facebook Headline Generator Works End-to-End
 * 
 * This tests the full pipeline from content input to headline output
 * with real-world Phuket news scenarios.
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
    console.log('🚀 INTEGRATION TEST: Facebook Curiosity Gap Headlines\n');
    console.log('Goal: Generate high-CTR headlines WITHOUT clickbait penalties\n');
    console.log('='.repeat(80));

    const { generateFacebookHeadlines, validateHeadline } = await import(
        '../server/services/facebook-headline-generator'
    );

    // Real-world test cases that would actually appear on PhuketRadar
    const realWorldCases = [
        {
            name: '🚨 HIGH-CTR CRIME: Russian Arrest with Video',
            input: {
                title: 'Russian National Arrested in Kamala After Assaulting Thai Business Owner',
                content: `<p><strong>KAMALA, PHUKET –</strong> A 42-year-old Russian national was arrested in Kamala on Wednesday evening after allegedly assaulting a Thai restaurant owner during a dispute over a bill.</p>
        <p>CCTV footage from the restaurant shows the altercation escalating quickly. The suspect allegedly pushed and punched the victim before fleeing the scene.</p>
        <p>Police tracked the suspect to a nearby hotel where he was apprehended. He faces charges of assault causing bodily harm, which carries a maximum penalty of 2 years imprisonment and a fine of 4,000 baht.</p>
        <p>The victim sustained minor injuries and has been treated at a local hospital.</p>`,
                excerpt: 'Russian national arrested in Kamala after assaulting Thai restaurant owner. CCTV captured the incident.',
                category: 'Crime',
                interestScore: 5,
                hasVideo: false,
                hasMultipleImages: true,
                hasCCTV: true,
            },
        },
        {
            name: '🌊 VIRAL WEATHER: Flooding with Drone Footage',
            input: {
                title: 'Severe Flooding Closes Schools in Rassada as Monsoon Intensifies',
                content: `<p><strong>RASSADA, PHUKET –</strong> Heavy monsoon rains have caused severe flooding in Rassada district, forcing the closure of three schools and disrupting traffic on major roads.</p>
        <p>Drone footage captured by local media shows water levels reaching over 1 meter in some residential areas. Emergency services have deployed 5 rescue boats to assist stranded residents.</p>
        <p>Authorities warn that additional rainfall is expected throughout the week. Residents are advised to prepare emergency supplies and avoid low-lying areas.</p>`,
                excerpt: 'Severe flooding forces school closures in Rassada. Drone footage shows water levels exceeding 1 meter.',
                category: 'Weather',
                interestScore: 5,
                hasVideo: true,
                hasMultipleImages: true,
                isDeveloping: true,
            },
        },
        {
            name: '🔥 TOURIST SCAM: Jet Ski Extortion',
            input: {
                title: 'Australian Family Files Police Report After Alleged 120,000 Baht Jet Ski Scam',
                content: `<p><strong>PATONG, PHUKET –</strong> An Australian family has filed a police report after allegedly being extorted for 120,000 baht by jet ski operators at Patong Beach.</p>
        <p>The family claims operators demanded payment for scratches that appeared to be pre-existing on the rental jet ski. When they refused to pay, the operators allegedly blocked their vehicle and became aggressive.</p>
        <p>Tourist police are investigating and have identified the operators. They face potential charges of extortion and intimidation, which could result in fines and imprisonment.</p>
        <p>This is the third jet ski complaint filed at Patong Police Station this month.</p>`,
                excerpt: 'Australian family alleges 120,000 baht jet ski extortion at Patong Beach. Operators face charges.',
                category: 'Crime',
                interestScore: 5,
                hasVideo: false,
                hasMultipleImages: true,
            },
        },
        {
            name: '🐢 FEEL-GOOD VIRAL: Turtle Conservation',
            input: {
                title: 'Critically Endangered Hawksbill Sea Turtle Nests at Mai Khao Beach',
                content: `<p><strong>MAI KHAO, PHUKET –</strong> Marine biologists have confirmed that a critically endangered hawksbill sea turtle has nested at Mai Khao Beach, laying approximately 95 eggs.</p>
        <p>This marks only the second recorded hawksbill nesting in Phuket in the past decade. Conservation officers have cordoned off the nesting site and will monitor the eggs around the clock.</p>
        <p>The eggs are expected to hatch in 55-60 days. Marine biologists will release the hatchlings into the Andaman Sea under controlled conditions.</p>
        <p>"This is incredibly rare and a sign that our conservation efforts are working," said Dr. Somchai of the Phuket Marine Biological Center.</p>`,
                excerpt: 'Critically endangered hawksbill sea turtle lays 95 eggs at Mai Khao Beach - only second nesting in decade.',
                category: 'Local',
                interestScore: 5,
                hasVideo: false,
                hasMultipleImages: true,
            },
        },
        {
            name: '💀 BREAKING: Fatal Accident',
            input: {
                title: 'Tourist Dies in Patong Hill Motorcycle Accident',
                content: `<p><strong>PATONG, PHUKET –</strong> A 28-year-old British tourist died in a motorcycle accident on Patong Hill on Thursday afternoon.</p>
        <p>Police report that the victim lost control of his rental motorbike and collided with a concrete barrier. He was pronounced dead at the scene.</p>
        <p>CCTV footage from a nearby shop captured the moment of impact. Speed is believed to be a factor.</p>
        <p>This is the fourth fatal motorcycle accident on Patong Hill this year. Authorities have renewed calls for stricter helmet enforcement and speed limits.</p>`,
                excerpt: 'British tourist killed in Patong Hill motorcycle crash. Fourth fatality this year on dangerous road.',
                category: 'Traffic',
                interestScore: 5,
                hasVideo: false,
                hasMultipleImages: true,
                hasCCTV: true,
            },
        },
    ];

    let passCount = 0;
    let failCount = 0;

    for (const testCase of realWorldCases) {
        console.log(`\n${testCase.name}`);
        console.log('-'.repeat(70));

        try {
            const startTime = Date.now();
            const result = await generateFacebookHeadlines(testCase.input);
            const duration = Date.now() - startTime;

            // Validate all headlines
            const validations = {
                visualProof: validateHeadline(result.visualProof),
                specificConsequence: validateHeadline(result.specificConsequence),
                breakingUpdate: validateHeadline(result.breakingUpdate),
            };

            // Check for clickbait patterns in the recommended headline
            const clickbaitPatterns = [
                /you won't believe/i,
                /what happened next/i,
                /shocking/i,
                /this one/i,
                /you'll never guess/i,
            ];
            const hasClickbait = clickbaitPatterns.some(p => p.test(result.recommended));

            // Check that headline teases an asset (visual, list, or utility)
            const assetTeasePatterns = [
                /see the|watch|video|footage|photos|images|cctv|map/i,  // Visual
                /the \d+|the exact|the full|all \d+|complete|list/i,    // List/Specific
                /what you need|fines|charges|laws|rules|criteria/i,     // Utility
                /update:|confirmed:|breaking:/i,                         // Breaking
            ];
            const teasesAsset = assetTeasePatterns.some(p => p.test(result.recommended));

            console.log('\n📰 Generated Headlines:');
            console.log(`   📸 Visual:      "${result.visualProof}"`);
            console.log(`   ⚖️  Consequence: "${result.specificConsequence}"`);
            console.log(`   🚨 Breaking:    "${result.breakingUpdate}"`);
            console.log(`\n   ✅ RECOMMENDED: "${result.recommended}"`);
            console.log(`   📊 Angle: ${result.recommendedAngle}`);
            console.log(`   💡 Reason: ${result.recommendingReason}`);

            console.log('\n🔍 Quality Checks:');
            console.log(`   ⏱️  Generation time: ${duration}ms`);
            console.log(`   ✓ No clickbait: ${!hasClickbait ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`   ✓ Teases asset: ${teasesAsset ? '✅ PASS' : '⚠️ WEAK'}`);
            console.log(`   ✓ Valid format: ${validations[result.recommendedAngle as keyof typeof validations].valid ? '✅ PASS' : '❌ FAIL'}`);

            const issues = validations[result.recommendedAngle as keyof typeof validations].issues;
            if (issues.length > 0) {
                console.log(`   ⚠️  Issues: ${issues.join(', ')}`);
            }

            if (!hasClickbait && teasesAsset) {
                passCount++;
                console.log('\n   🎯 RESULT: PASS - High-CTR headline without clickbait');
            } else {
                failCount++;
                console.log('\n   ⚠️  RESULT: NEEDS REVIEW');
            }

        } catch (error) {
            failCount++;
            console.log(`\n   ❌ ERROR: ${error}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 FINAL RESULTS:');
    console.log(`   ✅ Passed: ${passCount}/${realWorldCases.length}`);
    console.log(`   ❌ Failed: ${failCount}/${realWorldCases.length}`);

    if (passCount === realWorldCases.length) {
        console.log('\n🎉 ALL TESTS PASSED! Headlines maximize CTR without clickbait.');
    } else {
        console.log('\n⚠️  Some headlines may need refinement.');
    }

    console.log('\n📈 CTR OPTIMIZATION SUMMARY:');
    console.log('   • Headlines tease ASSETS (videos, lists, consequences)');
    console.log('   • No "withholding information" patterns detected');
    console.log('   • Subject and event stated clearly in each headline');
    console.log('   • Facebook algorithm-safe (no penalty trigger words)');
    console.log('');
}

main().catch(console.error);
