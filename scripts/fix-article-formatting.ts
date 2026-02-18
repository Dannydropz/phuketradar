/**
 * Script to fix article content formatting
 * Converts plain text with \n\n to proper HTML paragraph tags
 * 
 * Usage: npx tsx scripts/fix-article-formatting.ts "search term"
 */

import "dotenv/config";
import { db } from '../server/db';
import { articles } from '../shared/schema';
import { ilike, or, eq } from 'drizzle-orm';

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
    formattedContent = formattedContent.replace(/\n/g, '<br>'); // Single newlines to line breaks

    // If still no paragraph breaks, try splitting at sentence boundaries
    if (!formattedContent.includes('</p><p>')) {
        const sentences = formattedContent.split(/(?<=[.!?])\s+(?=[A-Z])/);
        if (sentences.length >= 4) {
            const paragraphs: string[] = [];
            let currentParagraph: string[] = [];

            sentences.forEach((sentence, index) => {
                currentParagraph.push(sentence);
                // Create paragraph every 2-3 sentences
                if (currentParagraph.length >= 3 || index === sentences.length - 1) {
                    paragraphs.push(currentParagraph.join(' '));
                    currentParagraph = [];
                }
            });

            if (currentParagraph.length > 0) {
                paragraphs.push(currentParagraph.join(' '));
            }

            formattedContent = paragraphs.join('</p><p>');
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

    // Preserve heading tags
    formattedContent = formattedContent.replace(/<p>\s*(<h[1-6][^>]*>)/gi, '$1');
    formattedContent = formattedContent.replace(/(<\/h[1-6]>)\s*<\/p>/gi, '$1');

    const newParagraphCount = (formattedContent.match(/<p[^>]*>/g) || []).length;
    console.log(`   📝 Formatting: ${paragraphTagCount} → ${newParagraphCount} paragraphs`);

    return formattedContent;
}

async function main() {
    const searchTerm = process.argv[2];
    const dryRun = !process.argv.includes('--apply');

    if (!searchTerm) {
        console.log('Usage: npx tsx scripts/fix-article-formatting.ts "search term" [--apply]');
        console.log('');
        console.log('Options:');
        console.log('  --apply    Actually update the database (without this flag, dry run mode)');
        process.exit(0);
    }

    console.log(`🔍 Searching for articles matching: "${searchTerm}"`);
    console.log(`📋 Mode: ${dryRun ? 'DRY RUN (add --apply to update)' : 'APPLYING CHANGES'}\n`);

    const matches = await db.select({
        id: articles.id,
        title: articles.title,
        content: articles.content,
        slug: articles.slug,
    })
        .from(articles)
        .where(or(
            ilike(articles.title, `%${searchTerm}%`),
            ilike(articles.slug, `%${searchTerm}%`)
        ))
        .limit(5);

    if (matches.length === 0) {
        console.log(`❌ No articles found matching: "${searchTerm}"`);
        process.exit(0);
    }

    for (const article of matches) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📰 ${article.title}`);
        console.log(`🆔 ${article.id}`);

        const currentPTags = (article.content?.match(/<p[^>]*>/g) || []).length;
        console.log(`📊 Current <p> tag count: ${currentPTags}`);

        if (currentPTags >= 3) {
            console.log(`   ✅ Already well-formatted, skipping`);
            continue;
        }

        const formattedContent = formatContentWithParagraphs(article.content || '');

        console.log(`\n📄 BEFORE (first 300 chars):`);
        console.log(`   ${article.content?.substring(0, 300)}...`);
        console.log(`\n📄 AFTER (first 300 chars):`);
        console.log(`   ${formattedContent.substring(0, 300)}...`);

        if (!dryRun) {
            await db.update(articles)
                .set({ content: formattedContent })
                .where(eq(articles.id, article.id));
            console.log(`\n✅ Updated article in database!`);
        } else {
            console.log(`\n⏸️  Would update article (dry run mode)`);
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Found ${matches.length} article(s)`);

    if (dryRun) {
        console.log(`\n💡 To apply changes, run with --apply flag`);
    }

    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
