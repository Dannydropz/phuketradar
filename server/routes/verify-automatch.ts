import { defineRoute, z } from "@hattip/router";
import { getTimelineService } from "../services/timeline-service";
import { StorageService } from "../services/storage";
import { db } from "../db";

export default defineRoute("/api/admin/verify-automatch", async (context) => {
    const storage = new StorageService(db);
    const timelineService = getTimelineService(storage);

    // Get timeline with auto-match enabled
    const timelines = await db
        .select()
        .from(articles)
        .where(
            and(
                eq(articles.isParentStory, true),
                eq(articles.autoMatchEnabled, true),
                isNotNull(articles.seriesId)
            )
        );

    return {
        status: 200,
        body: {
            autoMatchCodeDeployed: true,
            version: "2024-11-26-v2",
            timelinesWithAutoMatch: timelines.length,
            timelines: timelines.map(t => ({
                id: t.id,
                title: t.storySeriesTitle,
                tags: t.timelineTags,
                autoMatchEnabled: t.autoMatchEnabled
            })),
            message: "If you see this response, auto-match code IS deployed"
        }
    };
});
