#!/usr/bin/env npx tsx
/**
 * Test posting to Instagram via Publer API with a real article
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PUBLER_API_KEY = 'e8bcee4e3d98779e9cde07c17c527eded20fe72151c9be0c';
const PUBLER_WORKSPACE_ID = '693f80c4702206b9560c6b76';
const PUBLER_INSTAGRAM_ACCOUNT_ID = '693f85f7b6fa709ab8fa5ec4';

async function testFullFlow() {
    // 1. Get a real article
    const result = await pool.query(`
    SELECT id, title, excerpt, image_url, category, slug, facebook_headline
    FROM articles 
    WHERE is_published = true 
      AND instagram_post_id IS NULL 
      AND interest_score >= 4 
      AND image_url IS NOT NULL
    ORDER BY published_at DESC
    LIMIT 1
  `);

    if (result.rows.length === 0) {
        console.log('No eligible articles found');
        await pool.end();
        return;
    }

    const article = result.rows[0];
    console.log('Testing with article:', article.title.substring(0, 50));

    // Convert WebP to JPG
    let imageUrl = article.image_url;
    if (imageUrl.includes('cloudinary.com') && imageUrl.endsWith('.webp')) {
        imageUrl = imageUrl.replace('/upload/', '/upload/f_jpg/').replace('.webp', '.jpg');
    }
    console.log('Image URL:', imageUrl);

    // 2. Upload media
    console.log('\n1. Uploading media...');
    const uploadResponse = await fetch('https://app.publer.com/api/v1/media/from-url', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
            'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ media: [{ url: imageUrl, type: 'image', in_library: false }] })
    });
    const uploadData = await uploadResponse.json() as any;
    console.log('Upload job_id:', uploadData.job_id);

    // 3. Wait and check status
    await new Promise(r => setTimeout(r, 5000));
    const statusResponse = await fetch(`https://app.publer.com/api/v1/job_status/${uploadData.job_id}`, {
        headers: { 'Authorization': `Bearer-API ${PUBLER_API_KEY}`, 'Publer-Workspace-Id': PUBLER_WORKSPACE_ID }
    });
    const statusData = await statusResponse.json() as any;

    if (!statusData.payload?.[0]?.id) {
        console.log('❌ Upload failed:', JSON.stringify(statusData));
        await pool.end();
        return;
    }
    const mediaId = statusData.payload[0].id;
    console.log('✅ Media ID:', mediaId);

    // 4. Create Instagram post
    console.log('\n2. Creating Instagram post...');
    const headline = article.facebook_headline || article.title;
    const categorySlug = article.category.toLowerCase().replace(/\s+/g, '-');
    const articleUrl = `https://phuketradar.com/${categorySlug}/${article.slug}-${article.id}`;
    const caption = `${headline}\n\n${article.excerpt}\n\n📰 Read full story: ${articleUrl}\n\n#Phuket #PhuketNews #Thailand`;

    const postBody = {
        bulk: {
            posts: [{
                networks: {
                    instagram: {
                        text: caption,
                        media_ids: [mediaId],
                        type: 'photo'
                    }
                },
                accounts: [PUBLER_INSTAGRAM_ACCOUNT_ID]
            }]
        }
    };

    console.log('Caption:', caption.substring(0, 100) + '...');

    const postResponse = await fetch('https://app.publer.com/api/v1/posts/schedule/publish', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
            'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody)
    });
    const postData = await postResponse.json() as any;
    console.log('Post job_id:', postData.job_id);

    if (postData.error) {
        console.log('❌ Post error:', postData.error);
        await pool.end();
        return;
    }

    // 5. Check post status
    console.log('\n3. Waiting 5 seconds for post to process...');
    await new Promise(r => setTimeout(r, 5000));
    const postStatusResponse = await fetch(`https://app.publer.com/api/v1/job_status/${postData.job_id}`, {
        headers: { 'Authorization': `Bearer-API ${PUBLER_API_KEY}`, 'Publer-Workspace-Id': PUBLER_WORKSPACE_ID }
    });
    const postStatusData = await postStatusResponse.json() as any;
    console.log('\nPost status:', JSON.stringify(postStatusData, null, 2));

    if (postStatusData.status === 'complete') {
        console.log('\n✅ SUCCESS! Check Instagram for the post.');

        // Update database
        await pool.query(`UPDATE articles SET instagram_post_id = $1 WHERE id = $2`, [`publer-${postData.job_id}`, article.id]);
        console.log('Database updated.');
    } else {
        console.log('\n⏳ Post may still be processing...');
    }

    await pool.end();
}

testFullFlow().catch(e => { console.error(e); process.exit(1); });
