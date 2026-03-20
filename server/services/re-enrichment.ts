import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { IStorage } from "../storage";
import { translatorService } from "./translator";
import { articleMetrics } from "@shared/schema";

const rssParser = new Parser();

interface EnglishSource {
    name: string;
    searchUrl: string;
    baseUrl: string;
    rssFeedUrl?: string; // Optional RSS feed URL
}

const SOURCES: EnglishSource[] = [
    {
        name: 'The Thaiger',
        searchUrl: 'https://thethaiger.com/?s=',
        baseUrl: 'https://thethaiger.com',
        rssFeedUrl: 'https://thethaiger.com/news/phuket/feed',
    },
    {
        name: 'Khaosod English',
        searchUrl: 'https://www.khaosodenglish.com/?s=',
        baseUrl: 'https://www.khaosodenglish.com',
        rssFeedUrl: 'https://www.khaosodenglish.com/feed/',
    },
    // To be added later once system works:
    // {
    //   name: 'The Phuket News',
    //   searchUrl: 'https://www.thephuketnews.com/search.php?q=',
    //   baseUrl: 'https://www.thephuketnews.com',
    // },
    // {
    //   name: 'The Phuket Express',
    //   searchUrl: 'https://thephuketexpress.com/?s=',
    //   baseUrl: 'https://thephuketexpress.com',
    // }
];

const LOCATION_VARIANTS: Record<string, string[]> = {
    "thepkrasattri": ["thepkrasattri", "thep krasattri", "thep krassattri", "thepkasattri"],
    "kathu": ["kathu", "katu"],
    "cherngtalay": ["cherng talay", "choeng thale", "cherngtalay"],
    "thalang": ["thalang", "talang"],
    "chalong": ["chalong"],
    "rawai": ["rawai", "raway"],
    "kamala": ["kamala", "kamara"],
    "patong": ["patong", "ba tong"],
    "karon": ["karon"],
    "kata": ["kata"],
    "nai harn": ["nai harn", "naiharn"],
    "phuket town": ["phuket town", "phuket city", "mueang phuket"],
    "surin": ["surin"],
    "bangtao": ["bangtao", "bang tao"],
    "sri soonthorn": ["sri soonthorn", "srisoontorn", "sri sunthon"],
    "pa klok": ["pa klok", "paklok", "pa klock"],
    "panwa": ["panwa", "cape panwa"],
    "makham": ["makham", "aa makham"],
    "saphan hin": ["saphan hin", "sapan hin"],
    "rassada": ["rassada", "rasada"],
    "koh kaew": ["koh kaew", "ko kaew"],
    "si ko": ["si ko", "si kor", "sikor"],
    "soi": ["soi", "soi."],
    // Missing Phuket areas
    "wichit": ["wichit", "vichit"],
    "ao po": ["ao po"],
    "mai khao": ["mai khao", "maikhao"],
    "nai yang": ["nai yang", "naiyang"],
    "layan": ["layan", "la yan"],
    "kalim": ["kalim"],
    "tri trang": ["tri trang", "tritrang"],
    "freedom beach": ["freedom beach"],
    "laem singh": ["laem singh"],
    "ya nui": ["ya nui", "yanui"],
    "nai thon": ["nai thon", "naithon"],
    "ao yon": ["ao yon"],
    "koh sirey": ["koh sirey", "ko sirey", "sirey island"],
    "koh maphrao": ["koh maphrao", "coconut island"],
    "boat lagoon": ["boat lagoon"],
    "royal marina": ["royal marina"],
    "bypass road": ["bypass road", "bypass rd"],
    "heroines monument": ["heroines monument", "heroine monument"],
    "central festival": ["central festival", "central phuket"],
    "jungceylon": ["jungceylon", "jung ceylon", "jungcylon"],
    "vachira hospital": ["vachira hospital", "vachira"],
    "bangkok hospital phuket": ["bangkok hospital phuket"],
    "mission hospital": ["mission hospital"],
    "phuket airport": ["phuket airport", "hkt airport", "phuket international"],
    "sarasin bridge": ["sarasin bridge", "sarasin"],
    "dibuk road": ["dibuk road", "dibuk rd"],
    "phang nga road": ["phang nga road"],
    "thepkasattri road": ["thepkasattri road", "thep krasattri road"],
    "old town": ["old town", "old phuket town"],
    // Nearby islands (regularly in Phuket news)
    "similan": ["similan", "similan islands", "koh similan"],
    "phi phi": ["phi phi", "koh phi phi", "phi phi island", "phi phi don", "phi phi leh"],
    "racha": ["racha", "raya", "koh racha", "racha yai", "racha noi"],
    "coral island": ["coral island", "koh hei", "koh hey"],
    "maiton": ["maiton", "mai ton", "koh maiton"],
    "kai island": ["kai island", "koh kai", "koh khai"],
    "yao yai": ["yao yai", "koh yao yai"],
    "yao noi": ["yao noi", "koh yao noi"],
    "rang yai": ["rang yai", "koh rang yai"],
    "bamboo island": ["bamboo island", "koh mai pai"],
    "mosquito island": ["mosquito island"],
    "james bond island": ["james bond island", "khao phing kan"],
    // Surrounding areas that appear in Phuket-relevant news
    "phang nga": ["phang nga", "phangnga"],
    "krabi": ["krabi"],
    "khao lak": ["khao lak", "khaolak"],
    "khao sok": ["khao sok"],
    "surat thani": ["surat thani"],
    "andaman": ["andaman", "andaman sea"],
};

const INCIDENT_TYPES: Record<string, string[]> = {
    "accident": ["accident", "crash", "collision", "smashed"],
    "arrest": ["arrest", "apprehend", "custody", "caught"],
    "raid": ["raid", "crackdown"],
    "drowning": ["drown", "drowning"],
    "fire": ["fire", "blaze", "burn"],
    "murder": ["murder", "kill", "homicide", "shot", "stabbing"],
    "theft": ["theft", "steal", "robbery", "robbed", "burglar", "snatch"],
    "assault": ["assault", "fight", "brawl", "attack", "punch", "slap"],
    // Rescue / maritime
    "rescue": ["rescue", "rescued", "rescuing", "saved", "recovery"],
    "sinking": ["sinking", "sunk", "capsized", "capsize", "overturned", "taking on water"],
    "missing": ["missing", "disappeared", "lost at sea", "search and rescue"],
    "stranded": ["stranded", "stuck", "marooned", "adrift"],
    // Traffic / road incidents (currently missing common terms)
    "hit and run": ["hit and run", "hit-and-run", "fled the scene"],
    "road death": ["road death", "fatal crash", "died at the scene", "dead on arrival"],
    "motorbike": ["motorbike accident", "motorcycle crash", "bike crash"],
    "overturned": ["overturned", "flipped", "rolled over"],
    // Medical / death
    "death": ["death", "dead", "died", "fatal", "fatality", "body found", "found dead"],
    "overdose": ["overdose", "OD"],
    "suicide": ["suicide", "jumped", "fell from"],
    "hospital": ["hospitalized", "hospitalised", "rushed to hospital", "intensive care", "ICU"],
    // Natural events
    "flood": ["flood", "flooding", "flooded", "flash flood"],
    "earthquake": ["earthquake", "tremor", "quake"],
    "landslide": ["landslide", "mudslide"],
    "storm": ["storm", "tropical storm", "heavy rain", "severe weather"],
    "tsunami": ["tsunami", "tidal wave"],
    "lightning": ["lightning", "lightning strike"],
    "riptide": ["riptide", "rip current", "undercurrent", "red flag"],
    // Scam / fraud
    "scam": ["scam", "scammed", "fraud", "fraudulent", "swindle", "con artist", "deceived"],
    "overcharge": ["overcharge", "overcharged", "ripped off", "price gouging"],
    // Immigration / legal
    "overstay": ["overstay", "overstayed", "visa violation", "illegal entry"],
    "deportation": ["deported", "deportation", "blacklisted"],
    "drug": ["drug", "drugs", "narcotics", "methamphetamine", "ya ba", "ya ice", "cannabis", "marijuana", "ketamine", "cocaine"],
    // Other
    "explosion": ["explosion", "exploded", "blast", "bomb"],
    "electrocution": ["electrocuted", "electrocution", "electric shock"],
    "animal attack": ["bitten", "snake bite", "dog attack", "monkey attack", "jellyfish sting"],
    "food poisoning": ["food poisoning", "poisoned", "contaminated"]
};

const NATIONALITIES = [
    "russian", "chinese", "indian", "australian", "british", "american", "korean",
    "ukrainian", "israeli", "kazakh", "french", "german", "thai", "myanmar", "burmese",
    "swiss", "swedish", "japanese", "canadian", "dutch", "italian", "spanish", "belgian", "norwegian",
    "danish", "finnish", "polish", "czech", "austrian", "irish", "scottish",
    "new zealand", "kiwi", "south african", "malaysian", "singaporean",
    "indonesian", "vietnamese", "cambodian", "laotian", "filipino", "filipina",
    "nigerian", "uzbek", "tajik", "turkish", "iranian", "saudi", "emirati",
    "pakistani", "bangladeshi", "nepali", "sri lankan", "estonian", "latvian",
    "lithuanian", "romanian", "hungarian", "brazilian", "mexican", "colombian",
    "argentinian", "chilean"
];

export class ReEnrichmentService {
    private storage: IStorage;

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    /**
     * Main entry point to re-enrich an article
     */
    async reEnrichArticle(articleId: string) {
        console.log(`\n⏳ STARTING RE-ENRICHMENT for article ID: ${articleId}`);
        try {
            const article = await this.storage.getArticleById(articleId);
            if (!article) {
                console.error(`❌ Re-enrichment failed: Article ${articleId} not found`);
                return;
            }

            if ((article as any).lastManualEditAt) {
                console.log(`   🔒 Skipping re-enrichment: Article was manually edited by admin.`);
                await this.storage.updateArticle(article.id, {
                    reEnrichmentCompleted: true,
                });
                return;
            }

            console.log(`   Title: ${article.title}`);

            const combinedText = `${article.title} ${article.content}`;

            const locations = this.extractLocations(combinedText);
            const incidentTypes = this.extractIncidentTypes(combinedText);
            const nationalities = this.extractNationalities(combinedText);
            const numbers = this.extractNumbers(combinedText);
            const times = this.extractTimeReferences(combinedText);

            if (locations.length === 0 || incidentTypes.length === 0) {
                console.log(`   ⚠️ Missing required location or incident type for matching. Locs: ${locations.length}, Types: ${incidentTypes.length}. Skipping.`);
                return;
            }

            console.log(`   🔍 Signals extracted:`);
            console.log(`      Locations: [${locations.join(', ')}]`);
            console.log(`      Incidents: [${incidentTypes.join(', ')}]`);
            console.log(`      Nationalities: [${nationalities.join(', ')}]`);
            console.log(`      Numbers: [${numbers.join(', ')}]`);
            console.log(`      Times: [${times.join(', ')}]`);

            const primaryQuery = `${locations[0]} ${incidentTypes[0]}`;
            const fallbackQuery = `${locations[0]} Phuket`;

            const matchedSources: { name: string; publishedDate: string; extractedText: string }[] = [];
            const sourcesSearched = [];

            for (const source of SOURCES) {
                console.log(`   📡 Checking source: ${source.name}`);
                sourcesSearched.push(source.name);
                try {
                    // Try primary
                    let match = await this.findMatchingStory(source, article.publishedAt, locations, incidentTypes, nationalities, numbers, times, primaryQuery, false);

                    // Try fallback search if primary fails
                    if (!match) {
                        console.log(`     [-] No match with primary method. Trying fallback search: "${fallbackQuery}"`);
                        match = await this.findMatchingStory(source, article.publishedAt, locations, incidentTypes, nationalities, numbers, times, fallbackQuery, true);
                    }

                    if (match) {
                        console.log(`     ✅ Match found: ${match.title}`);
                        const text = await this.extractArticleText(match.link);
                        if (text && text.length > 200) {
                            matchedSources.push({
                                name: source.name,
                                publishedDate: match.pubDate || new Date().toISOString(),
                                extractedText: text,
                            });
                        } else {
                            console.log(`     ⚠️ Extracted text is too short or empty.`);
                        }
                    } else {
                        console.log(`     [-] No match found in ${source.name}.`);
                    }
                } catch (sourceErr) {
                    console.error(`     ❌ Error checking source ${source.name}:`, sourceErr);
                }

                // Rate limit between sources
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (matchedSources.length > 0) {
                console.log(`   🧠 Running Claude re-enrichment prompt with ${matchedSources.length} matched sources...`);
                const result = await translatorService.reEnrichWithSources(
                    article.title,
                    article.content,
                    article.excerpt,
                    article.category,
                    article.publishedAt,
                    matchedSources
                );

                if (result.hasNewInformation) {
                    console.log(`   ✨ New information found! Updating article...`);
                    console.log(`      Summary of new facts: ${result.newFactsSummary}`);

                    await this.storage.updateArticle(article.id, {
                        title: result.enrichedTitle,
                        content: result.enrichedContent,
                        excerpt: result.enrichedExcerpt,
                        lastEnrichedAt: new Date(),
                        enrichmentCount: (article.enrichmentCount || 0) + 1,
                    });
                    console.log(`   ✅ Article updated successfully in database.`);
                } else {
                    console.log(`   ⏭️ Minimum change threshold not met. No new factual information found. Modifying lastEnrichedAt timestamp only.`);
                    await this.storage.updateArticle(article.id, {
                        lastEnrichedAt: new Date(),
                    });
                }

            } else {
                console.log(`   ⏭️ No matching English sources found for this article.`);
            }

        } catch (err) {
            console.error(`❌ Re-enrichment job failed for ${articleId}:`, err);
        }
    }

    private extractLocations(text: string): string[] {
        const locations = new Set<string>();
        const lowerText = text.toLowerCase();

        // 1. Specific known variants
        for (const [canonical, variants] of Object.entries(LOCATION_VARIANTS)) {
            for (const variant of variants) {
                // If variant is a single word or ends in dot, use regex boundary
                if (variant === 'soi' || variant === 'soi.') {
                    if (new RegExp(`\\bsoi\\.?\\b`, 'i').test(lowerText)) {
                        locations.add(canonical);
                        break;
                    }
                } else if (!variant.includes(' ')) {
                    if (new RegExp(`\\b${variant}\\b`, 'i').test(lowerText)) {
                        locations.add(canonical);
                        break;
                    }
                } else {
                    // Contains spaces, includes is safe enough
                    if (lowerText.includes(variant)) {
                        locations.add(canonical);
                        break;
                    }
                }
            }
        }

        // 2. Dynamic patterns (Road, Beach, Intersection, Soi)
        const dynamicPatterns = [
            /\b(?:soi\.?)\s+([a-z0-9]+)\b/gi,
            /\b([a-z0-9]+)\s+(?:road|rd\.|rd)\b/gi,
            /\b([a-z0-9]+)\s+(?:intersection)\b/gi,
            /\b([a-z0-9]+)\s+(?:beach)\b/gi
        ];

        for (const pattern of dynamicPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1]) locations.add(match[1].toLowerCase());
            }
        }

        return Array.from(locations);
    }

    private extractIncidentTypes(text: string): string[] {
        const types = new Set<string>();
        for (const [canonical, synonyms] of Object.entries(INCIDENT_TYPES)) {
            for (const synonym of synonyms) {
                if (new RegExp(`\\b${synonym}\\b`, 'i').test(text)) {
                    types.add(canonical);
                    break;
                }
            }
        }
        return Array.from(types);
    }

    private extractNationalities(text: string): string[] {
        const matches = new Set<string>();
        for (const nat of NATIONALITIES) {
            if (new RegExp(`\\b${nat}\\b`, 'i').test(text)) {
                matches.add(nat);
            }
        }
        return Array.from(matches);
    }

    private extractNumbers(text: string): string[] {
        const matches = new Set<string>();
        const patterns = [
            /\b(\d+)\s*(?:years? old|baht|people|tourists|vehicles|cars|motorcycles|men|women|injur|dead|killed|foreigners|locals)\b/gi,
        ];
        for (const p of patterns) {
            let m;
            while ((m = p.exec(text)) !== null) {
                if (m[1]) matches.add(m[1]);
            }
        }
        return Array.from(matches);
    }

    private extractTimeReferences(text: string): string[] {
        const matches = new Set<string>();
        const timeRegex = /\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|morning|afternoon|evening|night|midnight|noon)\b/gi;
        let m;
        while ((m = timeRegex.exec(text)) !== null) {
            if (m[1]) matches.add(m[1].toLowerCase());
        }
        return Array.from(matches);
    }

    private evaluateMatch(
        sourceText: string,
        ourDate: Date,
        sourceDate: Date,
        extractedLocations: string[],
        extractedIncidentTypes: string[],
        extractedNationalities: string[],
        extractedNumbers: string[],
        extractedTimes: string[]
    ): number {
        const lowerSourceText = sourceText.toLowerCase();

        // 1. Time proximity check (must be within 24 hours)
        const diffHours = (sourceDate.getTime() - ourDate.getTime()) / (1000 * 60 * 60);

        // If it's far outside 24h window (give 36h to account for timezone/parsing weirdness)
        if (Math.abs(diffHours) > 36) {
            console.log(`        [EVAL] Rejected due to time diff > 36h (${diffHours.toFixed(1)}h)`);
            return 0;
        }

        // 2. Determine matches for each category
        let hasLocMatch = false;
        let hasIncMatch = false;

        // Check Location Match
        for (const loc of extractedLocations) {
            if (LOCATION_VARIANTS[loc]) {
                for (const variant of LOCATION_VARIANTS[loc]) {
                    if (variant === 'soi' || variant === 'soi.') {
                        if (new RegExp(`\\bsoi\\.?\\b`, 'i').test(lowerSourceText)) {
                            hasLocMatch = true; break;
                        }
                    } else if (!variant.includes(' ')) {
                        if (new RegExp(`\\b${variant}\\b`, 'i').test(lowerSourceText)) {
                            hasLocMatch = true; break;
                        }
                    } else if (lowerSourceText.includes(variant)) {
                        hasLocMatch = true; break;
                    }
                }
            } else {
                if (lowerSourceText.includes(loc.toLowerCase())) {
                    hasLocMatch = true;
                }
            }
            if (hasLocMatch) break;
        }

        // Check Incident Match
        for (const inc of extractedIncidentTypes) {
            if (INCIDENT_TYPES[inc]) {
                for (const synonym of INCIDENT_TYPES[inc]) {
                    if (new RegExp(`\\b${synonym}\\b`, 'i').test(lowerSourceText)) {
                        hasIncMatch = true; break;
                    }
                }
            }
            if (hasIncMatch) break;
        }

        if (!hasLocMatch || !hasIncMatch) {
            console.log(`        [EVAL] Rejected: LocMatch=${hasLocMatch}, IncMatch=${hasIncMatch}`);
            return 0;
        }

        let score = 5; // +3 Loc, +2 Inc

        // Check Nationalities
        for (const nat of extractedNationalities) {
            if (new RegExp(`\\b${nat}\\b`, 'i').test(lowerSourceText)) {
                score += 2; break; // Once any nationality matches, give points
            }
        }

        // Check Numbers
        for (const num of extractedNumbers) {
            if (new RegExp(`\\b${num}\\b`).test(lowerSourceText)) {
                score += 2; break;
            }
        }

        // Check Times
        for (const time of extractedTimes) {
            if (lowerSourceText.includes(time)) {
                score += 2; break;
            }
        }

        console.log(`        [EVAL] Score: ${score} - TimeDiff: ${diffHours.toFixed(1)}h - Text: "${sourceText.substring(0, 70).replace(/\n/g, ' ')}..."`);
        return score;
    }

    private async findMatchingStory(
        source: EnglishSource,
        ourDate: Date,
        locations: string[],
        incidentTypes: string[],
        nationalities: string[],
        numbers: string[],
        times: string[],
        searchQuery: string,
        isFallback = false
    ) {
        let bestMatch = null;
        let highestScore = 0;

        // 1. Try RSS
        if (!isFallback && source.rssFeedUrl) {
            try {
                const feed = await rssParser.parseURL(source.rssFeedUrl);
                const recentItems = feed.items;

                for (const item of recentItems) {
                    const textToSearch = `${item.title} ${item.content || item.contentSnippet}`;
                    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

                    const score = this.evaluateMatch(textToSearch, ourDate, pubDate, locations, incidentTypes, nationalities, numbers, times);
                    if (score >= 5 && score > highestScore) {
                        console.log(`        [RSS] 🏆 High confidence match found! Score: ${score}`);
                        highestScore = score;
                        bestMatch = {
                            title: item.title || "Match",
                            link: item.link,
                            pubDate: pubDate.toISOString()
                        };
                    }
                }
            } catch (e) {
                console.error(`      ⚠️ RSS fetch failed for ${source.name}:`, e);
            }
        }

        // If RSS strategy works and finds a match >= 5, return it immediately without scraping
        if (bestMatch && highestScore >= 5) {
            return bestMatch;
        }

        // 2. Try Scraping (if RSS fails or if it's fallback search)
        console.log(`      [-] ${isFallback ? 'Fallback ' : ''}Search scraping for "${searchQuery}" on ${source.name}...`);
        try {
            const searchUrl = `${source.searchUrl}${encodeURIComponent(searchQuery)}`;
            console.log(`      [-] URL: ${searchUrl}`);
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });
            const html = await response.text();
            const $ = cheerio.load(html);

            // Search wrappers typical of WordPress / News sites
            const searchResults = $('article, .search-result, .td_module_wrap, .post').slice(0, 5);

            searchResults.each((i, el) => {
                const titleEl = $(el).find('h1, h2, h3, .entry-title').first();
                const linkEl = $(el).find('a').first();
                const excerptEl = $(el).find('.entry-content, .td-excerpt, p').first();
                const dateEl = $(el).find('time, .entry-date, .td-post-date').first();

                const title = titleEl.text().trim();
                let link = linkEl.attr('href') || titleEl.find('a').attr('href');
                const excerpt = excerptEl.text().trim();
                const pubDateStr = dateEl.attr('datetime') || dateEl.text().trim();

                if (!title || !link) return;

                // Make sure link is complete
                if (!link.startsWith('http') && !link.startsWith('//')) {
                    link = source.baseUrl + (link.startsWith('/') ? link : '/' + link);
                } else if (link.startsWith('//')) {
                    link = 'https:' + link;
                }

                const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();

                const textToSearch = `${title} ${excerpt}`;
                const score = this.evaluateMatch(textToSearch, ourDate, pubDate, locations, incidentTypes, nationalities, numbers, times);

                if (score >= 5 && score > highestScore) {
                    highestScore = score;
                    bestMatch = { title, link, pubDate: pubDate.toISOString() };
                }
            });
        } catch (e) {
            console.error(`      ⚠️ Search scrape failed for ${source.name}:`, e);
        }

        return bestMatch;
    }

    private async extractArticleText(url: string | undefined): Promise<string | null> {
        if (!url) return null;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });

            console.log(`      [-] Fetching article text. Status: ${response.status}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove only absolutely non-content elements
            $('script, style, iframe, nav, header, footer, .ads-container, .advertisement, noscript').remove();

            // Try to find the main content container first for better precision
            const contentSelectors = ['.entry-content', 'article', '.post-content', '.td-post-content', '.article-content', '.content'];
            let contentContainer = null;

            for (const selector of contentSelectors) {
                const found = $(selector);
                if (found.length > 0 && found.text().trim().length > 500) {
                    contentContainer = found;
                    console.log(`      [-] Found content container using selector: ${selector}`);
                    break;
                }
            }

            const searchArea = contentContainer || $('body');

            // Extract paragraphs
            let content = '';
            let pCount = 0;
            searchArea.find('p').each((i, el) => {
                const text = $(el).text().trim();
                // Lower threshold to 30 chars to catch shorter factual sentences
                if (text.length > 30 && !text.includes('Copyright') && !text.includes('All rights reserved')) {
                    if (pCount === 0) console.log(`      [-] First paragraph extracted: "${text.substring(0, 60)}..."`);
                    content += text + '\n\n';
                    pCount++;
                }
            });

            console.log(`      [-] Unified content length: ${content.length} chars from ${pCount} paragraphs.`);
            return content.trim();
        } catch (e) {
            console.error(`      ⚠️ Failed to extract text from ${url}:`, e);
            return null;
        }
    }

}

let instance: ReEnrichmentService | null = null;
export function getReEnrichmentService(storage: IStorage): ReEnrichmentService {
    if (!instance) {
        instance = new ReEnrichmentService(storage);
    }
    return instance;
}
