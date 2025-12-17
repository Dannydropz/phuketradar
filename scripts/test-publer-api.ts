#!/usr/bin/env npx tsx
/**
 * Test Publer API directly to verify it works
 */

import 'dotenv/config';

const PUBLER_API_KEY = 'e8bcee4e3d98779e9cde07c17c527eded20fe72151c9be0c';
const PUBLER_WORKSPACE_ID = '693f80c4702206b9560c6b76';
const PUBLER_INSTAGRAM_ACCOUNT_ID = '693f85f7b6fa709ab8fa5ec4';

// Test image URL - a simple public image
const TEST_IMAGE_URL = 'https://res.cloudinary.com/deoln6rno/image/upload/v1765856140/phuketradar/news-1765856140054-227139618881467.jpg';

async function testPublerAPI() {
    console.log('🧪 Testing Publer API directly...\n');

    // Step 1: Test media upload
    console.log('1. Testing media upload...');
    const uploadResponse = await fetch('https://app.publer.com/api/v1/media/from-url', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
            'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            media: [{
                url: TEST_IMAGE_URL,
                type: 'image',
                in_library: false
            }]
        })
    });

    const uploadData = await uploadResponse.json();
    console.log('Upload response:', JSON.stringify(uploadData, null, 2));

    if (!uploadData.job_id) {
        console.log('❌ No job_id returned from upload');
        return;
    }

    // Step 2: Wait and check job status
    console.log('\n2. Waiting 5 seconds for upload to process...');
    await new Promise(r => setTimeout(r, 5000));

    const statusResponse = await fetch(`https://app.publer.com/api/v1/job_status/${uploadData.job_id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
            'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
        }
    });

    const statusData = await statusResponse.json();
    console.log('Job status:', JSON.stringify(statusData, null, 2));

    if (statusData.status !== 'complete' || !statusData.payload?.[0]?.id) {
        console.log('❌ Media upload not complete or no media ID');
        return;
    }

    const mediaId = statusData.payload[0].id;
    console.log(`✅ Media ID: ${mediaId}`);

    // Step 3: Create a test post
    console.log('\n3. Creating Instagram post...');

    const postBody = {
        bulk: {
            posts: [
                {
                    networks: {
                        instagram: {
                            text: '🧪 Test post from Phuket Radar automation\n\nThis is a test - please ignore.\n\n#Test #PhuketRadar',
                            media_ids: [mediaId],
                            type: 'photo'
                        }
                    },
                    accounts: [PUBLER_INSTAGRAM_ACCOUNT_ID]
                }
            ]
        }
    };

    console.log('Post body:', JSON.stringify(postBody, null, 2));

    const postResponse = await fetch('https://app.publer.com/api/v1/posts/schedule/publish', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
            'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody)
    });

    const postData = await postResponse.json();
    console.log('\nPost response:', JSON.stringify(postData, null, 2));

    if (postData.job_id) {
        console.log('\n4. Waiting 5 seconds and checking post status...');
        await new Promise(r => setTimeout(r, 5000));

        const postStatusResponse = await fetch(`https://app.publer.com/api/v1/job_status/${postData.job_id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
                'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
            }
        });

        const postStatusData = await postStatusResponse.json();
        console.log('Post job status:', JSON.stringify(postStatusData, null, 2));

        if (postStatusData.status === 'complete') {
            console.log('\n✅ Post job completed! Check Instagram and Publer dashboard.');
        } else {
            console.log('\n⏳ Post job still processing or failed.');
        }
    } else {
        console.log('❌ No job_id returned from post request');
    }
}

testPublerAPI().catch(console.error);
