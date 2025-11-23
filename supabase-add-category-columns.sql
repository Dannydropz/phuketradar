-- Add missing columns to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Update existing categories with default colors
UPDATE categories SET color = '#ef4444' WHERE slug = 'crime';
UPDATE categories SET color = '#3b82f6' WHERE slug = 'local';
UPDATE categories SET color = '#10b981' WHERE slug = 'tourism';
UPDATE categories SET color = '#8b5cf6' WHERE slug = 'politics';
UPDATE categories SET color = '#f59e0b' WHERE slug = 'economy';
UPDATE categories SET color = '#ec4899' WHERE slug = 'traffic';
UPDATE categories SET color = '#06b6d4' WHERE slug = 'weather';
UPDATE categories SET color = '#64748b' WHERE slug = 'national';

-- Success message
SELECT 'Category columns added successfully!' as status;
