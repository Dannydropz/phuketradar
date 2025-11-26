-- Check if keywords are actually saved in the database
SELECT 
  id,
  title,
  series_id,
  timeline_tags,
  auto_match_enabled,
  is_parent_story,
  is_published
FROM articles
WHERE is_parent_story = true 
  AND series_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
