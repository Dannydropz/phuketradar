#!/usr/bin/env tsx

/**
 * Generate Long-Lived Facebook Page Access Token
 * 
 * This script helps you generate a long-lived Page Access Token for your
 * existing Facebook app to use with N8N.
 * 
 * Setup:
 * 1. Add your Facebook app credentials to .env:
 *    FB_APP_ID=your_app_id
 *    FB_APP_SECRET=your_app_secret
 * 2. Run: tsx scripts/generate-facebook-token.ts
 * 3. Follow the prompts
 */

import * as readline from 'readline';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const FB_APP_ID = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;

if (!FB_APP_ID || !FB_APP_SECRET) {
    console.error('❌ Error: Missing Facebook app credentials');
    console.error('');
    console.error('Please add to your .env file:');
    console.error('FB_APP_ID=your_app_id');
    console.error('FB_APP_SECRET=your_app_secret');
    console.error('');
    console.error('Find these at: https://developers.facebook.com/apps');
    console.error('Go to: Settings → Basic');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function generateToken() {
    console.log('🔑 Facebook Long-Lived Page Access Token Generator');
    console.log('━'.repeat(80));
    console.log('');
    console.log('This will help you generate a long-lived Page Access Token (~60 days)');
    console.log('');

    // Step 1: Get short-lived User Access Token
    console.log('📋 STEP 1: Get a Short-Lived User Access Token');
    console.log('━'.repeat(80));
    console.log('');
    console.log('1. Open this URL in your browser:');
    console.log('');
    console.log(`   https://developers.facebook.com/tools/explorer/`);
    console.log('');
    console.log('2. Select your app from the dropdown (top right)');
    console.log('3. Click "Get User Access Token"');
    console.log('4. Select these permissions when prompted:');
    console.log('   ✅ pages_manage_posts');
    console.log('   ✅ pages_read_engagement');
    console.log('   ✅ pages_manage_metadata');
    console.log('5. Click "Generate Access Token"');
    console.log('6. Copy the token that appears');
    console.log('');

    const shortToken = await question('Paste your short-lived token here: ');
    console.log('');

    if (!shortToken || shortToken.length < 50) {
        console.error('❌ Invalid token. Please try again.');
        rl.close();
        process.exit(1);
    }

    // Step 2: Exchange for long-lived User Access Token
    console.log('🔄 STEP 2: Exchanging for Long-Lived User Token...');
    console.log('');

    const longLivedUserUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedUserUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUserUrl.searchParams.set('client_id', FB_APP_ID!);
    longLivedUserUrl.searchParams.set('client_secret', FB_APP_SECRET!);
    longLivedUserUrl.searchParams.set('fb_exchange_token', shortToken);

    try {
        const userResponse = await fetch(longLivedUserUrl.toString());
        const userData = await userResponse.json();

        if (userData.error) {
            console.error('❌ Error exchanging token:');
            console.error(JSON.stringify(userData.error, null, 2));
            console.error('');
            console.error('Common issues:');
            console.error('- Check your FB_APP_ID and FB_APP_SECRET are correct');
            console.error('- Ensure the token you pasted is valid');
            console.error('- Make sure token has the required permissions');
            rl.close();
            process.exit(1);
        }

        const longLivedUserToken = userData.access_token;
        console.log('✅ Long-lived user token obtained!');
        console.log('');

        // Step 3: Get Page Access Token
        console.log('📄 STEP 3: Getting Page Access Token...');
        console.log('');

        // DIRECTLY fetch the specific page token (Skipping the list to avoid "No pages found" error)
        const pageId = '786684811203574';
        const pageUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=access_token,name,id&access_token=${longLivedUserToken}`;

        const pageResponse = await fetch(pageUrl);
        const pageData = await pageResponse.json();

        if (pageData.error) {
            console.error('❌ Error fetching page token:');
            console.error(JSON.stringify(pageData.error, null, 2));
            rl.close();
            process.exit(1);
        }

        const selectedPage = pageData;
        console.log(`✅ Found Page: ${selectedPage.name}`);

        console.log('');
        console.log('━'.repeat(80));
        console.log('✅ SUCCESS! Your Long-Lived Page Access Token:');
        console.log('━'.repeat(80));
        console.log('');
        console.log('Page:', selectedPage.name);
        console.log('Page ID:', selectedPage.id);
        console.log('');
        console.log('🔑 Token (copy this):');
        console.log('');
        console.log(selectedPage.access_token);
        console.log('');
        console.log('━'.repeat(80));
        console.log('');
        console.log('📋 Next Steps:');
        console.log('');
        console.log('1. Add this token to your N8N environment variables:');
        console.log('   FB_PAGE_ACCESS_TOKEN=<paste token above>');
        console.log('');
        console.log('2. Also add these to N8N:');
        console.log('   FB_PAGE_ID=' + selectedPage.id);
        console.log('   DATABASE_URL=<your database url>');
        console.log('   SITE_BASE_URL=https://phuketradar.com');
        console.log('');
        console.log('3. Import the workflow: phuket-radar-facebook-autoposter-simple.json');
        console.log('');
        console.log('4. Test and activate!');
        console.log('');
        console.log('⏰ Token Expiry: ~60 days');
        console.log('💡 Run this script again when you need to refresh the token');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error);
        rl.close();
        process.exit(1);
    }

    rl.close();
}

generateToken();
