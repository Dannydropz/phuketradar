-- Production Migration: Add Journalists Feature
-- Run this in the Replit Production Database pane

-- Step 1: Create journalists table
CREATE TABLE IF NOT EXISTS "journalists" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nickname" text NOT NULL,
  "full_name" text NOT NULL,
  "surname" text NOT NULL,
  "headshot" text NOT NULL,
  "bio" text NOT NULL,
  "beat" text NOT NULL,
  "fun_fact" text NOT NULL
);

-- Step 2: Add journalist_id column to articles table (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'journalist_id'
  ) THEN
    ALTER TABLE "articles" ADD COLUMN "journalist_id" varchar;
  END IF;
END $$;

-- Step 3: Insert the 3 journalists
INSERT INTO "journalists" ("id", "nickname", "full_name", "surname", "headshot", "bio", "beat", "fun_fact")
VALUES
  ('e7fc9f9e-6663-4990-b383-53c3e203ecad', 'Bank', 'Bank Wattana', 'Wattana', '/assets/bank_1762402087256.png', 'Bank traded Bangkok''s skyline for ocean views, bringing his sharp city sense to Phuket Radar''s newsroom. Whether it''s startup trends, property buzz, or what''s shaping the island''s economy, he''s always one coffee ahead of the story.', 'Business, tech, and expat life', 'On weekends, he swaps spreadsheets for surf lessons at Kata Beach.'),
  ('4ebf72db-3d14-462c-beb3-b296d9cf28b1', 'Fon', 'Fon Siriporn', 'Siriporn', '/assets/fon_1762402087269.png', 'Born and raised in Phuket, Fon loves her island like her morning iced latte — strong, local, and refreshingly real. She''s the one chasing down town-hall updates, tracking community projects, and reminding everyone that there''s more to Phuket than just beaches.', 'Local news, community stories, wellness, and island life', 'You''ll often spot her at Chillva Market, notebook in hand and mango sticky rice in the other.'),
  ('48ac7d91-6bd5-4b26-9c34-e4f526e7346f', 'May', 'May Kulthida', 'Kulthida', '/assets/may_1762402087271.png', 'May swapped Chiang Mai''s misty hills for Phuket''s sea breeze — and never looked back. She writes about the people, flavors, and festivals that give the island its rhythm, always with a smile and camera in hand.', 'Food, festivals, lifestyle, and travel features', 'She''s obsessed with Phuket Old Town''s shophouses and claims to have found the island''s best moo hong (but won''t reveal where).')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Randomly distribute existing articles across the 3 journalists
WITH journalist_array AS (
  SELECT ARRAY_AGG(id ORDER BY nickname) as ids FROM journalists
),
article_list AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) - 1 as rn
  FROM articles
  WHERE journalist_id IS NULL
)
UPDATE articles a
SET journalist_id = (
  SELECT ids[((al.rn % 3) + 1)]
  FROM journalist_array, article_list al
  WHERE al.id = a.id
)
FROM article_list al
WHERE a.id = al.id;

-- Verification: Check distribution
SELECT j.nickname, j.surname, COUNT(a.id) as article_count 
FROM journalists j 
LEFT JOIN articles a ON a.journalist_id = j.id 
GROUP BY j.id, j.nickname, j.surname 
ORDER BY j.nickname;
