import "dotenv/config";
import { db } from '../server/db';
import { articles } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * End the Southern Thailand Flood timeline:
 * 1. Set isDeveloping to false (story is no longer actively developing)
 * 2. Reduce interest score to 3 (no longer breaking news)
 * 3. autoMatchEnabled is already false (user clicked button)
 */

const TIMELINE_ARTICLE_ID = '061467a6-37c6-45bb-ba63-da6734426e7b';

(async () => {
    console.log('📋 Ending timeline story...\n');

    // Get current state
    const [current] = await db.select({
        id: articles.id,
        title: articles.title,
        storySeriesTitle: articles.storySeriesTitle,
        isDeveloping: articles.isDeveloping,
        autoMatchEnabled: articles.autoMatchEnabled,
        interestScore: articles.interestScore
    })
        .from(articles)
        .where(eq(articles.id, TIMELINE_ARTICLE_ID));

    console.log('Current state:');
    console.log(`  - Title: ${current.storySeriesTitle || current.title}`);
    console.log(`  - Is Developing: ${current.isDeveloping}`);
    console.log(`  - Auto-Match Enabled: ${current.autoMatchEnabled}`);
    console.log(`  - Interest Score: ${current.interestScore}`);

    // Update to end the timeline
    await db.update(articles)
        .set({
            isDeveloping: false,
            interestScore: 3  // Cap at 3 since no longer breaking news
        })
        .where(eq(articles.id, TIMELINE_ARTICLE_ID));

    console.log('\n✅ Timeline ended successfully');
    console.log('  - Set isDeveloping to false');
    console.log('  - Set interestScore to 3');
    console.log('  - autoMatchEnabled already false');

    // Verify
    const [updated] = await db.select({
        isDeveloping: articles.isDeveloping,
        autoMatchEnabled: articles.autoMatchEnabled,
        interestScore: articles.interestScore
    })
        .from(articles)
        .where(eq(articles.id, TIMELINE_ARTICLE_ID));

    console.log('\nNew state:');
    console.log(`  - Is Developing: ${updated.isDeveloping}`);
    console.log(`  - Auto-Match Enabled: ${updated.autoMatchEnabled}`);
    console.log(`  - Interest Score: ${updated.interestScore}`);

    process.exit(0);
})();
