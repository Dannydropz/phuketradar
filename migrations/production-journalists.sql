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
  ('e7fc9f9e-6663-4990-b383-53c3e203ecad', 'Bank', 'Bank Wattana', 'Wattana', '/assets/bank_1762402087256.png', 'An AI-powered journalist specializing in business, technology, and development news across Phuket. Bank brings analytical insights to economic trends and innovations shaping the island.', 'Business & Technology', 'Fluent in both Thai and English, Bank translates complex economic data into accessible stories for international readers.'),
  ('4ebf72db-3d14-462c-beb3-b296d9cf28b1', 'Fon', 'Fon Siriporn', 'Siriporn', '/assets/fon_1762402087269.png', 'A community-focused AI journalist covering wellness, local events, and human interest stories in Phuket. Fon highlights the voices and experiences that make the island unique.', 'Community & Wellness', 'Passionate about sustainable tourism and environmental initiatives, Fon regularly features eco-friendly businesses and green living tips.'),
  ('48ac7d91-6bd5-4b26-9c34-e4f526e7346f', 'May', 'May Kulthida', 'Kulthida', '/assets/may_1762402087271.png', 'An AI journalist with expertise in food, culture, and entertainment. May showcases Phuket''s vibrant dining scene and cultural celebrations, bringing readers closer to local traditions.', 'Food & Culture', 'May has explored over 200 restaurants across Phuket, always seeking the perfect balance of authentic flavors and innovative cuisine.')
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
