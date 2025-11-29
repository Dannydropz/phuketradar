-- Track detailed article engagement metrics (simplified for external APIs)
CREATE TABLE IF NOT EXISTS article_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'google_analytics', 'search_console', 'facebook'
  metric_date DATE NOT NULL,
  
  -- Google Analytics metrics
  ga_views INTEGER DEFAULT 0,
  ga_avg_time_on_page REAL DEFAULT 0,
  ga_bounce_rate REAL DEFAULT 0,
  ga_scroll_depth REAL DEFAULT 0,
  
  -- Search Console metrics
  sc_clicks INTEGER DEFAULT 0,
  sc_impressions INTEGER DEFAULT 0,
  sc_ctr REAL DEFAULT 0,
  sc_avg_position REAL DEFAULT 0,
  
  -- Social media metrics (Facebook)
  fb_reach INTEGER DEFAULT 0,
  fb_clicks INTEGER DEFAULT 0,
  fb_engagement INTEGER DEFAULT 0,
  fb_ctr REAL DEFAULT 0,
  
  synced_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(article_id, source, metric_date)
);

-- Track social media post performance (detailed per-post)
CREATE TABLE IF NOT EXISTS social_media_analytics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'facebook', 'instagram', 'threads'
  post_id TEXT, -- Platform's post ID
  headline_variant TEXT, -- The headline used for this post
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  posted_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_metrics_article_id ON article_metrics(article_id);
CREATE INDEX IF NOT EXISTS idx_article_metrics_date ON article_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_social_media_analytics_article_id ON social_media_analytics(article_id);
CREATE INDEX IF NOT EXISTS idx_social_media_analytics_platform ON social_media_analytics(platform);
