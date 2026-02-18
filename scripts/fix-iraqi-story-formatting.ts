/**
 * Script to fix article content formatting for the Iraqi shooting story
 * This uses direct SQL to update the content with proper HTML paragraph tags
 * 
 * Usage: npx tsx scripts/fix-iraqi-story-formatting.ts
 */

import "dotenv/config";
import pg from 'pg';
const { Pool } = pg;

// Connect to database without SSL (for local development)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

/**
 * Properly formats content with HTML paragraph tags
 */
function formatContentWithParagraphs(content: string): string {
    if (!content || content.trim() === '') return content;

    // Already well-formatted check
    const paragraphTagCount = (content.match(/<p[^>]*>/g) || []).length;
    if (paragraphTagCount >= 3) {
        console.log(`   ✅ Content already has ${paragraphTagCount} paragraph tags`);
        return content;
    }

    let formattedContent = content;

    // Normalize line breaks - handle various formats
    formattedContent = formattedContent.replace(/\\n\\n/g, '\n\n'); // Escaped newlines  
    formattedContent = formattedContent.replace(/\\n/g, '\n'); // Single escaped newlines
    formattedContent = formattedContent.replace(/\r\n/g, '\n'); // Windows newlines
    formattedContent = formattedContent.replace(/\n\n+/g, '</p><p>'); // Double newlines to paragraph breaks
    formattedContent = formattedContent.replace(/\n/g, '</p><p>'); // Single newlines to paragraph breaks

    // If still no paragraph breaks, try splitting at sentence boundaries
    if (!formattedContent.includes('</p><p>')) {
        // Strip HTML tags for sentence detection but preserve them
        const textWithoutTags = formattedContent.replace(/<[^>]+>/g, '');
        const sentences = textWithoutTags.split(/(?<=[.!?])\s+(?=[A-Z])/);

        if (sentences.length >= 4) {
            // For content with inline HTML, use more careful splitting
            // Look for natural break points
            const naturalBreakPatterns = [
                /(?<=\.)\s*(?=Authorities)/,
                /(?<=\.)\s*(?=Initial)/,
                /(?<=\.)\s*(?=Police)/,
                /(?<=\.)\s*(?=While)/,
                /(?<=\.)\s*(?=Meanwhile)/,
                /(?<=\.)\s*(?=However)/,
                /(?<=\.)\s*(?=According)/,
            ];

            for (const pattern of naturalBreakPatterns) {
                formattedContent = formattedContent.replace(pattern, '</p><p>');
            }
        }
    }

    // If we still don't have enough breaks, use sentence-based splitting
    const breakCount = (formattedContent.match(/<\/p><p>/g) || []).length;
    if (breakCount < 2) {
        // Fall back to splitting every 2-3 sentences
        let textContent = formattedContent
            .replace(/<\/p><p>/g, ' ')
            .replace(/<\/?p>/g, '')
            .trim();

        const sentences = textContent.split(/(?<=[.!?])\s+(?=[A-Z])/);

        if (sentences.length >= 4) {
            const paragraphs: string[] = [];
            let currentParagraph: string[] = [];

            sentences.forEach((sentence, index) => {
                currentParagraph.push(sentence);
                if (currentParagraph.length >= 3 || index === sentences.length - 1) {
                    paragraphs.push(currentParagraph.join(' '));
                    currentParagraph = [];
                }
            });

            if (currentParagraph.length > 0) {
                paragraphs.push(currentParagraph.join(' '));
            }

            formattedContent = paragraphs.join('</p><p>');
            console.log(`   🔄 Split into ${paragraphs.length} paragraphs from ${sentences.length} sentences`);
        }
    }

    // Clean up and wrap in paragraph tags
    formattedContent = formattedContent.replace(/^\s*<\/p>/, '');
    formattedContent = formattedContent.replace(/<p>\s*$/, '');
    formattedContent = formattedContent.replace(/<p><p>/g, '<p>');
    formattedContent = formattedContent.replace(/<\/p><\/p>/g, '</p>');
    formattedContent = formattedContent.replace(/<p>\s*<\/p>/g, '');

    // Ensure proper wrapping  
    if (!formattedContent.trim().startsWith('<p')) {
        formattedContent = '<p>' + formattedContent;
    }
    if (!formattedContent.trim().endsWith('</p>')) {
        formattedContent = formattedContent + '</p>';
    }

    const newParagraphCount = (formattedContent.match(/<p[^>]*>/g) || []).length;
    console.log(`   📝 Formatting: 0 → ${newParagraphCount} paragraphs`);

    return formattedContent;
}

async function main() {
    const dryRun = !process.argv.includes('--apply');

    console.log('🔍 Finding the Iraqi shooting story...');
    console.log(`📋 Mode: ${dryRun ? 'DRY RUN (add --apply to update)' : 'APPLYING CHANGES'}\n`);

    try {
        // Find the article by specific slug
        const result = await pool.query(`
            SELECT id, title, content, slug
            FROM articles
            WHERE slug = 'iraqi-tourist-fatally-shot-in-patong-motorcycle-incident-1f7565d1'
               OR id = '1f7565d1-5a0b-4104-8059-eca733631b79'
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            console.log('❌ No articles found matching "Iraqi"');
            process.exit(0);
        }

        const article = result.rows[0];
        console.log(`📰 Found: ${article.title}`);
        console.log(`🆔 ID: ${article.id}`);
        console.log(`🔗 Slug: ${article.slug}`);

        const currentPTags = (article.content?.match(/<p[^>]*>/g) || []).length;
        console.log(`📊 Current <p> tag count: ${currentPTags}`);

        if (currentPTags >= 3) {
            console.log(`   ✅ Already well-formatted, no action needed`);
            process.exit(0);
        }

        const formattedContent = formatContentWithParagraphs(article.content);

        console.log(`\n📄 BEFORE (first 500 chars):`);
        console.log(`   ${article.content.substring(0, 500)}...\n`);
        console.log(`📄 AFTER (first 500 chars):`);
        console.log(`   ${formattedContent.substring(0, 500)}...\n`);

        if (!dryRun) {
            await pool.query(
                'UPDATE articles SET content = $1 WHERE id = $2',
                [formattedContent, article.id]
            );
            console.log(`✅ Updated article in database!`);
        } else {
            console.log(`⏸️  Would update article (dry run mode)`);
            console.log(`\n💡 To apply changes, run with --apply flag:`);
            console.log(`   npx tsx scripts/fix-iraqi-story-formatting.ts --apply`);
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
