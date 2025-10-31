import { load } from 'cheerio';

export interface EnglishNewsArticle {
  title: string;
  url: string;
  excerpt: string;
  content: string;
  publishedAt: Date;
  source: 'phuket-news' | 'phuket-express' | 'thaiger';
  imageUrl?: string;
}

export class EnglishNewsScraper {
  /**
   * Scrape The Phuket News
   * Uses RSS feed for article discovery
   */
  async scrapePhuketNews(maxArticles: number = 10): Promise<EnglishNewsArticle[]> {
    try {
      console.log('Scraping The Phuket News...');
      const rssUrl = 'https://www.thephuketnews.com/rss-news.php?type=phuket';
      
      const response = await fetch(rssUrl);
      const xmlText = await response.text();
      
      const $ = load(xmlText, { xmlMode: true });
      const articles: EnglishNewsArticle[] = [];
      
      $('item').slice(0, maxArticles).each((i, elem) => {
        const title = $(elem).find('title').text();
        const url = $(elem).find('link').text();
        const description = $(elem).find('description').text();
        const pubDate = $(elem).find('pubDate').text();
        
        articles.push({
          title,
          url,
          excerpt: description.substring(0, 200),
          content: description,
          publishedAt: pubDate ? new Date(pubDate) : new Date(),
          source: 'phuket-news',
        });
      });
      
      console.log(`Found ${articles.length} articles from The Phuket News`);
      return articles;
    } catch (error) {
      console.error('Error scraping The Phuket News:', error);
      return [];
    }
  }

  /**
   * Scrape The Phuket Express
   * Uses HTML scraping of main page
   */
  async scrapePhuketExpress(maxArticles: number = 10): Promise<EnglishNewsArticle[]> {
    try {
      console.log('Scraping The Phuket Express...');
      const url = 'https://thephuketexpress.com/';
      
      const response = await fetch(url);
      const html = await response.text();
      const $ = load(html);
      
      const articles: EnglishNewsArticle[] = [];
      
      // Find article cards (adjust selectors based on actual HTML structure)
      $('article, .post, .article-item').slice(0, maxArticles).each((i, elem) => {
        const $article = $(elem);
        const titleElem = $article.find('h2, h3, .entry-title, .post-title').first();
        const linkElem = titleElem.find('a').first().length ? titleElem.find('a').first() : $article.find('a').first();
        const excerptElem = $article.find('.excerpt, .entry-summary, p').first();
        const imageElem = $article.find('img').first();
        
        const title = titleElem.text().trim();
        const url = linkElem.attr('href') || '';
        const excerpt = excerptElem.text().trim();
        const imageUrl = imageElem.attr('src') || imageElem.attr('data-src');
        
        if (title && url) {
          articles.push({
            title,
            url: url.startsWith('http') ? url : `https://thephuketexpress.com${url}`,
            excerpt: excerpt.substring(0, 200),
            content: excerpt,
            publishedAt: new Date(),
            source: 'phuket-express',
            imageUrl,
          });
        }
      });
      
      console.log(`Found ${articles.length} articles from The Phuket Express`);
      return articles;
    } catch (error) {
      console.error('Error scraping The Phuket Express:', error);
      return [];
    }
  }

  /**
   * Scrape The Thaiger (Phuket section)
   * Uses HTML scraping of Phuket news page
   */
  async scrapeThaiger(maxArticles: number = 10): Promise<EnglishNewsArticle[]> {
    try {
      console.log('Scraping The Thaiger...');
      const url = 'https://thethaiger.com/news/phuket';
      
      const response = await fetch(url);
      const html = await response.text();
      const $ = load(html);
      
      const articles: EnglishNewsArticle[]  = [];
      
      // Find article cards (adjust selectors based on actual HTML structure)
      $('article, .post, .article-item').slice(0, maxArticles).each((i, elem) => {
        const $article = $(elem);
        const titleElem = $article.find('h2, h3, .entry-title, .post-title').first();
        const linkElem = titleElem.find('a').first().length ? titleElem.find('a').first() : $article.find('a').first();
        const excerptElem = $article.find('.excerpt, .entry-summary, p').first();
        const imageElem = $article.find('img').first();
        
        const title = titleElem.text().trim();
        const url = linkElem.attr('href') || '';
        const excerpt = excerptElem.text().trim();
        const imageUrl = imageElem.attr('src') || imageElem.attr('data-src');
        
        if (title && url) {
          articles.push({
            title,
            url: url.startsWith('http') ? url : `https://thethaiger.com${url}`,
            excerpt: excerpt.substring(0, 200),
            content: excerpt,
            publishedAt: new Date(),
            source: 'thaiger',
            imageUrl,
          });
        }
      });
      
      console.log(`Found ${articles.length} articles from The Thaiger`);
      return articles;
    } catch (error) {
      console.error('Error scraping The Thaiger:', error);
      return [];
    }
  }

  /**
   * Scrape all English news sources
   */
  async scrapeAll(maxPerSource: number = 10): Promise<EnglishNewsArticle[]> {
    const [phuketNews, phuketExpress, thaiger] = await Promise.all([
      this.scrapePhuketNews(maxPerSource),
      this.scrapePhuketExpress(maxPerSource),
      this.scrapeThaiger(maxPerSource),
    ]);
    
    return [...phuketNews, ...phuketExpress, ...thaiger];
  }
}

export const englishNewsScraper = new EnglishNewsScraper();
