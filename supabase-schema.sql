-- Supabase Schema Creation
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journalists table
CREATE TABLE IF NOT EXISTS journalists (
  id SERIAL PRIMARY KEY,
  nickname TEXT NOT NULL,
  surname TEXT NOT NULL,
  beat TEXT NOT NULL,
  bio TEXT NOT NULL,
  headshot TEXT,
  fun_fact TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  image_url TEXT,
  image_urls TEXT[],
  category TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  source_facebook_post_id TEXT,
  journalist_id INTEGER REFERENCES journalists(id),
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  interest_score INTEGER,
  event_type TEXT,
  severity TEXT,
  is_developing BOOLEAN DEFAULT FALSE,
  embedding REAL[],
  merged_into_id TEXT REFERENCES articles(id),
  depth_updates TEXT[]
);

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Session table (for express-session)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_source_url ON articles(source_url);
CREATE INDEX IF NOT EXISTS idx_articles_source_facebook_post_id ON articles(source_facebook_post_id);
CREATE INDEX IF NOT EXISTS idx_articles_journalist_id ON articles(journalist_id);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES
  ('News', 'news', 'General news and updates'),
  ('Crime', 'crime', 'Crime reports and safety alerts'),
  ('Local', 'local', 'Local community news'),
  ('Tourism', 'tourism', 'Tourism and travel news'),
  ('Politics', 'politics', 'Political news and updates'),
  ('Economy', 'economy', 'Economic and business news'),
  ('Traffic', 'traffic', 'Traffic and transportation updates'),
  ('Weather', 'weather', 'Weather forecasts and alerts')
ON CONFLICT (slug) DO NOTHING;

-- Success message
SELECT 'Schema created successfully!' as status;
