/**
 * Fix the "bridge event" story - mistranslated Saphan Hin drain complaint
 * 
 * Issues:
 * 1. "สะพานภูเก็ต" was translated as "Phuket Bridge" - it's actually Saphan Hin (a park/promenade area)
 * 2. "bridge event" doesn't exist - it was a concert AT Saphan Hin, and a resident fell into an uncovered drain nearby
 * 3. Score 5/5 is absurd for an infrastructure complaint about an uncovered drain
 * 4. Should be draft status - this is barely newsworthy (someone tripping over poor infrastructure)
 * 
 * Usage: npx tsx scripts/fix-bridge-story.ts          (dry run)
 *        npx tsx scripts/fix-bridge-story.ts --apply   (apply changes)
 */

import "dotenv/config";
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

const ARTICLE_SLUG = 'local-resident-injured-in-fall-at-phuket-bridge-event-e15ec864';

// Corrected translation - nuanced and accurate
const NEW_TITLE = 'Resident Complains After Falling Into Uncovered Drain Near Saphan Hin';

const NEW_EXCERPT = 'A Phuket resident reported being injured after stepping into an uncovered drainage ditch near Saphan Hin, where a concert was being held. The resident blamed poor lighting and the missing drain cover for the accident.';

const NEW_CONTENT = `<p><strong>PHUKET TOWN, PHUKET –</strong> A local resident is calling for better infrastructure safety after falling into an uncovered drainage ditch while walking near Saphan Hin, where a concert was taking place.</p>

<p>The resident said the drain had no cover, and the area was particularly dark at the time due to the nearby concert setup. "I couldn't see where I was going — it was very dark around there, and I just stepped right into it," the resident said, adding that they sustained cuts and scrapes from the fall.</p>

<p>Photos shared online show an open concrete drainage channel with no cover or barriers, alongside a grassy verge near a pathway. A separate image shows a similar drain nearby with its cover in place, highlighting the inconsistency.</p>

<p>The resident questioned who could be held accountable for the hazard, expressing frustration that basic safety measures like drain covers and adequate lighting were not maintained in a public area — especially one being used for events.</p>`;

const NEW_FACEBOOK_HEADLINE = 'Resident injured after stepping into uncovered drain near Saphan Hin';

const NEW_INTEREST_SCORE = 2; // Infrastructure complaint, barely newsworthy

async function main() {
    const dryRun = !process.argv.includes('--apply');

    console.log('🔍 Fixing the "bridge event" story (mistranslated Saphan Hin drain complaint)');
    console.log(`📋 Mode: ${dryRun ? 'DRY RUN (add --apply to update)' : 'APPLYING CHANGES'}\n`);

    try {
        // Find the article
        const result = await pool.query(`
            SELECT id, title, slug, excerpt, content, interest_score, category, facebook_headline
            FROM articles 
            WHERE slug = $1
            LIMIT 1
        `, [ARTICLE_SLUG]);

        if (result.rows.length === 0) {
            console.log('❌ Article not found');
            process.exit(1);
        }

        const article = result.rows[0];
        console.log(`📰 Found: "${article.title}"`);
        console.log(`🆔 ID: ${article.id}`);
        console.log(`📊 Current Score: ${article.interest_score}/5`);
        console.log(`📂 Category: ${article.category}`);

        console.log(`\n━━━━ CHANGES ━━━━`);
        console.log(`\n📝 Title:`);
        console.log(`   OLD: "${article.title}"`);
        console.log(`   NEW: "${NEW_TITLE}"`);

        console.log(`\n📊 Score:`);
        console.log(`   OLD: ${article.interest_score}/5`);
        console.log(`   NEW: ${NEW_INTEREST_SCORE}/5`);

        console.log(`\n📱 Facebook:`);
        console.log(`   OLD: "${article.facebook_headline}"`);
        console.log(`   NEW: "${NEW_FACEBOOK_HEADLINE}"`);

        console.log(`\n📖 Excerpt:`);
        console.log(`   OLD: "${article.excerpt}"`);
        console.log(`   NEW: "${NEW_EXCERPT}"`);

        console.log(`\n📄 Content: [Updated with accurate Saphan Hin context, removed "bridge event" mistranslation]`);

        if (!dryRun) {
            await pool.query(`
                UPDATE articles 
                SET title = $1,
                    excerpt = $2,
                    content = $3,
                    interest_score = $4,
                    facebook_headline = $5
                WHERE id = $6
            `, [NEW_TITLE, NEW_EXCERPT, NEW_CONTENT, NEW_INTEREST_SCORE, NEW_FACEBOOK_HEADLINE, article.id]);

            console.log(`\n✅ Article updated successfully!`);
            console.log(`📌 Note: Story remains published but score reduced to ${NEW_INTEREST_SCORE}/5`);
            console.log(`   Consider manually setting to draft if you want to unpublish it.`);
        } else {
            console.log(`\n⏸️  Would update article (dry run mode)`);
            console.log(`\n💡 To apply changes, run with --apply flag:`);
            console.log(`   npx tsx scripts/fix-bridge-story.ts --apply`);
        }

    } catch (error) {
        console.error('Database error:', error);
        throw error;
    } finally {
        await pool.end();
    }

    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
