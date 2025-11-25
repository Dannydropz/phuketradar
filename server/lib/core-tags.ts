/**
 * Core Tags Configuration
 * Defines the taxonomy for auto-detection and internal linking
 */

export const CORE_TAGS = {
    // Geographic Locations in Phuket
    LOCATIONS: [
        'Patong',
        'Rawai',
        'Chalong',
        'Kathu',
        'Airport',
        'Thalang',
        'Phuket Town'
    ],

    // News Topics
    TOPICS: [
        'Crime',
        'Weather',
        'Traffic',
        'Business',
        'Tourism',
        'Cannabis'
    ]
} as const;

// All tags combined for easy iteration
export const ALL_TAGS = [
    ...CORE_TAGS.LOCATIONS,
    ...CORE_TAGS.TOPICS
];

// Generate slug from tag name
export function tagToSlug(tag: string): string {
    return tag.toLowerCase().replace(/\s+/g, '-');
}

// Generate tag URL
export function getTagUrl(tag: string): string {
    return `/tag/${tagToSlug(tag)}`;
}
