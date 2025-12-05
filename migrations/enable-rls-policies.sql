-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR PHUKETRADAR
-- ============================================================================
-- Purpose: Enable RLS on all tables as a defense-in-depth security measure
-- 
-- Architecture Context:
-- - This app uses a backend-first architecture
-- - All database access goes through Express server using service role
-- - Service role BYPASSES RLS automatically (this is Supabase default behavior)
-- - These policies block direct access via anon/authenticated Supabase keys
--
-- IMPORTANT: Run this migration in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
-- Contains admin credentials - NO public access whatsoever
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Block all direct access (service role still works)
CREATE POLICY "users_no_anon_access" ON public.users
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY "users_no_authenticated_access" ON public.users
    FOR ALL
    TO authenticated
    USING (false);

-- ============================================================================
-- 2. SESSION TABLE
-- ============================================================================
-- Contains session data - NO public access
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_no_anon_access" ON public.session
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY "session_no_authenticated_access" ON public.session
    FOR ALL
    TO authenticated
    USING (false);

-- ============================================================================
-- 3. SUBSCRIBERS TABLE
-- ============================================================================
-- Contains email addresses - NO public access
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscribers_no_anon_access" ON public.subscribers
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY "subscribers_no_authenticated_access" ON public.subscribers
    FOR ALL
    TO authenticated
    USING (false);

-- ============================================================================
-- 4. JOURNALISTS TABLE
-- ============================================================================
-- Public data (bios, headshots) - Allow READ for published content
ALTER TABLE public.journalists ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for displaying journalist info on articles)
CREATE POLICY "journalists_public_read" ON public.journalists
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Block write access
CREATE POLICY "journalists_no_anon_write" ON public.journalists
    FOR INSERT
    TO anon
    WITH CHECK (false);

CREATE POLICY "journalists_no_anon_update" ON public.journalists
    FOR UPDATE
    TO anon
    USING (false);

CREATE POLICY "journalists_no_anon_delete" ON public.journalists
    FOR DELETE
    TO anon
    USING (false);

CREATE POLICY "journalists_no_authenticated_write" ON public.journalists
    FOR INSERT
    TO authenticated
    WITH CHECK (false);

CREATE POLICY "journalists_no_authenticated_update" ON public.journalists
    FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY "journalists_no_authenticated_delete" ON public.journalists
    FOR DELETE
    TO authenticated
    USING (false);

-- ============================================================================
-- 5. ARTICLES TABLE
-- ============================================================================
-- Public content - Allow READ for published articles only
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Allow public read access ONLY for published articles
CREATE POLICY "articles_public_read_published" ON public.articles
    FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

-- Block all write access
CREATE POLICY "articles_no_anon_write" ON public.articles
    FOR INSERT
    TO anon
    WITH CHECK (false);

CREATE POLICY "articles_no_anon_update" ON public.articles
    FOR UPDATE
    TO anon
    USING (false);

CREATE POLICY "articles_no_anon_delete" ON public.articles
    FOR DELETE
    TO anon
    USING (false);

CREATE POLICY "articles_no_authenticated_write" ON public.articles
    FOR INSERT
    TO authenticated
    WITH CHECK (false);

CREATE POLICY "articles_no_authenticated_update" ON public.articles
    FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY "articles_no_authenticated_delete" ON public.articles
    FOR DELETE
    TO authenticated
    USING (false);

-- ============================================================================
-- 6. CATEGORIES TABLE
-- ============================================================================
-- Public reference data - Allow READ only
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON public.categories
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Block write access
CREATE POLICY "categories_no_anon_write" ON public.categories
    FOR INSERT
    TO anon
    WITH CHECK (false);

CREATE POLICY "categories_no_anon_update" ON public.categories
    FOR UPDATE
    TO anon
    USING (false);

CREATE POLICY "categories_no_anon_delete" ON public.categories
    FOR DELETE
    TO anon
    USING (false);

CREATE POLICY "categories_no_authenticated_write" ON public.categories
    FOR INSERT
    TO authenticated
    WITH CHECK (false);

CREATE POLICY "categories_no_authenticated_update" ON public.categories
    FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY "categories_no_authenticated_delete" ON public.categories
    FOR DELETE
    TO authenticated
    USING (false);

-- ============================================================================
-- 7. SCHEDULER_LOCKS TABLE
-- ============================================================================
-- Internal system table - NO public access
ALTER TABLE public.scheduler_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduler_locks_no_anon_access" ON public.scheduler_locks
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY "scheduler_locks_no_authenticated_access" ON public.scheduler_locks
    FOR ALL
    TO authenticated
    USING (false);

-- ============================================================================
-- 8. ARTICLE_METRICS TABLE
-- ============================================================================
-- Internal analytics - NO public access
ALTER TABLE public.article_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_metrics_no_anon_access" ON public.article_metrics
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY "article_metrics_no_authenticated_access" ON public.article_metrics
    FOR ALL
    TO authenticated
    USING (false);

-- ============================================================================
-- 9. SOCIAL_MEDIA_ANALYTICS TABLE
-- ============================================================================
-- Internal analytics - NO public access
ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_media_analytics_no_anon_access" ON public.social_media_analytics
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY "social_media_analytics_no_authenticated_access" ON public.social_media_analytics
    FOR ALL
    TO authenticated
    USING (false);

-- ============================================================================
-- 10. SCORE_ADJUSTMENTS TABLE (bonus - not in Security Advisor but good to protect)
-- ============================================================================
-- Internal AI learning data - NO public access
ALTER TABLE public.score_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_adjustments_no_anon_access" ON public.score_adjustments
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY "score_adjustments_no_authenticated_access" ON public.score_adjustments
    FOR ALL
    TO authenticated
    USING (false);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after applying policies to verify RLS is enabled:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     rowsecurity
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;
--
-- All tables should show rowsecurity = true
-- ============================================================================
