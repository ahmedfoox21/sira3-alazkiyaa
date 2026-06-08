-- ===============================================
-- Migration 001 - Database Init & Seed Defaults
-- ===============================================

-- 1. Create Tables
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
    bullet_id VARCHAR(255), -- placeholder unused
    role VARCHAR(50) DEFAULT 'user',
    password_hash VARCHAR(255),
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

ALTER TABLE guilds DROP CONSTRAINT IF EXISTS fk_guild_creator;
ALTER TABLE guilds ADD CONSTRAINT fk_guild_creator FOREIGN KEY (creator_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE players ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE players ADD COLUMN IF NOT EXISTS temp_password_plain VARCHAR(255) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_players_email ON players (email);
CREATE INDEX IF NOT EXISTS idx_players_guild ON players (guild_id);

CREATE TABLE IF NOT EXISTS shop_items (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    rarity VARCHAR(50) NOT NULL,
    price_type VARCHAR(50) NOT NULL,
    price_value INTEGER NOT NULL,
    asset_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_relations (
    id VARCHAR(255) PRIMARY KEY,
    user_one_id VARCHAR(255) REFERENCES players(id) ON DELETE CASCADE,
    user_two_id VARCHAR(255) REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_pair UNIQUE (user_one_id, user_two_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_one ON friend_relations (user_one_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_two ON friend_relations (user_two_id);

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

CREATE TABLE IF NOT EXISTS tournaments (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    participants_count INTEGER DEFAULT 0,
    prizes_first VARCHAR(255) NOT NULL,
    prizes_second VARCHAR(255) NOT NULL,
    prizes_third VARCHAR(255) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS banned_emails (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed Shop Items
INSERT INTO shop_items (id, name, description, type, rarity, price_type, price_value, asset_value) VALUES
('avatar_gold_crown', 'أفاتار التاج الإمبراطوري 👑', 'تاج مرصع بالألماس والياقوت من خزانة ملوك الأندلس.', 'avatar', 'legendary', 'gems', 120, '👑'),
('avatar_dark_ninja', 'محارب الشينوبي القديم 🥷', 'مظهر نينجا غامض يختفي في الظل ويظهر بسؤال قاتل.', 'avatar', 'epic', 'coins', 3000, '🥷'),
('avatar_cyber_alien', 'المخلوق الفضائي السيبراني 👽', 'كائن غريب يمتلك قشرة دماغية فائقة التطور فلكياً.', 'avatar', 'rare', 'gems', 60, '👽'),
('avatar_cosmic_bug', 'كابوس العقول الرقمي 👾', 'فيروس ذكي يعربد في سيرفرات التحدي ويزرع الوجل.', 'avatar', 'legendary', 'gems', 150, '👾'),
('avatar_smart_robot', 'روبوت المعرفة المحوسب 🤖', 'آله تعمل بالذكاء الاصطناعي الكمي وحل أصعب الألغاز.', 'avatar', 'epic', 'coins', 2500, '🤖'),
('avatar_phoenix', 'العنقاء الملكية الحية 🦅', 'طائر ملتهب يولد من رماد المعارك لينتزع الفوز.', 'avatar', 'legendary', 'gems', 100, '🦅'),

('border_gold', 'إطار الكأس الذهبي المتوهج', 'إطار ذهبي ملكي يحيط بأيقونة حسابك بهيبة.', 'border', 'legendary', 'gems', 150, 'border-gold'),
('border_neon_purple', 'إطار النيون البنفسجي المضيء', 'وهج بنفسجي سيبراني حديث ومشرق بلمعان متصل.', 'border', 'epic', 'coins', 2000, 'border-purple'),
('border_cyan', 'إطار السايان المكهرب', 'إطار ازرق مشع بالطاقة الكهربائية المتفجرة.', 'border', 'rare', 'coins', 800, 'border-cyan'),
('border_fire', 'إطار لهب التنين الحارق 🔥', 'إطار طاقة متلألئ بلهيب ناري يعبر عن حدة الحماس.', 'border', 'legendary', 'gems', 250, 'border-fire'),
('border_frost', 'إطار الصقيع الملكي الأزرق ❄️', 'إطار حاد ومهيب محاط برذاذ ثلجي متجمد رائع.', 'border', 'epic', 'coins', 3500, 'border-frost'),
('border_rainbow', 'إطار الطيف المشع الأسطوري 🌈', 'يتدرج بألوان قوس قزح خلابة متحركة تسر الناظرين.', 'border', 'legendary', 'gems', 300, 'border-rainbow'),

('color_golden_name', 'لون اسم مذهب', 'يعرض اسمك الكود بلون ذهبي دائم فخم للجميع.', 'name_color', 'legendary', 'gems', 90, 'text-amber-400 font-bold'),
('color_magenta_name', 'لون اسم بنفسجي متوهج', 'صيغة فخمة تميز حضورك باللون البنفسجي الساطع.', 'name_color', 'epic', 'coins', 1000, 'text-fuchsia-400 font-semibold'),
('color_green_name', 'لون اسم زمردي ناصع 🟢', 'لون اخضر ملكي يزيد حضورك بريقاً ووقاراً.', 'name_color', 'rare', 'coins', 1200, 'text-emerald-400 font-semibold'),
('color_blue_name', 'لون اسم ياقوتي مستقبلي 🔵', 'صيغة زرقاء خلابة مستوحاة من عوالم السيبرانكس.', 'name_color', 'rare', 'coins', 1500, 'text-cyan-400 font-semibold'),
('color_yellow_name', 'لون اسم برقة ذهبي 🟡', 'يجعل اسمك أصفر وهاج وسهل القراءة بامتياز.', 'name_color', 'rare', 'coins', 1800, 'text-yellow-300 font-semibold'),
('color_rainbow_name', 'لون اسم الطيف المشع 🎨', 'تدرج نيون أسطوري منسق بعناية ولا يضر بوضوح القراءة.', 'name_color', 'legendary', 'gems', 120, 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 font-black animate-pulse'),

('title_philosopher', 'لقب أسطوري: فيلسوف العصر', 'لقب يعلو هويتك يعكس الحكمة وعمق الإحاطة في العلوم.', 'title', 'legendary', 'gems', 200, 'فيلسوف العصر'),
('title_quick_mind', 'لقب ملحمي: البرق والذكاء السريع', 'لقب مخصص لمن يدك الصعاب ويجيب بلمح البصر.', 'title', 'epic', 'coins', 1500, 'العقل الناري'),
('title_emperor', 'لقب أسطوري: إمبراطور الميدان 👑', 'لقب لسياد غرف التحدي ومالكي النقابات النافذة.', 'title', 'legendary', 'gems', 250, 'إمبراطور الميدان'),
('title_genius', 'لقب ملحمي: عبقري غامض 👁️', 'لقب مفعم بالألغاز والجاذبية في لوائح المنافسين.', 'title', 'epic', 'coins', 1800, 'عبقري غامض'),
('title_phoenix', 'لقب فخم: طائر الفينيق الأبدي 🦅', 'لقب رمزي مميز للشجاعة والقيام المتكرر نحو القمة.', 'title', 'rare', 'coins', 1200, 'طائر الفينيق'),

('bg_nebula', 'خلفية السديم الفضائي الملون', 'تدرج كوني خلاب لبطاقتك الشخصية بروح المجرات.', 'background', 'legendary', 'gems', 180, 'bg-gradient-to-br from-indigo-950 via-purple-900 to-black animate-pulse'),
('bg_desert_sunset', 'خلفية شفق الملوك الصحراوي', 'سمة دافئة ومهيبة بألوان برونزية غامرة على بطاقتك.', 'background', 'rare', 'coins', 2500, 'bg-gradient-to-tr from-amber-950 via-red-950 to-stone-900'),
('bg_cyberpunk', 'خلفية السايبربانك النيونية ⚡', 'سمة تقنية مستقبلية داكنة متدفقة بالأضواء والروعة.', 'background', 'epic', 'coins', 3000, 'bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950'),
('bg_cosmic_fire', 'خلفية الحمم البركانية الثائرة 🌋', 'تدرج بركاني أحمر ملتهب يلفت الأنظار لبطاقتك ويثبت عظمتك.', 'background', 'legendary', 'gems', 220, 'bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 animate-pulse'),

('effect_plasma_glow', 'مؤثر البلازما المتفجر', 'توهج بنفسجي متقطع حول الأيقونة ينبض بأعجوبة بصرية.', 'effect', 'epic', 'gems', 80, 'shadow-[0_0_15px_#a855f7] border-purple-500 animate-pulse'),
('effect_sun_spark', 'توهج شمس المعرفة', 'هالة ذهبية ساطعة تدور حول الأيقونة تعكس بريق المعرفة.', 'effect', 'legendary', 'coins', 4000, 'shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-bounce'),
('effect_shadow_aura', 'هالة الظل الأرجوانية الغامضة 🌌', 'هالة شعاع أرجواني سحري منساب بوقار حول هويتك.', 'effect', 'legendary', 'gems', 180, 'shadow-[0_0_25px_#8b5cf6] border-violet-600 animate-pulse'),
('effect_lightning', 'شرارات البرق والرعد المحيطة ⚡', 'صواعق رعدية صغيرة تفرقع بانتظام حاملاً روح المعارك المعرفية.', 'effect', 'epic', 'coins', 3500, 'shadow-[0_0_15px_#06b6d4] border-cyan-400 animate-bounce'),

('entrance_royal', 'دخول أسطوري: موكب الملوك 🎺', 'يعلن دخولك الغرف والشات بمعزوفة وتنبيه أسطوري يراه الجميع ويسمعه!', 'entrance_effect', 'legendary', 'gems', 300, 'entrance-royal'),
('entrance_darkness', 'دخول ملحمي: ضباب الظلام 🌫️', 'دخول بضباب غامق وصوت رعد مهيب يعلو قائمة الساحة عند انضمامك!', 'entrance_effect', 'epic', 'coins', 4000, 'entrance-darkness'),
('entrance_fire', 'دخول أسطوري: الشهاب الحارق ☄️', 'يسقط نيزك ملتهب مع صوت إنفجار نير بجميع أرجاء ساحة الأذكياء فور حضورك!', 'entrance_effect', 'legendary', 'gems', 250, 'entrance-fire'),

('guild_badge_crest', 'شعار التحالف الأبي', 'أيقونة شعار نقابة حصرية على نمط درع التاج السامي.', 'guild_badge', 'rare', 'coins', 1500, '⚜️'),
('guild_badge_star', 'شعار النجمة السباعية العتيقة', 'رمز النقابة المستلهم من موروث الفلاسفة العرب الأوائل.', 'guild_badge', 'epic', 'gems', 70, '⭐')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Default Tournament
INSERT INTO tournaments (id, title, end_date, participants_count, prizes_first, prizes_second, prizes_third) VALUES
(
  'tour_weekly', 
  'بطولة كأس الأذكياء الأسبوعية الكبرى', 
  (CURRENT_TIMESTAMP + INTERVAL '4 days'), 
  42, 
  '5000 ذهبة + 250 جوهرة + لقب أسطوري + إطار ذهبي', 
  '2500 ذهبة + 100 جوهرة + إطار فضي', 
  '1000 ذهبة + 50 جوهرة + إطار برونزي'
)
ON CONFLICT (id) DO NOTHING;
