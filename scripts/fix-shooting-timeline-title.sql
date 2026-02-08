-- Script to update the timeline title for the shooting incident story
-- Run this on the production database to fix the existing story

-- Find and update the shooting incident timeline story
UPDATE articles
SET story_series_title = 'Phuket Shooting Incident: Iraqi National Killed in Patong - Developing'
WHERE 
    is_parent_story = true 
    AND series_id IS NOT NULL
    AND (
        title ILIKE '%Iraqi%' 
        OR title ILIKE '%shooting%' 
        OR title ILIKE '%Ameer Mundher%'
        OR story_series_title ILIKE '%Developing Story%Patong%'
    );

-- Verify the update
SELECT 
    id, 
    title, 
    story_series_title,
    series_id,
    is_parent_story
FROM articles
WHERE 
    is_parent_story = true 
    AND series_id IS NOT NULL
ORDER BY published_at DESC
LIMIT 5;
