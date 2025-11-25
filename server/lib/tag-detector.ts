import { TAG_DEFINITIONS } from '@shared/core-tags';

/**
 * Detect tags from article title and content
 * Searches for keyword matches defined in TAG_DEFINITIONS
 * 
 * @param title Article title
 * @param content Article content (HTML or plain text)
 * @returns Array of detected tag names
 */
export function detectTags(title: string, content: string): string[] {
    const detectedTags = new Set<string>();

    // Combine title and content for searching
    const searchText = `${title} ${content}`.toLowerCase();

    // Check each tag definition
    for (const def of TAG_DEFINITIONS) {
        // Check if ANY of the keywords for this tag match
        for (const keyword of def.keywords) {
            const keywordLower = keyword.toLowerCase();

            // Use word boundary regex to match whole words only
            // Escape special characters in keyword just in case
            const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');

            if (regex.test(searchText)) {
                detectedTags.add(def.name);
                break; // Found a match for this tag, move to next tag
            }
        }
    }

    return Array.from(detectedTags);
}
