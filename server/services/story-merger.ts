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
      const systemPrompt = `You are a news editor combining multiple reports about the SAME incident into one comprehensive article.

Your goal is to:
1. Extract ALL unique details from each report
2. Resolve any contradictions (use most recent/specific info)
3. Create a single, cohesive article with complete information
4. Use active, journalistic writing style
5. Preserve Thai names, locations, and specific details
6. Mark the story as "developing" if key details are missing (names, exact time, full circumstances)

Return JSON with:
{
  "title": "Clear, specific headline combining key details",
  "content": "Full article combining all unique information, organized logically",
  "excerpt": "Brief summary (1-2 sentences)",
  "isDeveloping": true/false,
  "combinedDetails": "Brief note on what was combined (for logging)"
}`;

      // Prepare stories for merging
      const storiesText = stories.map((story, index) => {
        const timeAgo = this.getTimeAgo(story.publishedAt);
        return `--- Story ${index + 1} (published ${timeAgo}) ---
Title: ${story.originalTitle || story.title}
Content: ${(story.originalContent || story.content).substring(0, 1500)}
`;
      }).join('\n\n');

      const userPrompt = `Merge these ${stories.length} reports about the same incident into one comprehensive article:

${storiesText}

Create a single, complete article that includes all unique details from each report.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
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
