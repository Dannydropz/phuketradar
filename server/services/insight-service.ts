import OpenAI from "openai";
import { englishNewsScraper, type EnglishNewsArticle } from "./english-scrapers/english-news-scraper";
import type { Article } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface InsightGenerationRequest {
  sourceArticles: Article[]; // Your breaking news articles on the topic
  topic: string; // e.g., "Road accidents in Patong"
  eventType?: string; // Optional: helps focus the analysis
}

export interface InsightResult {
  title: string;
  content: string;
  excerpt: string;
  relatedArticleIds: string[];
  sources: string[]; // URLs of English news sources used
}

class InsightService {
  /**
   * Generate a Phuket Radar Insight piece (300-400 words)
   * Combines your breaking news with context from English sources
   */
  async generateInsight(request: InsightGenerationRequest): Promise<InsightResult> {
    console.log(`\n=== GENERATING PHUKET RADAR INSIGHT ===`);
    console.log(`Topic: ${request.topic}`);
    console.log(`Source articles: ${request.sourceArticles.length}`);
    
    // Step 1: Scrape English news sources for related coverage
    console.log(`Scraping English news sources for related coverage...`);
    const englishArticles = await englishNewsScraper.scrapeAll(15);
    
    // Step 2: Filter English articles that match the topic using semantic matching
    const relevantEnglishArticles = await this.findRelevantEnglishArticles(
      request.topic,
      englishArticles
    );
    
    console.log(`Found ${relevantEnglishArticles.length} relevant English articles`);
    
    // Step 3: Use GPT-4 to synthesize the Insight piece
    const insight = await this.synthesizeInsight(
      request.topic,
      request.sourceArticles,
      relevantEnglishArticles,
      request.eventType
    );
    
    return {
      ...insight,
      relatedArticleIds: request.sourceArticles.map(a => a.id),
      sources: relevantEnglishArticles.map(a => a.url),
    };
  }

  /**
   * Find English articles relevant to the topic
   * Uses keyword matching and semantic similarity
   */
  private async findRelevantEnglishArticles(
    topic: string,
    articles: EnglishNewsArticle[]
  ): Promise<EnglishNewsArticle[]> {
    // Simple keyword-based filtering for now
    // Can be enhanced with GPT-based relevance scoring later
    const keywords = topic.toLowerCase().split(/\s+/);
    
    return articles.filter(article => {
      const text = `${article.title} ${article.excerpt}`.toLowerCase();
      return keywords.some(keyword => text.includes(keyword));
    }).slice(0, 5); // Limit to top 5 most recent matches
  }

  /**
   * Use GPT-4 to synthesize breaking news + English source context
   * into a 300-400 word analytical Insight piece
   */
  private async synthesizeInsight(
    topic: string,
    breakingNewsArticles: Article[],
    englishArticles: EnglishNewsArticle[],
    eventType?: string
  ): Promise<Omit<InsightResult, 'relatedArticleIds' | 'sources'>> {
    // Prepare context from breaking news
    const breakingNewsContext = breakingNewsArticles.map((article, idx) => 
      `[Breaking News ${idx + 1}]\nTitle: ${article.title}\nExcerpt: ${article.excerpt}\nPublished: ${article.publishedAt.toISOString()}`
    ).join('\n\n');

    // Prepare context from English sources
    const englishSourceContext = englishArticles.map((article, idx) =>
      `[${article.source.toUpperCase()} - ${idx + 1}]\nTitle: ${article.title}\nExcerpt: ${article.excerpt}\nURL: ${article.url}`
    ).join('\n\n');

    const systemPrompt = `You are a news analyst for Phuket Radar, a trusted local news platform for Phuket's international community.

Your task is to create a "Phuket Radar Insight" - a short analytical piece (300-400 words) that:
1. Synthesizes breaking news we published with context from trusted English news outlets
2. Provides factual analysis in a neutral, journalistic tone
3. Highlights patterns, implications, or local context that readers should know
4. Shows our value-add: "We broke it first, here's the full picture"
5. Maintains credibility by citing sources appropriately

Voice & Style:
- Factual, neutral, local-focused
- Clear and accessible to international residents
- Confident but not sensational
- Professional journalism standards`;

    const userPrompt = `Create a Phuket Radar Insight on: "${topic}"${eventType ? ` (Event Type: ${eventType})` : ''}

=== OUR BREAKING NEWS (Published First) ===
${breakingNewsContext}

=== ADDITIONAL CONTEXT (English News Sources) ===
${englishSourceContext || 'No additional English source coverage found yet.'}

Write a 300-400 word Insight piece that:
1. Opens with what happened (based on our breaking news)
2. Adds context, patterns, or implications from English sources
3. Explains what this means for Phuket residents
4. Maintains neutral, factual tone
5. Credits sources naturally in the narrative

Format your response as JSON:
{
  "title": "Engaging headline for the Insight piece (max 100 chars)",
  "content": "Full 300-400 word article in markdown format",
  "excerpt": "Compelling 2-sentence summary (max 200 chars)"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      console.log(`Generated Insight: ${result.title}`);
      console.log(`Word count: ${result.content.split(/\s+/).length}`);
      
      return {
        title: result.title,
        content: result.content,
        excerpt: result.excerpt,
      };
    } catch (error) {
      console.error('Error generating Insight with GPT-4:', error);
      throw new Error('Failed to generate Insight piece');
    }
  }
}

export const insightService = new InsightService();
