/**
 * Core Tags Configuration
 * Defines the taxonomy for auto-detection and internal linking
 */

export type TagType = 'location' | 'topic' | 'event' | 'person' | 'business' | 'other';

export interface TagDefinition {
    name: string;
    keywords: string[]; // Keywords that trigger this tag (case-insensitive)
    type: TagType;
    priority?: number; // Higher number = higher priority (default 0)
}

export const TAG_DEFINITIONS: TagDefinition[] = [
    // 1. Geography & Locations
    // 1.1 Province-level / General
    { name: 'Phuket', keywords: ['phuket'], type: 'location', priority: 1 },
    { name: 'Phuket Town', keywords: ['phuket town', 'old town', 'phuket old town'], type: 'location', priority: 2 },
    { name: 'Greater Phuket', keywords: ['greater phuket'], type: 'location' },
    { name: 'Andaman Coast', keywords: ['andaman coast', 'andaman sea'], type: 'location' },
    { name: 'Southern Thailand', keywords: ['southern thailand'], type: 'location' },

    // 1.2 Districts (Amphoe)
    { name: 'Mueang Phuket', keywords: ['mueang phuket', 'mueang district'], type: 'location' },
    { name: 'Kathu', keywords: ['kathu'], type: 'location' },
    { name: 'Thalang', keywords: ['thalang'], type: 'location' },

    // 1.3 Subdistricts / Key Areas
    { name: 'Patong', keywords: ['patong'], type: 'location', priority: 2 },
    { name: 'Karon', keywords: ['karon'], type: 'location', priority: 2 },
    { name: 'Kata', keywords: ['kata'], type: 'location', priority: 2 },
    { name: 'Kata Noi', keywords: ['kata noi'], type: 'location', priority: 2 },
    { name: 'Kamala', keywords: ['kamala'], type: 'location', priority: 2 },
    { name: 'Surin', keywords: ['surin'], type: 'location', priority: 2 },
    { name: 'Bang Tao', keywords: ['bang tao', 'bangtao'], type: 'location', priority: 2 },
    { name: 'Cherng Talay', keywords: ['cherng talay', 'cherngtalay', 'choeng thale'], type: 'location', priority: 2 },
    { name: 'Laguna', keywords: ['laguna'], type: 'location', priority: 2 },
    { name: 'Nai Thon', keywords: ['nai thon', 'naithon'], type: 'location', priority: 2 },
    { name: 'Nai Yang', keywords: ['nai yang', 'naiyang'], type: 'location', priority: 2 },
    { name: 'Mai Khao', keywords: ['mai khao', 'maikhao'], type: 'location', priority: 2 },
    { name: 'Rawai', keywords: ['rawai'], type: 'location', priority: 2 },
    { name: 'Nai Harn', keywords: ['nai harn', 'naiharn'], type: 'location', priority: 2 },
    { name: 'Chalong', keywords: ['chalong'], type: 'location', priority: 2 },
    { name: 'Wichit', keywords: ['wichit'], type: 'location' },
    { name: 'Koh Kaew', keywords: ['koh kaew'], type: 'location' },
    { name: 'Koh Siray', keywords: ['koh siray', 'sirey'], type: 'location' },
    { name: 'Pa Khlok', keywords: ['pa khlok', 'pakhlok'], type: 'location' },
    { name: 'Thepkrasattri', keywords: ['thepkrasattri'], type: 'location' },
    { name: 'Srisoonthorn', keywords: ['srisoonthorn'], type: 'location' },
    { name: 'Sakhu', keywords: ['sakhu'], type: 'location' },
    { name: 'Bang Jo', keywords: ['bang jo', 'bangjo'], type: 'location', priority: 3 }, // User requested high priority
    { name: 'Rassada', keywords: ['rassada'], type: 'location' },

    // 1.4 Roads & Transport Nodes
    { name: 'Thepkrasattri Road', keywords: ['thepkrasattri road'], type: 'location' },
    { name: 'Chao Fah West Road', keywords: ['chao fah west'], type: 'location' },
    { name: 'Chao Fah East Road', keywords: ['chao fah east'], type: 'location' },
    { name: 'Bypass Road', keywords: ['bypass road'], type: 'location' },
    { name: 'Patong Hill', keywords: ['patong hill'], type: 'location' },
    { name: 'Kata Hill', keywords: ['kata hill'], type: 'location' },
    { name: 'Karon Hill', keywords: ['karon hill'], type: 'location' },
    { name: 'Airport Road', keywords: ['airport road'], type: 'location' },
    { name: 'Heroines Monument', keywords: ['heroines monument'], type: 'location' },
    { name: 'Sarasin Bridge', keywords: ['sarasin bridge'], type: 'location' },
    { name: 'Phuket International Airport', keywords: ['phuket international airport', 'hkt', 'airport'], type: 'location', priority: 2 },
    { name: 'Rassada Pier', keywords: ['rassada pier'], type: 'location' },
    { name: 'Chalong Pier', keywords: ['chalong pier'], type: 'location' },
    { name: 'Bang Rong Pier', keywords: ['bang rong pier'], type: 'location' },
    { name: 'Ao Po Pier', keywords: ['ao po pier'], type: 'location' },

    // 1.5 Beaches
    { name: 'Patong Beach', keywords: ['patong beach'], type: 'location', priority: 3 },
    { name: 'Karon Beach', keywords: ['karon beach'], type: 'location', priority: 3 },
    { name: 'Kata Beach', keywords: ['kata beach'], type: 'location', priority: 3 },
    { name: 'Kata Noi Beach', keywords: ['kata noi beach'], type: 'location', priority: 3 },
    { name: 'Kamala Beach', keywords: ['kamala beach'], type: 'location', priority: 3 },
    { name: 'Surin Beach', keywords: ['surin beach'], type: 'location', priority: 3 },
    { name: 'Bang Tao Beach', keywords: ['bang tao beach'], type: 'location', priority: 3 },
    { name: 'Layan Beach', keywords: ['layan beach'], type: 'location', priority: 3 },
    { name: 'Nai Thon Beach', keywords: ['nai thon beach'], type: 'location', priority: 3 },
    { name: 'Nai Yang Beach', keywords: ['nai yang beach'], type: 'location', priority: 3 },
    { name: 'Mai Khao Beach', keywords: ['mai khao beach'], type: 'location', priority: 3 },
    { name: 'Nai Harn Beach', keywords: ['nai harn beach'], type: 'location', priority: 3 },
    { name: 'Ao Yon Beach', keywords: ['ao yon beach'], type: 'location', priority: 3 },
    { name: 'Panwa Beach', keywords: ['panwa beach'], type: 'location', priority: 3 },
    { name: 'Freedom Beach', keywords: ['freedom beach'], type: 'location', priority: 3 },
    { name: 'Paradise Beach', keywords: ['paradise beach'], type: 'location', priority: 3 },
    { name: 'Ya Nui Beach', keywords: ['ya nui beach'], type: 'location', priority: 3 },
    { name: 'Laem Sing Beach', keywords: ['laem sing beach'], type: 'location', priority: 3 },

    // 1.6 Islands near Phuket
    { name: 'Phi Phi Islands', keywords: ['phi phi islands', 'koh phi phi'], type: 'location', priority: 2 },
    { name: 'Phang Nga Bay', keywords: ['phang nga bay'], type: 'location', priority: 2 },
    { name: 'James Bond Island', keywords: ['james bond island', 'khao phing kan'], type: 'location', priority: 2 },
    { name: 'Similan Islands', keywords: ['similan islands'], type: 'location', priority: 2 },
    { name: 'Surin Islands', keywords: ['surin islands'], type: 'location', priority: 2 },
    { name: 'Koh Racha', keywords: ['koh racha', 'racha yai', 'racha noi'], type: 'location', priority: 2 },
    { name: 'Coral Island', keywords: ['coral island', 'koh hey'], type: 'location', priority: 2 },
    { name: 'Koh Maiton', keywords: ['koh maiton'], type: 'location' },
    { name: 'Koh Yao Yai', keywords: ['koh yao yai'], type: 'location' },
    { name: 'Koh Yao Noi', keywords: ['koh yao noi'], type: 'location' },
    { name: 'Koh Lone', keywords: ['koh lone'], type: 'location' },
    { name: 'Coconut Island', keywords: ['coconut island', 'koh maphrao'], type: 'location' },
    { name: 'Koh Khai', keywords: ['koh khai'], type: 'location' },

    // 1.7 Venues & Zones
    { name: 'Bangla Road', keywords: ['bangla road', 'soi bangla'], type: 'location', priority: 2 },
    { name: 'OTOP Market', keywords: ['otop market'], type: 'location' },
    { name: 'Phuket Walking Street', keywords: ['phuket walking street', 'lard yai'], type: 'location' },
    { name: 'Phuket Weekend Market', keywords: ['phuket weekend market', 'naka market'], type: 'location' },
    { name: 'Chillva Market', keywords: ['chillva market'], type: 'location' },
    { name: 'Boat Avenue', keywords: ['boat avenue'], type: 'location' },
    { name: 'Porto de Phuket', keywords: ['porto de phuket'], type: 'location' },
    { name: 'Central Phuket', keywords: ['central phuket', 'central floresta', 'central festival'], type: 'location' },
    { name: 'Jungceylon', keywords: ['jungceylon'], type: 'location' },
    { name: 'Yacht Haven Marina', keywords: ['yacht haven marina'], type: 'location' },
    { name: 'Ao Po Grand Marina', keywords: ['ao po grand marina'], type: 'location' },
    { name: 'Royal Phuket Marina', keywords: ['royal phuket marina'], type: 'location' },
    { name: 'Boat Lagoon', keywords: ['boat lagoon'], type: 'location' },

    // 2. Events, Festivals & Seasons
    { name: 'Vegetarian Festival', keywords: ['vegetarian festival', 'nine emperor gods'], type: 'event', priority: 2 },
    { name: 'Songkran', keywords: ['songkran'], type: 'event', priority: 2 },
    { name: 'Loy Krathong', keywords: ['loy krathong'], type: 'event', priority: 2 },
    { name: 'Chinese New Year', keywords: ['chinese new year'], type: 'event' },
    { name: 'Old Town Festival', keywords: ['old town festival'], type: 'event' },
    { name: 'Phuket Pride', keywords: ['phuket pride'], type: 'event' },
    { name: 'Patong Carnival', keywords: ['patong carnival'], type: 'event' },
    { name: 'King’s Cup Regatta', keywords: ['king’s cup regatta', 'kings cup'], type: 'event' },
    { name: 'Phuket Yacht Show', keywords: ['phuket yacht show'], type: 'event' },
    { name: 'Phuket Raceweek', keywords: ['phuket raceweek'], type: 'event' },
    { name: 'Laguna Phuket Marathon', keywords: ['laguna phuket marathon'], type: 'event' },
    { name: 'Phuket Bike Week', keywords: ['phuket bike week', 'bike week'], type: 'event' },
    { name: 'Red Cross Fair', keywords: ['red cross fair'], type: 'event' },
    { name: 'High Season', keywords: ['high season', 'peak season'], type: 'event' },
    { name: 'Low Season', keywords: ['low season', 'rainy season', 'monsoon season'], type: 'event' },

    // 3. News Topic Categories
    // 3.1 Core News Sections
    { name: 'Breaking News', keywords: ['breaking news'], type: 'topic' },
    { name: 'Local News', keywords: ['local news'], type: 'topic' },
    { name: 'Community', keywords: ['community', 'community news'], type: 'topic' },
    { name: 'Business', keywords: ['business', 'business news'], type: 'topic' },
    { name: 'Tourism', keywords: ['tourism', 'tourism news'], type: 'topic' },
    { name: 'Environment', keywords: ['environment', 'environment news'], type: 'topic' },
    { name: 'Health', keywords: ['health', 'health news'], type: 'topic' },
    { name: 'Education', keywords: ['education', 'education news'], type: 'topic' },
    { name: 'Crime', keywords: ['crime', 'crime news'], type: 'topic', priority: 2 },
    { name: 'Court News', keywords: ['court news', 'court case'], type: 'topic' },
    { name: 'Politics', keywords: ['politics'], type: 'topic' },
    { name: 'Infrastructure', keywords: ['infrastructure'], type: 'topic' },
    { name: 'Weather', keywords: ['weather'], type: 'topic' },
    { name: 'Traffic', keywords: ['traffic', 'transport'], type: 'topic' },
    { name: 'Immigration', keywords: ['immigration', 'visa'], type: 'topic' },
    { name: 'Marine', keywords: ['marine', 'maritime'], type: 'topic' },

    // 3.2 Tourism / Lifestyle
    { name: 'Travel', keywords: ['travel'], type: 'topic' },
    { name: 'Hotels', keywords: ['hotels', 'resorts'], type: 'topic' },
    { name: 'Villas', keywords: ['villas'], type: 'topic' },
    { name: 'Rentals', keywords: ['rentals', 'airbnb'], type: 'topic' },
    { name: 'Restaurants', keywords: ['restaurants', 'dining'], type: 'topic' },
    { name: 'Nightlife', keywords: ['nightlife', 'bars', 'clubs'], type: 'topic' },
    { name: 'Shopping', keywords: ['shopping', 'malls'], type: 'topic' },
    { name: 'Wellness', keywords: ['wellness', 'spas', 'massage'], type: 'topic' },
    { name: 'Fitness', keywords: ['fitness', 'gyms', 'muay thai'], type: 'topic' },
    { name: 'Diving', keywords: ['diving', 'snorkeling'], type: 'topic' },
    { name: 'Golf', keywords: ['golf'], type: 'topic' },
    { name: 'Expats', keywords: ['expats', 'digital nomads', 'retirement'], type: 'topic' },
    { name: 'Cost of Living', keywords: ['cost of living'], type: 'topic' },

    // 3.3 Business & Economy
    { name: 'Real Estate', keywords: ['real estate', 'property market', 'condos', 'land'], type: 'topic' },
    { name: 'Construction', keywords: ['construction'], type: 'topic' },
    { name: 'Investment', keywords: ['investment'], type: 'topic' },
    { name: 'Aviation', keywords: ['aviation', 'airlines'], type: 'topic' },
    { name: 'Economy', keywords: ['economy'], type: 'topic' },
    { name: 'Banking', keywords: ['banking', 'cryptocurrency'], type: 'topic' },

    // 3.4 Society & Community
    { name: 'Local Government', keywords: ['local government', 'municipality', 'provincial hall'], type: 'topic' },
    { name: 'Charity', keywords: ['charity', 'fundraising', 'volunteers', 'ngos'], type: 'topic' },
    { name: 'Religion', keywords: ['religion', 'buddhism', 'temples', 'wats', 'shrines', 'mosques'], type: 'topic' },
    { name: 'Culture', keywords: ['culture', 'heritage', 'art'], type: 'topic' },

    // 3.5 Law, Crime & Safety
    { name: 'Drugs', keywords: ['drugs', 'drug trafficking', 'drug possession', 'drug bust'], type: 'topic', priority: 2 },
    { name: 'Scams', keywords: ['scam', 'fraud', 'money laundering', 'cybercrime'], type: 'topic', priority: 2 },
    { name: 'Corruption', keywords: ['corruption'], type: 'topic', priority: 2 },
    { name: 'Violence', keywords: ['violence', 'assault', 'fight', 'brawl', 'stabbing', 'shooting'], type: 'topic', priority: 2 },
    { name: 'Theft', keywords: ['theft', 'robbery', 'burglary', 'pickpocket', 'mugging'], type: 'topic', priority: 2 },
    { name: 'Murder', keywords: ['murder', 'homicide'], type: 'topic', priority: 3 },
    { name: 'Sexual Assault', keywords: ['sexual assault', 'harassment', 'rape'], type: 'topic', priority: 3 },
    { name: 'Police', keywords: ['police', 'police investigation', 'police raid', 'arrest'], type: 'topic', priority: 2 },
    { name: 'Road Safety', keywords: ['road safety', 'helmet campaign', 'drink driving'], type: 'topic' },
    { name: 'Marine Safety', keywords: ['marine safety', 'lifeguards'], type: 'topic' },
    { name: 'Fire Safety', keywords: ['fire safety'], type: 'topic' },

    // 4. Incident / Event-Type Tags
    // 4.1 Road & Transport Incidents
    { name: 'Accident', keywords: ['accident', 'crash', 'collision'], type: 'topic', priority: 2 },
    { name: 'Road Accident', keywords: ['road accident', 'car accident', 'motorbike accident', 'scooter accident'], type: 'topic', priority: 3 },
    { name: 'DUI', keywords: ['dui', 'drink driving', 'drunk driving'], type: 'topic', priority: 2 },
    { name: 'Traffic Jam', keywords: ['traffic jam', 'congestion', 'heavy traffic'], type: 'topic' },
    { name: 'Roadworks', keywords: ['roadworks', 'road closure'], type: 'topic' },

    // 4.2 Marine & Beach Incidents
    { name: 'Drowning', keywords: ['drowning', 'near-drowning', 'missing swimmer'], type: 'topic', priority: 3 },
    { name: 'Boat Accident', keywords: ['boat accident', 'speedboat accident', 'ferry accident', 'capsize'], type: 'topic', priority: 3 },
    { name: 'Marine Life Incident', keywords: ['marine life incident', 'jellyfish', 'shark sighting'], type: 'topic', priority: 2 },

    // 4.4 Fire / Disaster
    { name: 'Fire', keywords: ['fire', 'house fire', 'hotel fire', 'wildfire'], type: 'topic', priority: 3 },
    { name: 'Flooding', keywords: ['flood', 'floods', 'flooding', 'flash flood', 'inundation'], type: 'topic', priority: 3 },
    { name: 'Landslide', keywords: ['landslide'], type: 'topic', priority: 3 },
    { name: 'Storm', keywords: ['storm', 'heavy rain', 'strong wind'], type: 'topic', priority: 2 },
    { name: 'Earthquake', keywords: ['earthquake', 'tsunami alert'], type: 'topic', priority: 3 },

    // 4.5 Health
    { name: 'Disease Outbreak', keywords: ['outbreak', 'dengue', 'covid-19', 'virus'], type: 'topic', priority: 3 },

    // 5. People / Demographics
    { name: 'Tourists', keywords: ['tourist', 'tourists', 'foreign tourist'], type: 'person' },
    { name: 'Locals', keywords: ['local resident', 'locals', 'thais'], type: 'person' },
    { name: 'Russians', keywords: ['russian', 'russians'], type: 'person' },
    { name: 'Chinese', keywords: ['chinese'], type: 'person' },
    { name: 'Indians', keywords: ['indian', 'indians'], type: 'person' },
    { name: 'Australians', keywords: ['australian', 'australians'], type: 'person' },
    { name: 'British', keywords: ['british', 'britons', 'uk nationals'], type: 'person' },

    // 7. Environment & Animals
    { name: 'Conservation', keywords: ['conservation', 'national park', 'marine park'], type: 'topic' },
    { name: 'Pollution', keywords: ['pollution', 'waste', 'trash', 'plastic'], type: 'topic' },
    { name: 'Marine Life', keywords: ['marine life', 'sea turtles', 'dolphins', 'whales', 'sharks'], type: 'topic' },
    { name: 'Animals', keywords: ['animals', 'stray dogs', 'soi dogs', 'monkeys', 'elephants', 'snakes'], type: 'topic' },

    // 8. Lifestyle & Misc
    { name: 'Food', keywords: ['food', 'thai food', 'street food'], type: 'topic' },
    { name: 'Cannabis', keywords: ['cannabis', 'marijuana', 'weed', 'dispensary'], type: 'topic' },
    { name: 'Technology', keywords: ['technology', 'social media', 'viral video'], type: 'topic' }
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
