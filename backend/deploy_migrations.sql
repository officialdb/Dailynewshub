-- Daily News Hub — Production Migration Script
-- Run this against the production PostgreSQL database before deploying the new backend.
--
-- Usage:
--   psql -U <user> -d <database> -f deploy_migrations.sql
--
-- All statements use IF NOT EXISTS / IF EXISTS where possible for idempotency.

BEGIN;

-- 1. Make bookmarks.article_id nullable (supports reel-only bookmarks)
ALTER TABLE bookmarks ALTER COLUMN article_id DROP NOT NULL;

-- 2. Add unique constraint for reel bookmarks
ALTER TABLE bookmarks ADD CONSTRAINT uq_bookmarks_user_reel UNIQUE (user_id, reel_id);

-- 3. Add parent_id to comments for reply threading
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON comments(parent_id);

-- 4. Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, comment_id)
);
CREATE INDEX IF NOT EXISTS ix_comment_likes_comment_id ON comment_likes(comment_id);

-- 5. Create reel_watch_events table (for recommendation engine)
CREATE TABLE IF NOT EXISTS reel_watch_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
    completion_ratio DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    skipped BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_reel_watch_events_user_id ON reel_watch_events(user_id);
CREATE INDEX IF NOT EXISTS ix_reel_watch_events_reel_id ON reel_watch_events(reel_id);
CREATE INDEX IF NOT EXISTS ix_reel_watch_events_created_at ON reel_watch_events(created_at);

-- 6. Clean up irrelevant categories (optional — only if your prod DB has them)
-- DELETE FROM categories WHERE slug IN (
--   'academia', 'auto', 'company', 'computing', 'crap', 'edmonton',
--   'game', 'jobs', 'legal', 'mining', 'movie', 'photography',
--   'programming', 'sioux-falls', 'tennessee', 'tv', 'research', 'opinion'
-- );

-- 7. Remove old auto-generated article fetch notifications
DELETE FROM notifications WHERE title = 'New articles available';

COMMIT;
