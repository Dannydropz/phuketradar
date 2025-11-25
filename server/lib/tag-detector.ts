import { ALL_TAGS } from '@shared/core-tags';

/**
 * Detect tags from article title and content
 * Searches for exact keyword matches (case-insensitive)
 * 
 * @param title Article title
 * @param content Article content (HTML or plain text)
 * @returns Array of detected tag names
 */
export function detectTags(title: string, content: string): string[] {
    const detectedTags = new Set<string>();

    // Combine title and content for searching
    const searchText = `${title} ${content}`.toLowerCase();

    // Check each tag for exact word matches
    for (const tag of ALL_TAGS) {
        const tagLower = tag.toLowerCase();

        // Use word boundary regex to match whole words only
        const regex = new RegExp(`\\b${tagLower}\\b`, 'i');

        if (regex.test(searchText)) {
            detectedTags.add(tag);
        }
    }

    return Array.from(detectedTags);
}
