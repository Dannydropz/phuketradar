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
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    name: "Phuket Time News",
    url: "https://www.facebook.com/PhuketTimeNews",
    enabled: true,
  },
  {
    name: "Phuket Info Center",
    url: "https://www.facebook.com/phuketinfocenter",
    enabled: true,
  },
  {
    name: "Newshawk Phuket",
    url: "https://www.facebook.com/NewshawkPhuket",
    enabled: true,
  },
  {
    name: "Phuket Hot News",
    url: "https://www.facebook.com/phukethotnews",
    enabled: true,
  },
];

// Get all enabled sources
export function getEnabledSources(): NewsSource[] {
  return NEWS_SOURCES.filter(source => source.enabled);
}
