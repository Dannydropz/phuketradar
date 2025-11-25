import { TAG_DEFINITIONS } from '@shared/core-tags';

/**
 * Detect tags from article title and content
 * Searches for keyword matches defined in TAG_DEFINITIONS
 * Returns tags sorted by relevance score (Title matches > Content matches)
 * 
 * @param title Article title
 * @param content Article content (HTML or plain text)
 * @returns Array of detected tag names sorted by relevance
 */
export function detectTags(title: string, content: string): string[] {
    const tagScores = new Map<string, number>();

    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    const combinedText = `${titleLower} ${contentLower}`;

    // Check each tag definition
    for (const def of TAG_DEFINITIONS) {
        let score = 0;
        let matched = false;

        // Check if ANY of the keywords for this tag match
        for (const keyword of def.keywords) {
            const keywordLower = keyword.toLowerCase();
            // Escape special characters in keyword just in case
            const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');

            // Check Title (High Priority)
            if (regex.test(titleLower)) {
                score += 10;
                matched = true;
            }
            // Check Content (Standard Priority)
            // Only add content score if not already matched in title (or add to it? let's just add)
            // Actually, let's just check if it exists in content too
            else if (regex.test(contentLower)) {
                score += 1;
                matched = true;
            }

            if (matched) {
                // If matched on any keyword, record score and move to next tag
                // We take the highest score for any keyword (e.g. if one keyword is in title, score is at least 10)
                const currentScore = tagScores.get(def.name) || 0;
                tagScores.set(def.name, Math.max(currentScore, score));
                break;
            }
        }
    }

    // Convert to array and sort by score descending
    return Array.from(tagScores.entries())
        .sort((a, b) => {
            const scoreDiff = b[1] - a[1];
            if (scoreDiff !== 0) return scoreDiff;

            // Tie-breaker 1: Priority
            const defA = TAG_DEFINITIONS.find(t => t.name === a[0]);
            const defB = TAG_DEFINITIONS.find(t => t.name === b[0]);
            const priorityA = defA?.priority || 0;
            const priorityB = defB?.priority || 0;
            if (priorityA !== priorityB) return priorityB - priorityA;

            // Tie-breaker 2: Length (Longer is more specific)
            return b[0].length - a[0].length;
        })
        .map(entry => entry[0]); // Return just the tag names
}
