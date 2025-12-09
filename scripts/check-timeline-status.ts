import "dotenv/config";
import { db } from '../server/db';
import { articles } from '../shared/schema';
import { and, eq, isNotNull, ilike } from 'drizzle-orm';

(async () => {
    // Find all timelines
    const timelines = await db.select({
        id: articles.id,
        title: articles.title,
        storySeriesTitle: articles.storySeriesTitle,
        seriesId: articles.seriesId,
        isParentStory: articles.isParentStory,
        autoMatchEnabled: articles.autoMatchEnabled,
        timelineTags: articles.timelineTags,
        isDeveloping: articles.isDeveloping,
        interestScore: articles.interestScore
    })
        .from(articles)
        .where(and(
            eq(articles.isParentStory, true),
            isNotNull(articles.seriesId)
        ));

    console.log('=== All Timelines ===');
    for (const t of timelines) {
        console.log(`
Timeline: ${t.storySeriesTitle || t.title}
  ID: ${t.id}
  Series ID: ${t.seriesId}
  Auto-Match Enabled: ${t.autoMatchEnabled ? '✅ YES' : '❌ NO'}
  Is Developing: ${t.isDeveloping ? '✅ YES' : '❌ NO'}
  Interest Score: ${t.interestScore}
  Timeline Tags: ${t.timelineTags?.join(', ') || 'None'}
`);
    }

    process.exit(0);
})();
