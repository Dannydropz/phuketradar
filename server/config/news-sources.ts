/**
 * Facebook News Sources Configuration
 * 
 * List of Facebook pages to scrape for Phuket news.
 * Each source is scraped independently and semantic duplicate detection
 * prevents the same story from being published multiple times.
 */

export interface NewsSource {
  name: string;
  url: string;
  enabled: boolean;
  /**
   * When true, applies stricter image analysis to this source:
   * - Analyzes images up to 400KB (vs default 150KB) — catches large graphic files
   * - Uses a more relaxed cluster threshold (< 8 clusters) — catches gradient/blob designs
   * Enable for sources known to post text-overlay graphics (e.g. Phuket Hot News)
   */
  strictImageFilter?: boolean;
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    name: "The Phuket Times",
    url: "https://www.facebook.com/PhuketTimeNews",
    enabled: true,
  },
  {
    name: "Phuket Info Center",
    url: "https://www.facebook.com/phuketinfocenter",
    enabled: true,
  },
  {
    name: "Phuket Hot News",
    url: "https://www.facebook.com/phukethotnews",
    enabled: false, // DISABLED: Posts graphic teaser images (red blob) that bypass image filters
    // Re-enable once the deployed scheduler confirms strictImageFilter + teaser-phrase filter is working
    strictImageFilter: true,
  },

  {
    name: "Phuket Times English",
    url: "https://www.facebook.com/PhuketTimes.News",
    enabled: true,
  },
];

// Get all enabled sources
export function getEnabledSources(): NewsSource[] {
  return NEWS_SOURCES.filter(source => source.enabled);
}
