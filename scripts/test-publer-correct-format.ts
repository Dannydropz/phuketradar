#!/usr/bin/env npx tsx
/**
 * Test Publer API with CORRECT format per support's feedback
 */

import 'dotenv/config';

const PUBLER_API_KEY = 'e8bcee4e3d98779e9cde07c17c527eded20fe72151c9be0c';
const PUBLER_WORKSPACE_ID = '693f80c4702206b9560c6b76';
const PUBLER_INSTAGRAM_ACCOUNT_ID = '693f85f7b6fa709ab8fa5ec4';

async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

async function testCorrectFormat() {
    const imageUrl = 'https://res.cloudinary.com/deoln6rno/image/upload/f_jpg/v1765859868/phuketradar/news-1765859868422-6fee72a9.jpg';

    const headers = {
        'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
        'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
        'Content-Type': 'application/json'
    };

    console.log('Step 1: Upload media...');
    const uploadRes = await fetch('https://app.publer.com/api/v1/media/from-url', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            media: [{ url: imageUrl, name: 'phuket-test', type: 'image', in_library: false }]
        })
    });
    const uploadData = await uploadRes.json() as any;
    console.log('Upload job:', uploadData.job_id);

    // Poll until complete
    let mediaId: string | null = null;
    for (let i = 0; i < 15; i++) {
        await sleep(2000);
        const statusRes = await fetch(`https://app.publer.com/api/v1/job_status/${uploadData.job_id}`, { headers });
        const statusData = await statusRes.json() as any;
        console.log(`Attempt ${i + 1} - Status: ${statusData.status}`);
        if (statusData.payload?.[0]?.id) {
            mediaId = statusData.payload[0].id;
            console.log('Got media ID:', mediaId);
            break;
        }
    }

    if (!mediaId) {
        console.log('ERROR: Could not get media ID');
        return;
    }

    console.log('\nStep 2: Create Instagram post with CORRECT format...');

    // CORRECT FORMAT per Publer support:
    // - Use "networks" object
    // - Content goes inside networks.instagram
    // - accounts is array of objects with "id"
    // - media goes inside the network object, not at post level
    const postBody = {
        bulk: {
            state: "scheduled",  // Required even for immediate publishing
            posts: [{
                networks: {
                    instagram: {
                        type: "photo",
                        text: "CORRECT FORMAT TEST - Phuket Radar automation Dec 17 #phuket #automation",
                        media: [{ id: mediaId }]  // Media inside networks.instagram
                    }
                },
                accounts: [{ id: PUBLER_INSTAGRAM_ACCOUNT_ID }]  // Array of objects
            }]
        }
    };

    console.log('Request body:', JSON.stringify(postBody, null, 2));

    const postRes = await fetch('https://app.publer.com/api/v1/posts/schedule/publish', {
        method: 'POST',
        headers,
        body: JSON.stringify(postBody)
    });

    console.log('Response status:', postRes.status);
    const postData = await postRes.json() as any;
    console.log('Response:', JSON.stringify(postData, null, 2));

    if (postData.job_id) {
        // Poll for post status
        for (let i = 0; i < 15; i++) {
            await sleep(2000);
            const jobRes = await fetch(`https://app.publer.com/api/v1/job_status/${postData.job_id}`, { headers });
            const jobData = await jobRes.json() as any;
            console.log(`Attempt ${i + 1} - Status: ${jobData.status}`);
            if (jobData.payload && Object.keys(jobData.payload).length > 0) {
                console.log('Payload:', JSON.stringify(jobData.payload, null, 2));
            }
            if (jobData.status === 'complete') {
                break;
            }
        }
    }

    // Check published posts
    console.log('\nStep 3: Check recent published posts...');
    await sleep(3000);
    const postsRes = await fetch('https://app.publer.com/api/v1/posts?limit=5&state=published', { headers });
    const postsData = await postsRes.json() as any;
    console.log('Recent published posts:');
    postsData.posts?.slice(0, 5).forEach((p: any, i: number) => {
        console.log(`${i + 1}. ${p.text?.substring(0, 40)}...`);
        console.log(`   Account: ${p.account_id} | Link: ${p.post_link || 'N/A'}`);
    });
}

testCorrectFormat().catch(console.error);
