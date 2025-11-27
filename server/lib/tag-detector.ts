import { TAG_DEFINITIONS } from '@shared/core-tags';

/**
 * Detect tags from article title and content
 * Searches for keyword matches defined in TAG_DEFINITIONS
 * Returns tags sorted by relevance score (Title matches > Content matches)
 * 
 * IMPORTANT: For "National" category stories (events outside Phuket), exclude Phuket location tags
 * to avoid misleading links when Phuket is mentioned only as origin of people/teams, not event location.
 * 
 * @param title Article title
 * @param content Article content (HTML or plain text)
 * @param category Optional article category to filter tags (e.g., "National")
 * @returns Array of detected tag names sorted by relevance
 */
export function detectTags(title: string, content: string, category?: string): string[] {
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

    // CRITICAL: Exclude Phuket location tags from National category stories
    // National stories are about events outside Phuket (Hat Yai, Bangkok, etc.)
    // If "Phuket" appears, it's likely referring to people/teams FROM Phuket helping elsewhere,
    // NOT the event location. Linking Phuket tags in these stories is misleading.
    if (category === 'National') {
        const filteredScores = new Map<string, number>();
        Array.from(tagScores.entries()).forEach(([tagName, score]) => {
            const tagDef = TAG_DEFINITIONS.find(t => t.name === tagName);
            // Keep all non-location tags, but exclude Phuket-area location tags
            if (tagDef?.type !== 'location' || !isPhuketAreaTag(tagDef.name)) {
                filteredScores.set(tagName, score);
            }
        });
        // Replace tagScores with filtered version
        tagScores.clear();
        Array.from(filteredScores.entries()).forEach(([key, value]) => {
            tagScores.set(key, value);
        });
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

/**
 * Check if a tag name represents a Phuket-area location
 * Used to filter out Phuket location tags from National category stories
 */
function isPhuketAreaTag(tagName: string): boolean {
    const phuketAreaTags = [
        'Phuket', 'Phuket Town', 'Greater Phuket', 'Mueang Phuket', 'Kathu', 'Thalang',
        'Patong', 'Karon', 'Kata', 'Kata Noi', 'Kamala', 'Surin', 'Bang Tao',
        'Cherng Talay', 'Laguna', 'Nai Thon', 'Nai Yang', 'Mai Khao', 'Rawai',
        'Nai Harn', 'Chalong', 'Wichit', 'Koh Kaew', 'Koh Siray', 'Pa Khlok',
        'Thepkrasattri', 'Srisoonthorn', 'Sakhu', 'Bang Jo', 'Rassada',
        // Roads and transport
        'Thepkrasattri Road', 'Chao Fah West Road', 'Chao Fah East Road',
        'Bypass Road', 'Patong Hill', 'Kata Hill', 'Karon Hill', 'Airport Road',
        'Heroines Monument', 'Sarasin Bridge', 'Phuket International Airport',
        'Rassada Pier', 'Chalong Pier', 'Bang Rong Pier', 'Ao Po Pier',
        // Beaches
        'Patong Beach', 'Karon Beach', 'Kata Beach', 'Kata Noi Beach',
        'Kamala Beach', 'Surin Beach', 'Bang Tao Beach', 'Layan Beach',
        'Nai Thon Beach', 'Nai Yang Beach', 'Mai Khao Beach', 'Nai Harn Beach',
        'Ao Yon Beach', 'Panwa Beach', 'Freedom Beach', 'Paradise Beach',
        'Ya Nui Beach', 'Laem Sing Beach',
        // Venues
        'Bangla Road', 'OTOP Market', 'Phuket Walking Street', 'Phuket Weekend Market',
        'Chillva Market', 'Boat Avenue', 'Porto de Phuket', 'Central Phuket',
        'Jungceylon', 'Yacht Haven Marina', 'Ao Po Grand Marina', 'Royal Phuket Marina',
        'Boat Lagoon'
    ];
    return phuketAreaTags.includes(tagName);
}
