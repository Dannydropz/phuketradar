import { getTagUrl } from '@shared/core-tags';

/**
 * Auto-link content with internal tag links
 * Finds the first occurrence of each tag in the HTML content and wraps it in an anchor tag
 * 
 * IMPORTANT: Only links the FIRST occurrence to avoid overwhelming readers
 * Does NOT link inside existing anchor tags
 * 
 * @param content HTML content string
 * @param tags Array of tag names to link
 * @returns Modified HTML content with internal links
 */
export function autoLinkContent(content: string, tags: string[]): string {
    if (!tags || tags.length === 0) {
        return content;
    }

    let modifiedContent = content;

    for (const tag of tags) {
        // Create regex to find the first occurrence of the tag (case-insensitive, whole word)
        // Negative lookahead to avoid matching inside existing anchor tags
        const regex = new RegExp(
            `(?<!<a[^>]*>.*?)\\b(${escapeRegex(tag)})\\b(?![^<]*<\\/a>)`,
            'i'
        );

        const match = regex.exec(modifiedContent);

        if (match) {
            const matchedText = match[1]; // Preserve original case
            const tagUrl = getTagUrl(tag);
            const replacement = `<a href="${tagUrl}" class="internal-link">${matchedText}</a>`;

            // Replace only the first occurrence
            modifiedContent = modifiedContent.replace(regex, replacement);
        }
    }

    return modifiedContent;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
