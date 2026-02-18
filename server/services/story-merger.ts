import OpenAI from 'openai';
import { Article } from '@shared/schema';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MergedStory {
  title: string;
  content: string;
  excerpt: string;
  isDeveloping: boolean;
  combinedDetails: string; // Summary of what details were combined
}

export class StoryMergerService {

  /**
   * Merge multiple duplicate articles into one comprehensive story
   */
  async mergeStories(stories: Article[]): Promise<MergedStory> {
    if (stories.length === 0) {
      throw new Error('Cannot merge zero stories');
    }

    if (stories.length === 1) {
      // Single story, just return it
      return {
        title: stories[0].title,
        content: stories[0].content,
        excerpt: stories[0].excerpt,
        isDeveloping: stories[0].isDeveloping || false,
        combinedDetails: 'No merge required - single story'
      };
    }

    console.log(`[STORY MERGER] Merging ${stories.length} duplicate stories using GPT-4...`);

    try {
      const systemPrompt = `You are a news editor combining multiple reports about the SAME incident into one comprehensive, well-researched article.

Your goal is to:
1. Extract ALL unique details from each report - specific names, ages, quantities, times, locations
2. Reconcile different terminology that refers to the same thing (e.g., "iron rods" and "steel pipe" may be the same object)
3. Cross-reference information from different sources to build the most complete picture
4. Identify which source has the most specific/accurate information for each detail
5. Create a single, cohesive article that reads as if from a single well-informed source
6. Use active, journalistic writing style with specific details (not vague)
7. Preserve all Thai names, numbers, and specific locations

IMPORTANT FOR ACCURACY:
- If sources differ on a specific detail (e.g., location name), use the MORE SPECIFIC one
- If sources use different words for the same thing, combine them: "Large iron rods (steel pipes) from a crane..."
- Include ALL specific quantities, distances, times mentioned by any source
- Mark the story as "developing" ONLY if critical info is genuinely missing

Return JSON with:
{
  "title": "Most comprehensive headline with specific location and key detail",
  "content": "Full article combining ALL unique information from every source",
  "excerpt": "Compelling 1-2 sentence summary with key facts",
  "isDeveloping": true/false,
  "combinedDetails": "Brief note on what unique details each source contributed"
}`;

      // Prepare stories for merging - include source metadata
      const storiesText = stories.map((story, index) => {
        const timeAgo = this.getTimeAgo(story.publishedAt);
        const source = story.sourceName || 'Unknown';
        return `--- Story ${index + 1} (Source: ${source}, published ${timeAgo}) ---
Title: ${story.originalTitle || story.title}
Content: ${(story.originalContent || story.content).substring(0, 2000)}
`;
      }).join('\n\n');

      const userPrompt = `Merge these ${stories.length} reports about the same incident into one comprehensive article.
Extract and combine ALL specific details (names, ages, times, locations, quantities) from each source:

${storiesText}

Create a single, complete article that is MORE detailed than any individual source.
Note: This story is compiled from ${stories.length} different sources: ${stories.map(s => s.sourceName || 'Unknown').join(', ')}.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost optimization: mini is sufficient for merging stories
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      console.log(`[STORY MERGER] Successfully merged stories into: "${result.title}"`);
      console.log(`[STORY MERGER] Combined details: ${result.combinedDetails}`);
      console.log(`[STORY MERGER] Developing status: ${result.isDeveloping}`);

      return {
        title: result.title || stories[0].title,
        content: result.content || stories[0].content,
        excerpt: result.excerpt || stories[0].excerpt,
        isDeveloping: result.isDeveloping ?? true, // Default to developing if not specified
        combinedDetails: result.combinedDetails || `Merged ${stories.length} stories`
      };
    } catch (error) {
      console.error('[STORY MERGER] Error merging stories:', error);

      // Fallback: return the most recent/detailed story
      const fallback = stories.sort((a, b) =>
        b.content.length - a.content.length
      )[0];

      return {
        title: fallback.title,
        content: fallback.content,
        excerpt: fallback.excerpt,
        isDeveloping: true,
        combinedDetails: 'Merge failed, using longest story as fallback'
      };
    }
  }

  /**
   * Helper to calculate time ago from a date
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
