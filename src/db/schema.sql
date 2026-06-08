-- ==========================================
-- Siraa Al-Adkiyaa Game PostgreSQL Schema
-- ==========================================
-- This file contains the complete database layout, types, tables, 
-- constraints, foreign keys, and indexes for the application.
-- Designed and engineered for Neon PostgreSQL Serverless environments.

-- 1. GUILDS TABLE (النقابات وتحالفات اللاعبين الكبار)
CREATE TABLE IF NOT EXISTS guilds (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    avatar VARCHAR(255) NOT NULL,
    badge VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    creator_id VARCHAR(255) NOT NULL,
    members_count INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PLAYERS TABLE (حسابات الأذكياء والمنافسين)
CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar VARCHAR(255) NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    guild_id VARCHAR(255) REFERENCES guilds(id) ON DELETE SET NULL,
    guild_name VARCHAR(255),
    coins INTEGER DEFAULT 500,
    gems INTEGER DEFAULT 30,
    title VARCHAR(255),
    name_color VARCHAR(255),
    border_id VARCHAR(255),
    bg_id VARCHAR(255),
    effect_id VARCHAR(255),
    entrance_id VARCHAR(255),
    is_banned BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    win_streak INTEGER DEFAULT 0,
    max_win_streak INTEGER DEFAULT 0,
    last_missions_reset_time BIGINT DEFAULT 0,
    owned_items JSONB DEFAULT '[]'::jsonb,
    missions_claimed JSONB DEFAULT '[]'::jsonb,
    missions_progress JSONB DEFAULT '{}'::jsonb,
    match_history JSONB DEFAULT '[]'::jsonb,
    friends JSONB DEFAULT '[]'::jsonb,
    friend_requests JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply the foreign key back from guilds to players creator_id
-- We configure ON DELETE CASCADE so if a user is completely deleted, we can clean up
ALTER TABLE guilds DROP CONSTRAINT IF EXISTS fk_guild_creator;
ALTER TABLE guilds ADD CONSTRAINT fk_guild_creator FOREIGN KEY (creator_id) REFERENCES players(id) ON DELETE CASCADE;

-- Create Indexes for faster lookup
CREATE INDEX IF NOT EXISTS idx_players_email ON players (email);
CREATE INDEX IF NOT EXISTS idx_players_guild ON players (guild_id);

-- 3. SHOP ITEMS TABLE (متجر مستحضرات الهوية المذهلة)
CREATE TABLE IF NOT EXISTS shop_items (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'avatar' | 'border' | 'name_color' | 'title' | 'background' | 'effect' | 'entrance_effect' | 'guild_badge'
    rarity VARCHAR(50) NOT NULL, -- 'common' | 'rare' | 'epic' | 'legendary'
    price_type VARCHAR(50) NOT NULL, -- 'coins' | 'gems'
    price_value INTEGER NOT NULL,
    asset_value TEXT NOT NULL
);

-- 4. FRIEND RELATIONS TABLE (علاقات الصداقة وطلبات المودة)
CREATE TABLE IF NOT EXISTS friend_relations (
    id VARCHAR(255) PRIMARY KEY,
    user_one_id VARCHAR(255) REFERENCES players(id) ON DELETE CASCADE,
    user_two_id VARCHAR(255) REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'pending_one_to_two' | 'pending_two_to_one' | 'friends'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_pair UNIQUE (user_one_id, user_two_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_one ON friend_relations (user_one_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_two ON friend_relations (user_two_id);

-- 5. GAME REPORTS TABLE (بلاغات الإشراف والتحكيم)
CREATE TABLE IF NOT EXISTS game_reports (
    id VARCHAR(255) PRIMARY KEY,
    reporter_id VARCHAR(255) REFERENCES players(id) ON DELETE CASCADE,
    reported_id VARCHAR(255) REFERENCES players(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    screenshot TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

-- 6. TOURNAMENTS TABLE (بطولات كأس المعرفة)
CREATE TABLE IF NOT EXISTS tournaments (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    participants_count INTEGER DEFAULT 0,
    prizes_first VARCHAR(255) NOT NULL,
    prizes_second VARCHAR(255) NOT NULL,
    prizes_third VARCHAR(255) NOT NULL
);

-- 7. CHAT MESSAGES TABLE (رسائل الهراء والتبادل العام)
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(255) PRIMARY KEY,
    sender_id VARCHAR(255) REFERENCES players(id) ON DELETE SET NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_avatar VARCHAR(255) NOT NULL,
    sender_title VARCHAR(255),
    sender_color VARCHAR(255),
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_system BOOLEAN DEFAULT FALSE
);

-- 8. BANNED EMAILS TABLE (البريد المحظور عن المنافسات)
CREATE TABLE IF NOT EXISTS banned_emails (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
