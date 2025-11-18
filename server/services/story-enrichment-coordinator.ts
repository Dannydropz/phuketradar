import { Article, InsertArticle } from '@shared/schema';
import { IStorage } from '../storage';
import { DuplicateDetectionService } from './duplicate-detection';
import { StoryMergerService } from './story-merger';
import { EnrichmentService } from './enrichment';

interface ProcessedStory {
  action: 'create' | 'merge' | 'skip';
  article?: InsertArticle;
  mergedWith?: string[]; // IDs of articles merged
  reason?: string;
}

export class StoryEnrichmentCoordinator {
  private duplicateDetector: DuplicateDetectionService;
  private storyMerger: StoryMergerService;
  private enrichmentService: EnrichmentService;
  
  constructor() {
    this.duplicateDetector = new DuplicateDetectionService();
    this.storyMerger = new StoryMergerService();
    this.enrichmentService = new EnrichmentService();
  }
  
  /**
   * Process a newly translated story - detect duplicates, merge if needed
   * This is called AFTER translation but BEFORE saving to database
   */
  async processNewStory(
    translatedArticle: InsertArticle,
    storage: IStorage
  ): Promise<ProcessedStory> {
    console.log(`\n🔍 [ENRICHMENT COORDINATOR] Processing: "${translatedArticle.title?.substring(0, 60)}..."`);
    
    // Step 1: Detect duplicates using multi-layer approach
    const duplicates = await this.duplicateDetector.findDuplicates({
      title: translatedArticle.title || '',
      content: translatedArticle.content || '',
      originalTitle: translatedArticle.originalTitle || undefined,
      originalContent: translatedArticle.originalContent || undefined,
      embedding: translatedArticle.embedding as number[] | undefined,
      publishedAt: new Date()
    });
    
    if (duplicates.length === 0) {
      console.log(`✅ [ENRICHMENT COORDINATOR] No duplicates found - creating new article`);
      return {
        action: 'create',
        article: translatedArticle
      };
    }
    
    console.log(`🔄 [ENRICHMENT COORDINATOR] Found ${duplicates.length} duplicate(s) - merging stories...`);
    
    // Step 2: Get full article objects for merging
    const duplicateArticles: Article[] = [];
    for (const dup of duplicates) {
      if (dup.matchedArticle) {
        duplicateArticles.push(dup.matchedArticle);
      }
    }
    
    // Step 3: Create article object from translated data for merging
    const newArticleForMerge: Article = {
      ...translatedArticle,
      id: 'temp-new',
      publishedAt: new Date(),
      isPublished: translatedArticle.isPublished ?? false,
      embedding: translatedArticle.embedding as number[] | null | undefined,
    } as Article;
    
    // Step 4: Merge all stories (new + existing duplicates)
    const allStories = [newArticleForMerge, ...duplicateArticles];
    const mergedStory = await this.storyMerger.mergeStories(allStories);
    
    // Step 5: Determine primary article (usually the earliest/highest interest)
    const primaryArticle = this.selectPrimaryArticle(duplicateArticles);
    
    if (primaryArticle) {
      // Update existing article with merged content
      console.log(`📝 [ENRICHMENT COORDINATOR] Updating existing article: ${primaryArticle.id}`);
      console.log(`   Combined details: ${mergedStory.combinedDetails}`);
      console.log(`   Developing: ${mergedStory.isDeveloping}`);
      
      await storage.updateArticle(primaryArticle.id, {
        title: mergedStory.title,
        content: mergedStory.content,
        excerpt: mergedStory.excerpt,
        isDeveloping: mergedStory.isDeveloping,
        enrichmentCount: (primaryArticle.enrichmentCount || 0) + 1,
        lastEnrichedAt: new Date()
      });
      
      // Mark other duplicates as merged into primary
      const otherDuplicates = duplicateArticles.filter(a => a.id !== primaryArticle.id);
      for (const dup of otherDuplicates) {
        await storage.updateArticle(dup.id, {
          mergedIntoId: primaryArticle.id
        });
      }
      
      return {
        action: 'merge',
        mergedWith: duplicateArticles.map(a => a.id),
        reason: `Merged with ${duplicateArticles.length} existing article(s): ${mergedStory.combinedDetails}`
      };
    } else {
      // No existing article, create new merged one
      console.log(`📝 [ENRICHMENT COORDINATOR] Creating new merged article`);
      
      return {
        action: 'create',
        article: {
          ...translatedArticle,
          title: mergedStory.title,
          content: mergedStory.content,
          excerpt: mergedStory.excerpt,
          isDeveloping: mergedStory.isDeveloping,
          enrichmentCount: 1,
          lastEnrichedAt: new Date()
        }
      };
    }
  }
  
  /**
   * Select the primary article from duplicates
   * Priority: published > higher interest score > earlier published date
   */
  private selectPrimaryArticle(articles: Article[]): Article | null {
    if (articles.length === 0) return null;
    
    return articles.sort((a, b) => {
      // Published articles first
      if (a.isPublished && !b.isPublished) return -1;
      if (!a.isPublished && b.isPublished) return 1;
      
      // Higher interest score
      const scoreA = a.interestScore || 0;
      const scoreB = b.interestScore || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // Earlier published date
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    })[0];
  }
  
  /**
   * Run enrichment pass on developing stories
   * Called by the scheduled enrichment endpoint
   */
  async enrichDevelopingStories(storage: IStorage): Promise<{
    enriched: number;
    completed: number;
    failed: number;
  }> {
    console.log(`\n🔄 [ENRICHMENT COORDINATOR] Starting enrichment pass...`);
    
    // Find stories ready for enrichment
    const readyForEnrichment = await storage.getDevelopingArticles();
    
    console.log(`📊 [ENRICHMENT COORDINATOR] Found ${readyForEnrichment.length} developing stories`);
    
    let enriched = 0;
    let completed = 0;
    let failed = 0;
    
    for (const article of readyForEnrichment) {
      try {
        // Skip if enriched recently (within last 10 minutes)
        if (article.lastEnrichedAt) {
          const timeSinceEnrichment = Date.now() - new Date(article.lastEnrichedAt).getTime();
          if (timeSinceEnrichment < 10 * 60 * 1000) {
            console.log(`⏭️  Skipping "${article.title.substring(0, 40)}..." - enriched ${Math.round(timeSinceEnrichment / 60000)}m ago`);
            continue;
          }
        }
        
        console.log(`\n🔧 [ENRICHMENT] Enriching: "${article.title.substring(0, 60)}..."`);
        
        const enrichmentResult = await this.enrichmentService.enrichStory(article);
        
        // Update article with enriched content
        await storage.updateArticle(article.id, {
          content: enrichmentResult.enrichedContent,
          isDeveloping: enrichmentResult.shouldContinueDeveloping,
          enrichmentCount: (article.enrichmentCount || 0) + 1,
          lastEnrichedAt: new Date()
        });
        
        enriched++;
        
        if (!enrichmentResult.shouldContinueDeveloping) {
          completed++;
          console.log(`✅ [ENRICHMENT] Story completed (no longer developing)`);
        } else {
          console.log(`🔄 [ENRICHMENT] Story still developing, will enrich again later`);
        }
        
      } catch (error) {
        console.error(`❌ [ENRICHMENT] Failed to enrich article ${article.id}:`, error);
        failed++;
      }
    }
    
    console.log(`\n📊 [ENRICHMENT COORDINATOR] Enrichment pass complete:`);
    console.log(`   Enriched: ${enriched}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Failed: ${failed}`);
    
    return { enriched, completed, failed };
  }
}
