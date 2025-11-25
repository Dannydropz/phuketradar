/**
 * Core Tags Configuration
 * Defines the taxonomy for auto-detection and internal linking
 */

export interface TagDefinition {
    name: string;
    keywords: string[]; // Keywords that trigger this tag (case-insensitive)
}

export const TAG_DEFINITIONS: TagDefinition[] = [
    // --- LOCATIONS ---
    { name: 'Patong', keywords: ['patong'] },
    { name: 'Rawai', keywords: ['rawai'] },
    { name: 'Chalong', keywords: ['chalong'] },
    { name: 'Kathu', keywords: ['kathu'] },
    { name: 'Airport', keywords: ['airport', 'hkt'] },
    { name: 'Phuket Town', keywords: ['phuket town', 'old town'] },
    { name: 'Thalang', keywords: ['thalang'] },
    { name: 'Bang Jo', keywords: ['bang jo', 'bangjo'] }, // User requested
    { name: 'Kamala', keywords: ['kamala'] },
    { name: 'Surin', keywords: ['surin'] },
    { name: 'Mai Khao', keywords: ['mai khao', 'maikhao'] },
    { name: 'Nai Harn', keywords: ['nai harn', 'naiharn'] },
    { name: 'Karon', keywords: ['karon'] },
    { name: 'Kata', keywords: ['kata'] },
    { name: 'Nai Yang', keywords: ['nai yang', 'naiyang'] },
    { name: 'Cherng Talay', keywords: ['cherng talay', 'cherngtalay'] },
    { name: 'Bang Tao', keywords: ['bang tao', 'bangtao'] },
    { name: 'Rassada', keywords: ['rassada'] },
    { name: 'Wichit', keywords: ['wichit'] },
    { name: 'Koh Kaew', keywords: ['koh kaew'] },

    // --- TOPICS ---
    { name: 'Crime', keywords: ['crime', 'police', 'arrest', 'drug', 'murder', 'theft', 'robbery', 'assault', 'illegal'] },
    { name: 'Weather', keywords: ['weather', 'rain', 'storm', 'monsoon', 'forecast', 'temperature', 'heat'] },
    { name: 'Flooding', keywords: ['flood', 'floods', 'flooding', 'inundation', 'water level', 'overflow'] }, // User requested
    { name: 'Traffic', keywords: ['traffic', 'road', 'accident', 'congestion', 'jam', 'crash', 'collision'] },
    { name: 'Business', keywords: ['business', 'economy', 'market', 'investment', 'real estate', 'property'] },
    { name: 'Tourism', keywords: ['tourism', 'tourist', 'travel', 'visitor', 'hotel', 'resort', 'airport', 'flight'] },
    { name: 'Cannabis', keywords: ['cannabis', 'marijuana', 'weed', 'ganja', 'hemp'] },
    { name: 'Community', keywords: ['community', 'local', 'resident', 'volunteer', 'donation', 'charity', 'help'] }, // User requested
    { name: 'Environment', keywords: ['environment', 'pollution', 'trash', 'waste', 'beach clean', 'nature'] },
    { name: 'Politics', keywords: ['politics', 'government', 'election', 'governor', 'official'] },
    { name: 'Health', keywords: ['health', 'hospital', 'disease', 'virus', 'medical', 'doctor'] },
    { name: 'Education', keywords: ['education', 'school', 'university', 'student', 'teacher'] },
    { name: 'Sports', keywords: ['sports', 'football', 'soccer', 'muay thai', 'marathon', 'race'] }
];

// Helper to get just the tag names (for backward compatibility if needed)
export const ALL_TAGS = TAG_DEFINITIONS.map(t => t.name);

// Generate slug from tag name
export function tagToSlug(tag: string): string {
    return tag.toLowerCase().replace(/\s+/g, '-');
}

// Generate tag URL
export function getTagUrl(tag: string): string {
    return `/tag/${tagToSlug(tag)}`;
}
