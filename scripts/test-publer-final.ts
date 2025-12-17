#!/usr/bin/env npx tsx
/**
 * Final test of Publer API with proper polling
 */

import 'dotenv/config';

const PUBLER_API_KEY = 'e8bcee4e3d98779e9cde07c17c527eded20fe72151c9be0c';
const PUBLER_WORKSPACE_ID = '693f80c4702206b9560c6b76';
const PUBLER_INSTAGRAM_ACCOUNT_ID = '693f85f7b6fa709ab8fa5ec4';

async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

async function finalTest() {
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

    console.log('\nStep 2: Create Instagram post...');
    const postRes = await fetch('https://app.publer.com/api/v1/posts/schedule/publish', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            bulk: {
                posts: [{
                    text: 'AUTOMATED TEST from Phuket Radar - Dec 16 evening #phuket #automation',
                    type: 'photo',
                    media_ids: [mediaId],
                    accounts: [PUBLER_INSTAGRAM_ACCOUNT_ID]
                }]
            }
        })
    });

    const postData = await postRes.json() as any;
    console.log('Post job:', postData.job_id);

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

    // Check published posts
    console.log('\nStep 3: Check recent published posts...');
    await sleep(3000);
    const postsRes = await fetch('https://app.publer.com/api/v1/posts?limit=5&state=published', { headers });
    const postsData = await postsRes.json() as any;
    console.log('Recent published posts:');
    postsData.posts?.slice(0, 5).forEach((p: any) => {
        console.log(`- ${p.text?.substring(0, 40)}... | Account: ${p.account_id} | Link: ${p.post_link || 'N/A'}`);
    });
}

finalTest().catch(console.error);
