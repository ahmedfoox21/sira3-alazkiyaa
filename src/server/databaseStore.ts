import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { Player, Room, Guild, ShopItem, FriendRelation, GameReport, Tournament, ChatMessage, PrivateMessage, Notification } from "../types";
import { preloadedQuestions } from "./questionsData.js";

// Load environment configurations
dotenv.config();

const { Pool } = pg;

interface DBState {
  players: Record<string, Player>;
  rooms: Record<string, Room>;
  guilds: Record<string, Guild>;
  shopItems: ShopItem[];
  friendRelations: FriendRelation[];
  gameReports: GameReport[];
  tournaments: Tournament[];
  chatMessages: ChatMessage[];
  bannedEmails: string[];
}

// Map PostgreSQL row structures to camelCase application models
function rowToPlayer(row: any): Player | null {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatar: row.avatar,
    level: Number(row.level),
    xp: Number(row.xp),
    wins: Number(row.wins),
    losses: Number(row.losses),
    matchesPlayed: Number(row.matches_played),
    guildId: row.guild_id,
    guildName: row.guild_name,
    coins: Number(row.coins),
    gems: Number(row.gems),
    title: row.title,
    nameColor: row.name_color,
    borderId: row.border_id,
    bgId: row.bg_id,
    effectId: row.effect_id,
    entranceId: row.entrance_id,
    isBanned: !!row.is_banned,
    isMuted: !!row.is_muted,
    role: row.role || 'user',
    passwordHash: row.password_hash || undefined,
    winStreak: Number(row.win_streak),
    maxWinStreak: Number(row.max_win_streak),
    lastMissionsResetTime: row.last_missions_reset_time ? Number(row.last_missions_reset_time) : undefined,
    ownedItems: typeof row.owned_items === "string" ? JSON.parse(row.owned_items) : (row.owned_items || []),
    missionsClaimed: typeof row.missions_claimed === "string" ? JSON.parse(row.missions_claimed) : (row.missions_claimed || []),
    missionsProgress: typeof row.missions_progress === "string" ? JSON.parse(row.missions_progress) : (row.missions_progress || {}),
    matchHistory: typeof row.match_history === "string" ? JSON.parse(row.match_history) : (row.match_history || []),
    friends: typeof row.friends === "string" ? JSON.parse(row.friends) : (row.friends || []),
    friendRequests: typeof row.friend_requests === "string" ? JSON.parse(row.friend_requests) : (row.friend_requests || []),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

function rowToGuild(row: any): Guild | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    badge: row.badge,
    description: row.description,
    creatorId: row.creator_id,
    membersCount: Number(row.members_count),
    totalPoints: Number(row.total_points),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

function rowToShopItem(row: any): ShopItem | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type as any,
    rarity: row.rarity as any,
    priceType: row.price_type as any,
    priceValue: Number(row.price_value),
    assetValue: row.asset_value
  };
}

function rowToFriendRelation(row: any): FriendRelation | null {
  if (!row) return null;
  return {
    id: row.id,
    userOneId: row.user_one_id,
    userTwoId: row.user_two_id,
    status: row.status as any,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function rowToGameReport(row: any): GameReport | null {
  if (!row) return null;
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportedId: row.reported_id,
    reason: row.reason,
    description: row.description,
    screenshot: row.screenshot || undefined,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    status: row.status as any
  };
}

function rowToTournament(row: any): Tournament | null {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    endDate: row.end_date ? new Date(row.end_date).toISOString() : new Date().toISOString(),
    participantsCount: Number(row.participants_count),
    prizes: {
      first: row.prizes_first,
      second: row.prizes_second,
      third: row.prizes_third
    }
  };
}

function rowToChatMessage(row: any): ChatMessage | null {
  if (!row) return null;
  return {
    id: row.id,
    senderId: row.sender_id || "",
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    senderTitle: row.sender_title,
    senderColor: row.sender_color,
    message: row.message,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    isSystem: !!row.is_system,
    guildId: row.guild_id || null,
    roomId: row.room_id || null,
    roomStatus: row.room_status || null,
    roomType: row.room_type || null,
    roomMode: row.room_mode || null
  };
}

function rowToPrivateMessage(row: any): PrivateMessage | null {
  if (!row) return null;
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    message: row.message,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    isRead: !!row.is_read
  };
}

function rowToNotification(row: any): Notification | null {
  if (!row) return null;
  return {
    id: row.id,
    playerId: row.player_id,
    type: row.type as any,
    title: row.title,
    content: row.content,
    isRead: !!row.is_read,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    referenceId: row.reference_id || null,
    extraData: row.extra_data || null
  };
}

class DatabaseStore {
  public state: DBState = {
    players: {},
    rooms: {},
    guilds: {},
    shopItems: [],
    friendRelations: [],
    gameReports: [],
    tournaments: [],
    chatMessages: [],
    bannedEmails: []
  };

  private pool: pg.Pool | null = null;
  private dbConnected = false;

  constructor() {
    this.seedDefaultsInMemory();
    
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      this.initPostgres(dbUrl);
    } else {
      console.warn("⚠️ لم يتم العثور على DATABASE_URL في البيئة المحيطة. يعمل المشغّل بذاكرة محلية مؤقتة (No Persistence mode).");
    }
  }

  private async initPostgres(connectionString: string) {
    try {
      console.log("🔌 جاري الاتصال المباشر بقاعدة بيانات Neon PostgreSQL...");
      
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 10000,
        ssl: { rejectUnauthorized: false } // Required for serverless postgres like Neon
      });

      this.pool.on("error", (err) => {
        console.error("❌ خطأ مفاجئ في مجمع اتصال Postgres:", err);
      });

      // Fetch and run table migration schema
      const migrationPath = path.join(process.cwd(), "src", "db", "migration_001_init.sql");
      if (fs.existsSync(migrationPath)) {
        console.log("⚙️ جاري قراءة ملف تهجير الجداول وهيكل البيانات PostgreSQL...");
        const sql = fs.readFileSync(migrationPath, "utf-8");
        
        const client = await this.pool.connect();
        try {
          try {
            await client.query(sql);
            console.log("✅ تمت محاكاة وتشغيل ملف الهجرة بنجاح على قاعدة البيانات.");
          } catch (migrationErr: any) {
            console.warn("⚠️ تنبيه أثناء تنفيذ ملف الهجرة الكامل (قد يكون بسبب تكرار القيود أو الجداول):", migrationErr.message);
          }

          // Ensure crucial columns exist
          try {
            await client.query("ALTER TABLE players ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';");
          } catch (err: any) {
            console.error("❌ خطأ أثناء إضافة عمود role:", err.message);
          }

          try {
            await client.query("ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);");
          } catch (err: any) {
            console.error("❌ خطأ أثناء إضافة عمود password_hash:", err.message);
          }

          try {
            await client.query("ALTER TABLE players ADD COLUMN IF NOT EXISTS temp_password_plain VARCHAR(255) DEFAULT NULL;");
            console.log("✅ تم التأكد من جلب وجود عمود temp_password_plain بنجاح!");
          } catch (err: any) {
            console.error("❌ خطأ أثناء إضافة عمود temp_password_plain:", err.message);
          }

          // Create private_messages table
          try {
            await client.query(`
              CREATE TABLE IF NOT EXISTS private_messages (
                id VARCHAR(255) PRIMARY KEY,
                sender_id VARCHAR(255) REFERENCES players(id) ON DELETE SET NULL,
                receiver_id VARCHAR(255) REFERENCES players(id) ON DELETE SET NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_read BOOLEAN DEFAULT FALSE
              );
            `);
            console.log("✅ تم التأكد من وجود جدول private_messages بنجاح!");
          } catch (err: any) {
            console.error("❌ خطأ أثناء إنشاء جدول private_messages:", err.message);
          }

          // Create notifications table
          try {
            await client.query(`
              CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(255) PRIMARY KEY,
                player_id VARCHAR(255) REFERENCES players(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                reference_id VARCHAR(255) DEFAULT NULL,
                extra_data TEXT DEFAULT NULL
              );
            `);
            console.log("✅ تم التأكد من وجود جدول notifications بنجاح!");
          } catch (err: any) {
            console.error("❌ خطأ أثناء إنشاء جدول notifications:", err.message);
          }

          // Add new columns to chat_messages
          const chatCols = [
            "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS guild_id VARCHAR(255) DEFAULT NULL;",
            "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS room_id VARCHAR(255) DEFAULT NULL;",
            "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS room_status VARCHAR(255) DEFAULT NULL;",
            "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS room_type VARCHAR(255) DEFAULT NULL;",
            "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS room_mode VARCHAR(255) DEFAULT NULL;"
          ];

          for (const colQuery of chatCols) {
            try {
              await client.query(colQuery);
            } catch (err: any) {
              console.error(`❌ خطأ أثناء تعديل أعمدة chat_messages (${colQuery}):`, err.message);
            }
          }
        } finally {
          client.release();
        }
      }

      // Synchronize in-memory cache state with PostgreSQL values
      await this.loadCacheFromPostgres();

      // Check and execute requested accounts wipe (one-time operation)
      const wipeLockPath = path.join(process.cwd(), ".database_wiped_neon_adm_v10");
      if (!fs.existsSync(wipeLockPath)) {
        console.log("🧼 جاري تنظيف وحذف جميع الحسابات وبيانات اللاعبين السابقة من PostgreSQL...");
        const client = await this.pool.connect();
        try {
          await client.query("DELETE FROM friend_relations;");
          await client.query("DELETE FROM game_reports;");
          await client.query("DELETE FROM chat_messages;");
          await client.query("DELETE FROM guilds;");
          await client.query("DELETE FROM players;");
          fs.writeFileSync(wipeLockPath, "true");
          console.log("🧼 تمت عملية التنظيف بنجاح وبدء تهيئة نظيفة لقاعدة البيانات!");
        } catch (wipeErr) {
          console.error("❌ خطأ أثناء تنظيف الحسابات السابقة:", wipeErr);
        } finally {
          client.release();
        }
        // Reload cache to match the deleted state
        await this.loadCacheFromPostgres();
      }

      this.dbConnected = true;
      console.log("⚡ تم دمج قاعدة بيانات PostgreSQL في الكاش المتزامن الموضعي بنجاح!");

      // Ensure the default Administrator exists
      await this.ensureAdmin();
    } catch (e) {
      console.error("❌ فشلت تهيئة أو الربط والتهيئة مع Neon PostgreSQL:", e);
      console.log("⚠️ سيستمر المعالج باستعمال الكاش المحلي لتلافي إيقاف التطبيق.");
    }
  }

  private async loadCacheFromPostgres() {
    if (!this.pool) return;

    // 1. Process any pending raw password changes submitted from Neon Postgres console
    const client = await this.pool.connect();
    try {
      // Direct detection if players table has temp_password_plain column
      const colCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='players' AND column_name='temp_password_plain';
      `);

      if (colCheck.rows.length > 0) {
        const pendingRes = await client.query(
          "SELECT id, temp_password_plain FROM players WHERE temp_password_plain IS NOT NULL AND temp_password_plain <> ''"
        );
        if (pendingRes.rows.length > 0) {
          console.log(`🔑 اكتشاف طلبات تغيير كلمة المرور لـ (${pendingRes.rows.length}) لاعبين من Neon console. جاري التشفير والمزامنة...`);
          for (const row of pendingRes.rows) {
            const salt = bcrypt.genSaltSync(10);
            const newHash = bcrypt.hashSync(row.temp_password_plain, salt);
            await client.query(
              "UPDATE players SET password_hash = $1, temp_password_plain = NULL WHERE id = $2",
              [newHash, row.id]
            );
            console.log(`✅ تم تحديث كلمة مرور اللاعب ذو المعرف (${row.id}) بنجاح وتم تنظيف النص الواضح.`);
          }
        }
      }
    } catch (err) {
      console.error("❌ خطأ أثناء فحص وتطبيق عمود temp_password_plain:", err);
    } finally {
      client.release();
    }

    const playersRes = await this.pool.query("SELECT * FROM players");
    const guildsRes = await this.pool.query("SELECT * FROM guilds");
    const shopItemsRes = await this.pool.query("SELECT * FROM shop_items");
    const friendsRes = await this.pool.query("SELECT * FROM friend_relations");
    const reportsRes = await this.pool.query("SELECT * FROM game_reports");
    const tournamentsRes = await this.pool.query("SELECT * FROM tournaments");
    const chatRes = await this.pool.query("SELECT * FROM chat_messages ORDER BY timestamp ASC");
    const bannedRes = await this.pool.query("SELECT * FROM banned_emails");

    // Clear and build the in-memory state with actual persistent values
    this.state.players = {};
    playersRes.rows.forEach(row => {
      const p = rowToPlayer(row);
      if (p) this.state.players[p.id] = p;
    });

    this.state.guilds = {};
    guildsRes.rows.forEach(row => {
      const g = rowToGuild(row);
      if (g) this.state.guilds[g.id] = g;
    });

    this.state.shopItems = shopItemsRes.rows.map(rowToShopItem).filter(Boolean) as ShopItem[];
    this.state.friendRelations = friendsRes.rows.map(rowToFriendRelation).filter(Boolean) as FriendRelation[];
    this.state.gameReports = reportsRes.rows.map(rowToGameReport).filter(Boolean) as GameReport[];
    this.state.tournaments = tournamentsRes.rows.map(rowToTournament).filter(Boolean) as Tournament[];
    this.state.chatMessages = chatRes.rows.map(rowToChatMessage).filter(Boolean) as ChatMessage[];
    this.state.bannedEmails = bannedRes.rows.map(row => row.email.toLowerCase());
  }

  private async ensureAdmin() {
    if (!this.pool || !this.dbConnected) return;

    const adminEmail = (process.env.ADMIN_EMAIL || "ahmedfox@gmail.com").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "0115855847";

    const client = await this.pool.connect();
    try {
      // Direct query to find existing admin configurations
      const res = await client.query(
        "SELECT * FROM players WHERE id = 'admin_user' OR LOWER(email) = $1 OR role = 'admin'",
        [adminEmail]
      );

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(adminPassword, salt);

      if (res.rows.length === 0) {
        console.log(`👮‍♂️ لم يتم العثور على حساب المشرف العام في PostgreSQL. جاري إنشائه تلقائياً للبريد الإلكتروني: ${adminEmail}`);

        // Insert administrator player directly into the database
        await client.query(`
          INSERT INTO players (
            id, username, email, avatar, level, xp, wins, losses, matches_played,
            guild_id, guild_name, coins, gems, title, name_color, border_id,
            bg_id, effect_id, entrance_id, is_banned, is_muted, win_streak, max_win_streak,
            last_missions_reset_time, owned_items, missions_claimed, missions_progress,
            match_history, friends, friend_requests, role, password_hash
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23,
            $24, $25, $26, $27, $28, $29, $30, $31, $32
          )
        `, [
          "admin_user", "المشرف العام", adminEmail, "🦸‍♂️", 99, 9999, 320, 12, 332,
          null, null, 99999, 9999, "مطور اللعبة الأكبر", "text-amber-400 font-bold animate-glow", "border_gold",
          null, null, null, false, false, 0, 0,
          0, '[]', '[]', '{}', '[]', '[]', '[]', "admin", hashedPassword
        ]);
        console.log("✅ تم إنشاء وتثبيت حساب المشرف العام بنجاح داخل قاعدة بيانات Neon PostgreSQL!");
      } else {
        const mainRow = res.rows[0];

        // Ensure ONLY one administrator is created by cleaning up additional queries matching credentials
        if (res.rows.length > 1) {
          console.warn(`⚠️ تم العثور على أكثر من صف يطابق شروط الإدارة. جاري التطهير وإبقاء صف واحد فقط...`);
          for (let i = 1; i < res.rows.length; i++) {
            const rowToDelete = res.rows[i];
            if (rowToDelete.id !== mainRow.id) {
              await client.query("DELETE FROM players WHERE id = $1", [rowToDelete.id]);
            }
          }
        }

        // Sync or correct credentials and role
        let needUpdate = false;
        const currentPassHash = mainRow.password_hash;
        const passwordMatches = currentPassHash ? bcrypt.compareSync(adminPassword, currentPassHash) : false;

        if (mainRow.role !== "admin" || mainRow.email.toLowerCase() !== adminEmail || !passwordMatches || mainRow.id !== "admin_user") {
          needUpdate = true;
        }

        if (needUpdate) {
          console.log("🛠️ جاري تحديث بيانات المشرف العام ببيانات .env الجديدة...");
          await client.query(
            "UPDATE players SET role = 'admin', email = $1, password_hash = $2, username = 'المشرف العام', id = 'admin_user' WHERE id = $3",
            [adminEmail, hashedPassword, mainRow.id]
          );
        }
      }
    } catch (e) {
      console.error("❌ فشل تأمين حساب المشرف العام في PostgreSQL:", e);
    } finally {
      client.release();
    }

    // Refresh memory cache completely after admin synchronization
    await this.loadCacheFromPostgres();
  }

  private async executePostgresQuery(queryText: string, params: any[] = []) {
    if (!this.pool || !this.dbConnected) return;

    try {
      await this.pool.query(queryText, params);
    } catch (error) {
      console.error("❌ فشل تشغيل الاستعلام غير المتزامن في الخلفية على PostgreSQL:", error);
    }
  }

  private seedDefaultsInMemory() {
    // Seeding static catalogs to local storage before dynamic pg connections settle
    this.state.shopItems = [
      {
        id: "avatar_gold_crown",
        name: "أفاتار التاج الإمبراطوري 👑",
        description: "تاج مرصع بالألماس والياقوت من خزانة ملوك الأندلس.",
        type: "avatar",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 120,
        assetValue: "👑"
      },
      {
        id: "avatar_dark_ninja",
        name: "محارب الشينوبي القديم 🥷",
        description: "مظهر نينجا غامض يختفي في الظل ويظهر بسؤال قاتل.",
        type: "avatar",
        rarity: "epic",
        priceType: "coins",
        priceValue: 3000,
        assetValue: "🥷"
      },
      {
        id: "avatar_cyber_alien",
        name: "المخلوق الفضائي السيبراني 👽",
        description: "كائن غريب يمتلك قشرة دماغية فائقة التطور فلكياً.",
        type: "avatar",
        rarity: "rare",
        priceType: "gems",
        priceValue: 60,
        assetValue: "👽"
      },
      {
        id: "avatar_cosmic_bug",
        name: "كابوس العقول الرقمي 👾",
        description: "فيروس ذكي يعربد في سيرفرات التحدي ويزرع الوجل.",
        type: "avatar",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 150,
        assetValue: "👾"
      },
      {
        id: "avatar_smart_robot",
        name: "روبوت المعرفة المحوسب 🤖",
        description: "آلة تعمل بالذكاء الاصطناعي الكمي وحل أصعب الألغاز.",
        type: "avatar",
        rarity: "epic",
        priceType: "coins",
        priceValue: 2500,
        assetValue: "🤖"
      },
      {
        id: "avatar_phoenix",
        name: "العنقاء الملكية الحية 🦅",
        description: "طائر ملتهب يولد من رماد المعارك لينتزع الفوز.",
        type: "avatar",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 100,
        assetValue: "🦅"
      },

      // BORDERS
      {
        id: "border_gold",
        name: "إطار الكأس الذهبي المتوهج",
        description: "إطار ذهبي ملكي يحيط بأيقونة حسابك بهيبة.",
        type: "border",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 150,
        assetValue: "border-gold"
      },
      {
        id: "border_neon_purple",
        name: "إطار النيون البنفسجي المضيء",
        description: "وهج بنفسجي سيبراني حديث ومشرق بلمعان متصل.",
        type: "border",
        rarity: "epic",
        priceType: "coins",
        priceValue: 2000,
        assetValue: "border-purple"
      },
      {
        id: "border_cyan",
        name: "إطار السايان المكهرب",
        description: "إطار ازرق مشع بالطاقة الكهربائية المتفجرة.",
        type: "border",
        rarity: "rare",
        priceType: "coins",
        priceValue: 800,
        assetValue: "border-cyan"
      },
      {
        id: "border_fire",
        name: "إطار لهب التنين الحارق 🔥",
        description: "إطار طاقة متلألئ بلهيب ناري يعبر عن حدة الحماس.",
        type: "border",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 250,
        assetValue: "border-fire"
      },
      {
        id: "border_frost",
        name: "إطار الصقيع الملكي الأزرق ❄️",
        description: "إطار حاد ومهيب محاط برذاذ ثلجي متجمد رائع.",
        type: "border",
        rarity: "epic",
        priceType: "coins",
        priceValue: 3500,
        assetValue: "border-frost"
      },
      {
        id: "border_rainbow",
        name: "إطار الطيف المشع الأسطوري 🌈",
        description: "يتدرج بألوان قوس قزح خلابة متحركة تسر الناظرين.",
        type: "border",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 300,
        assetValue: "border-rainbow"
      },

      // NAME COLORS
      {
        id: "color_golden_name",
        name: "لون اسم مذهب",
        description: "يعرض اسمك الكود بلون ذهبي دائم فخم للجميع.",
        type: "name_color",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 90,
        assetValue: "text-amber-400 font-bold"
      },
      {
        id: "color_magenta_name",
        name: "لون اسم بنفسجي متوهج",
        description: "صيغة فخمة تميز حضورك باللون البنفسجي الساطع.",
        type: "name_color",
        rarity: "epic",
        priceType: "coins",
        priceValue: 1000,
        assetValue: "text-fuchsia-400 font-semibold"
      },
      {
        id: "color_green_name",
        name: "لون اسم زمردي ناصع 🟢",
        description: "لون اخضر ملكي يزيد حضورك بريقاً ووقاراً.",
        type: "name_color",
        rarity: "rare",
        priceType: "coins",
        priceValue: 1200,
        assetValue: "text-emerald-400 font-semibold"
      },
      {
        id: "color_blue_name",
        name: "لون اسم ياقوتي مستقبلي 🔵",
        description: "صيغة زرقاء خلابة مستوحاة من عوالم السيبرانكس.",
        type: "name_color",
        rarity: "rare",
        priceType: "coins",
        priceValue: 1500,
        assetValue: "text-cyan-400 font-semibold"
      },
      {
        id: "color_yellow_name",
        name: "لون اسم برقة ذهبي 🟡",
        description: "يجعل اسمك أصفر وهاج وسهل القراءة بامتياز.",
        type: "name_color",
        rarity: "rare",
        priceType: "coins",
        priceValue: 1800,
        assetValue: "text-yellow-300 font-semibold"
      },
      {
        id: "color_rainbow_name",
        name: "لون اسم الطيف المشع 🎨",
        description: "تدرج نيون أسطوري منسق بعناية ولا يضر بوضوح القراءة.",
        type: "name_color",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 120,
        assetValue: "text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 font-black animate-pulse"
      },

      // TITLES
      {
        id: "title_philosopher",
        name: "لقب أسطوري: فيلسوف العصر",
        description: "لقب يعلو هويتك يعكس الحكمة وعمق الإحاطة في العلوم.",
        type: "title",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 200,
        assetValue: "فيلسوف العصر"
      },
      {
        id: "title_quick_mind",
        name: "لقب ملحمي: البرق والذكاء السريع",
        description: "لقب مخصص لمن يدك الصعاب ويجيب بلمح البصر.",
        type: "title",
        rarity: "epic",
        priceType: "coins",
        priceValue: 1500,
        assetValue: "العقل الناري"
      },
      {
        id: "title_emperor",
        name: "لقب أسطوري: إمبراطور الميدان 👑",
        description: "لقب لسياد غرف التحدي ومالكي النقابات النافذة.",
        type: "title",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 250,
        assetValue: "إمبراطور الميدان"
      },
      {
        id: "title_genius",
        name: "لقب ملحمي: عبقري غامض 👁️",
        description: "لقب مفعم بالألغاز والجاذبية في لوائح المنافسين.",
        type: "title",
        rarity: "epic",
        priceType: "coins",
        priceValue: 1800,
        assetValue: "عبقري غامض"
      },
      {
        id: "title_phoenix",
        name: "لقب فخم: طائر الفينيق الأبدي 🦅",
        description: "لقب رمزي مميز للشجاعة والقيام المتكرر نحو القمة.",
        type: "title",
        rarity: "rare",
        priceType: "coins",
        priceValue: 1200,
        assetValue: "طائر الفينيق"
      },

      // BACKGROUNDS
      {
        id: "bg_nebula",
        name: "خلفية السديم الفضائي الملون",
        description: "تدرج كوني خلاب لبطاقتك الشخصية بروح المجرات.",
        type: "background",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 180,
        assetValue: "bg-gradient-to-br from-indigo-950 via-purple-900 to-black animate-pulse"
      },
      {
        id: "bg_desert_sunset",
        name: "خلفية شفق الملوك الصحراوي",
        description: "سمة دافئة ومهيبة بألوان برونزية غامرة على بطاقتك.",
        type: "background",
        rarity: "rare",
        priceType: "coins",
        priceValue: 2500,
        assetValue: "bg-gradient-to-tr from-amber-950 via-red-950 to-stone-900"
      },
      {
        id: "bg_cyberpunk",
        name: "خلفية السايبربانك النيونية ⚡",
        description: "سمة تقنية مستقبلية داكنة متدفقة بالأضواء والروعة.",
        type: "background",
        rarity: "epic",
        priceType: "coins",
        priceValue: 3000,
        assetValue: "bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950"
      },
      {
        id: "bg_cosmic_fire",
        name: "خلفية الحمم البركانية الثائرة 🌋",
        description: "تدرج بركاني أحمر ملتهب يلفت الأنظار لبطاقتك ويثبت عظمتك.",
        type: "background",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 220,
        assetValue: "bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 animate-pulse"
      },

      // HALO EFFECTS
      {
        id: "effect_plasma_glow",
        name: "مؤثر البلازما المتفجر",
        description: "توهج بنفسجي متقطع حول الأيقونة ينبض بأعجوبة بصرية.",
        type: "effect",
        rarity: "epic",
        priceType: "gems",
        priceValue: 80,
        assetValue: "shadow-[0_0_15px_#a855f7] border-purple-500 animate-pulse"
      },
      {
        id: "effect_sun_spark",
        name: "توهج شمس المعرفة",
        description: "هالة ذهبية ساطعة تدور حول الأيقونة تعكس بريق المعرفة.",
        type: "effect",
        rarity: "legendary",
        priceType: "coins",
        priceValue: 4000,
        assetValue: "shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-bounce"
      },
      {
        id: "effect_shadow_aura",
        name: "هالة الظل الأرجوانية الغامضة 🌌",
        description: "هالة شعاع أرجواني سحري منساب بوقار حول هويتك.",
        type: "effect",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 180,
        assetValue: "shadow-[0_0_25px_#8b5cf6] border-violet-600 animate-pulse"
      },
      {
        id: "effect_lightning",
        name: "شرارات البرق والرعد المحيطة ⚡",
        description: "صواعق رعدية صغيرة تفرقع بانتظام حاملاً روح المعارك المعرفية.",
        type: "effect",
        rarity: "epic",
        priceType: "coins",
        priceValue: 3500,
        assetValue: "shadow-[0_0_15px_#06b6d4] border-cyan-400 animate-bounce"
      },

      // ENTRANCE EFFECTS
      {
        id: "entrance_royal",
        name: "دخول أسطوري: موكب الملوك 🎺",
        description: "يعلن دخولك الغرف والشات بمعزوفة وتنبيه أسطوري يراه الجميع ويسمعه!",
        type: "entrance_effect",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 300,
        assetValue: "entrance-royal"
      },
      {
        id: "entrance_darkness",
        name: "دخول ملحمي: ضباب الظلام 🌫️",
        description: "دخول بضباب غامق وصوت رعد مهيب يعلو قائمة الساحة عند انضمامك!",
        type: "entrance_effect",
        rarity: "epic",
        priceType: "coins",
        priceValue: 4000,
        assetValue: "entrance-darkness"
      },
      {
        id: "entrance_fire",
        name: "دخول أسطوري: الشهاب الحارق ☄️",
        description: "يسقط نيزك ملتهب مع صوت إنفجار نير بجميع أرجاء ساحة الأذكياء فور حضورك!",
        type: "entrance_effect",
        rarity: "legendary",
        priceType: "gems",
        priceValue: 250,
        assetValue: "entrance-fire"
      },

      // GUILD BADGES
      {
        id: "guild_badge_crest",
        name: "شعار التحالف الأبي",
        description: "أيقونة شعار نقابة حصرية على نمط درع التاج السامي.",
        type: "guild_badge",
        rarity: "rare",
        priceType: "coins",
        priceValue: 1500,
        assetValue: "⚜️"
      },
      {
        id: "guild_badge_star",
        name: "شعار النجمة السباعية العتيقة",
        description: "رمز النقابة المستلهم من موروث الفلاسفة العرب الأوائل.",
        type: "guild_badge",
        rarity: "epic",
        priceType: "gems",
        priceValue: 70,
        assetValue: "⭐"
      }
    ];

    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);
    this.state.tournaments = [
      {
        id: "tour_weekly",
        title: "بطولة كأس الأذكياء الأسبوعية الكبرى",
        endDate: fourDaysFromNow.toISOString(),
        participantsCount: 42,
        prizes: {
          first: "5000 ذهبة + 250 جوهرة + لقب أسطوري + إطار ذهبي",
          second: "2500 ذهبة + 100 جوهرة + إطار فضي",
          third: "1000 ذهبة + 50 جوهرة + إطار برونزي"
        }
      }
    ];
  }

  // Clean raw language formatting
  public cleanText(text: string): string {
    const badWords = ["كلب", "حمار", "غبي", "حقير", "سافل", "حيوان", "تفو", "ياور", "شتم", "لعنة"];
    let result = text;
    badWords.forEach(word => {
      const regex = new RegExp(word, "gi");
      result = result.replace(regex, "***");
    });
    return result;
  }

  // Admin and Banning Operations
  public isBannedEmail(email: string): boolean {
    return this.state.bannedEmails.includes(email.toLowerCase());
  }

  public banPlayer(email: string) {
    const lowerEmail = email.toLowerCase();
    if (!this.state.bannedEmails.includes(lowerEmail)) {
      this.state.bannedEmails.push(lowerEmail);
      
      // Update local memory-cache profiles
      Object.values(this.state.players).forEach(p => {
        if (p.email.toLowerCase() === lowerEmail) {
          p.isBanned = true;
        }
      });

      // Synchronize in background with Neon Postgres database
      this.executePostgresQuery(
        "INSERT INTO banned_emails (email) VALUES ($1) ON CONFLICT (email) DO NOTHING",
        [lowerEmail]
      );
      this.executePostgresQuery(
        "UPDATE players SET is_banned = TRUE WHERE LOWER(email) = $1",
        [lowerEmail]
      );
    }
  }

  public unbanPlayer(email: string) {
    const lowerEmail = email.toLowerCase();
    this.state.bannedEmails = this.state.bannedEmails.filter(e => e !== lowerEmail);
    
    Object.values(this.state.players).forEach(p => {
      if (p.email.toLowerCase() === lowerEmail) {
        p.isBanned = false;
      }
    });

    this.executePostgresQuery(
      "DELETE FROM banned_emails WHERE LOWER(email) = $1",
      [lowerEmail]
    );
    this.executePostgresQuery(
      "UPDATE players SET is_banned = FALSE WHERE LOWER(email) = $1",
      [lowerEmail]
    );
  }

  // Active Players Retrieve/Save
  public getPlayer(id: string): Player | null {
    return this.state.players[id] || null;
  }

  public getPlayerByEmail(email: string): Player | null {
    return Object.values(this.state.players).find(p => p.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public async syncPlayerFromDB(email: string): Promise<Player | null> {
    if (!this.pool || !this.dbConnected) return null;

    const client = await this.pool.connect();
    try {
      const lowerEmail = email.toLowerCase();
      const selectRes = await client.query(
        "SELECT * FROM players WHERE LOWER(email) = $1",
        [lowerEmail]
      );

      if (selectRes.rows.length === 0) {
        return null; // Not found
      }

      let row = selectRes.rows[0];

      // If they have set a temp_password_plain via Neon console, process and hash it instantly on demand
      if (row.temp_password_plain && row.temp_password_plain.trim() !== "") {
        const salt = bcrypt.genSaltSync(10);
        const newHash = bcrypt.hashSync(row.temp_password_plain, salt);
        
        await client.query(
          "UPDATE players SET password_hash = $1, temp_password_plain = NULL WHERE id = $2",
          [newHash, row.id]
        );
        console.log(`🔑 [مزامنة فورية] تم تحديث كلمة مرور اللاعب (${row.username}) وتشفيرها بنجاح مع Neon!`);
        
        const updatedSelect = await client.query(
          "SELECT * FROM players WHERE id = $1",
          [row.id]
        );
        if (updatedSelect.rows.length > 0) {
          row = updatedSelect.rows[0];
        }
      }

      const updatedPlayer = rowToPlayer(row);
      if (updatedPlayer) {
        // Hydrate the in-memory cache instantly
        this.state.players[updatedPlayer.id] = updatedPlayer;
        return updatedPlayer;
      }
    } catch (err) {
      console.error("❌ خطأ أثناء مزامنة اللاعب مع PostgreSQL:", err);
    } finally {
      client.release();
    }
    return null;
  }

  public savePlayer(player: Player) {
    this.state.players[player.id] = player;

    // Asynchronous Write-Behind upsert down to Neon connection securely
    this.executePostgresQuery(`
      INSERT INTO players (
        id, username, email, avatar, level, xp, wins, losses, matches_played,
        guild_id, guild_name, coins, gems, title, name_color, border_id,
        bg_id, effect_id, entrance_id, is_banned, is_muted, win_streak, max_win_streak,
        last_missions_reset_time, owned_items, missions_claimed, missions_progress,
        match_history, friends, friend_requests, role, password_hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29, $30, $31, $32
      ) ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        level = EXCLUDED.level,
        xp = EXCLUDED.xp,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        matches_played = EXCLUDED.matches_played,
        guild_id = EXCLUDED.guild_id,
        guild_name = EXCLUDED.guild_name,
        coins = EXCLUDED.coins,
        gems = EXCLUDED.gems,
        title = EXCLUDED.title,
        name_color = EXCLUDED.name_color,
        border_id = EXCLUDED.border_id,
        bg_id = EXCLUDED.bg_id,
        effect_id = EXCLUDED.effect_id,
        entrance_id = EXCLUDED.entrance_id,
        is_banned = EXCLUDED.is_banned,
        is_muted = EXCLUDED.is_muted,
        win_streak = EXCLUDED.win_streak,
        max_win_streak = EXCLUDED.max_win_streak,
        last_missions_reset_time = EXCLUDED.last_missions_reset_time,
        owned_items = EXCLUDED.owned_items,
        missions_claimed = EXCLUDED.missions_claimed,
        missions_progress = EXCLUDED.missions_progress,
        match_history = EXCLUDED.match_history,
        friends = EXCLUDED.friends,
        friend_requests = EXCLUDED.friend_requests,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash
    `, [
      player.id, player.username, player.email, player.avatar, player.level, player.xp, player.wins, player.losses, player.matchesPlayed,
      player.guildId, player.guildName, player.coins, player.gems, player.title, player.nameColor, player.borderId,
      player.bgId, player.effectId, player.entranceId, player.isBanned || false, player.isMuted || false, player.winStreak || 0, player.maxWinStreak || 0,
      player.lastMissionsResetTime ? Number(player.lastMissionsResetTime) : 0,
      JSON.stringify(player.ownedItems || []),
      JSON.stringify(player.missionsClaimed || []),
      JSON.stringify(player.missionsProgress || {}),
      JSON.stringify(player.matchHistory || []),
      JSON.stringify(player.friends || []),
      JSON.stringify(player.friendRequests || []),
      player.role || 'user',
      player.passwordHash || null
    ]);
  }

  public listPlayers(): Player[] {
    return Object.values(this.state.players);
  }

  // Guilds DB Operations
  public getGuild(id: string): Guild | null {
    return this.state.guilds[id] || null;
  }

  public createGuild(guild: Guild) {
    this.state.guilds[guild.id] = guild;

    this.executePostgresQuery(`
      INSERT INTO guilds (id, name, avatar, badge, description, creator_id, members_count, total_points, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar,
        badge = EXCLUDED.badge,
        description = EXCLUDED.description,
        creator_id = EXCLUDED.creator_id,
        members_count = EXCLUDED.members_count,
        total_points = EXCLUDED.total_points
    `, [
      guild.id, guild.name, guild.avatar, guild.badge, guild.description, guild.creatorId, guild.membersCount, guild.totalPoints, guild.createdAt
    ]);
  }

  public listGuilds(): Guild[] {
    return Object.values(this.state.guilds).sort((a, b) => b.totalPoints - a.totalPoints);
  }

  public deleteGuild(id: string) {
    delete this.state.guilds[id];
    
    // Dissolve association inside players cache instantly
    Object.values(this.state.players).forEach(p => {
      if (p.guildId === id) {
        p.guildId = null;
        p.guildName = null;
      }
    });

    this.executePostgresQuery(
      "DELETE FROM guilds WHERE id = $1",
      [id]
    );
    this.executePostgresQuery(
      "UPDATE players SET guild_id = NULL, guild_name = NULL WHERE guild_id = $1",
      [id]
    );
  }

  // Shop APIs (Populated dynamically)
  public getShopItems(): ShopItem[] {
    return this.state.shopItems;
  }

  // Friend System Core Integration
  public listFriendRelations(): FriendRelation[] {
    return this.state.friendRelations;
  }

  public addFriendRelation(rel: FriendRelation) {
    this.state.friendRelations.push(rel);

    this.executePostgresQuery(`
      INSERT INTO friend_relations (id, user_one_id, user_two_id, status, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
    `, [
      rel.id, rel.userOneId, rel.userTwoId, rel.status, rel.updatedAt
    ]);
  }

  public updateFriendRelation(user1: string, user2: string, status: "pending_one_to_two" | "pending_two_to_one" | "friends") {
    const rel = this.state.friendRelations.find(r => 
      (r.userOneId === user1 && r.userTwoId === user2) || 
      (r.userOneId === user2 && r.userTwoId === user1)
    );
    if (rel) {
      rel.status = status;
      rel.updatedAt = new Date().toISOString();

      this.executePostgresQuery(`
        UPDATE friend_relations
        SET status = $3, updated_at = NOW()
        WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
      `, [user1, user2, status]);
    }
  }

  public deleteFriendRelation(user1: string, user2: string) {
    this.state.friendRelations = this.state.friendRelations.filter(r => 
      !((r.userOneId === user1 && r.userTwoId === user2) || 
        (r.userOneId === user2 && r.userTwoId === user1))
    );

    this.executePostgresQuery(`
      DELETE FROM friend_relations
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
    `, [user1, user2]);
  }

  // Administrative Reports System Actions
  public getReports(): GameReport[] {
    return this.state.gameReports;
  }

  public addReport(rep: GameReport) {
    this.state.gameReports.push(rep);

    this.executePostgresQuery(`
      INSERT INTO game_reports (id, reporter_id, reported_id, reason, description, screenshot, timestamp, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      rep.id, rep.reporterId, rep.reportedId, rep.reason, rep.description, rep.screenshot || null, rep.timestamp, rep.status
    ]);
  }

  public resolveReport(id: string) {
    const rep = this.state.gameReports.find(r => r.id === id);
    if (rep) {
      rep.status = "resolved";

      this.executePostgresQuery(
        "UPDATE game_reports SET status = 'resolved' WHERE id = $1",
        [id]
      );
    }
  }

  // Global Multi-Player Public Chats Logs
  public getChatMessages(): ChatMessage[] {
    return this.state.chatMessages;
  }

  public addChatMessage(msg: ChatMessage) {
    msg.message = this.cleanText(msg.message);
    this.state.chatMessages.push(msg);
    if (this.state.chatMessages.length > 200) {
      this.state.chatMessages.shift();
    }

    this.executePostgresQuery(`
      INSERT INTO chat_messages (id, sender_id, sender_name, sender_avatar, sender_title, sender_color, message, timestamp, is_system, guild_id, room_id, room_status, room_type, room_mode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      msg.id, msg.senderId || null, msg.senderName, msg.senderAvatar, msg.senderTitle || null, msg.senderColor || null, msg.message, msg.timestamp, msg.isSystem || false,
      msg.guildId || null, msg.roomId || null, msg.roomStatus || null, msg.roomType || null, msg.roomMode || null
    ]);
  }

  public async updateRoomChatMessage(roomId: string, newStatus: string) {
    this.state.chatMessages.forEach(msg => {
      if (msg.roomId === roomId) {
        msg.roomStatus = newStatus;
      }
    });

    if (this.pool && this.dbConnected) {
      try {
        await this.pool.query(
          "UPDATE chat_messages SET room_status = $1 WHERE room_id = $2",
          [newStatus, roomId]
        );
      } catch (err) {
        console.error("❌ خطأ أثناء تحديث حالة الغرفة في الدردشة:", err);
      }
    }
  }

  // Private Messages System Actions
  public async getPrivateMessages(userA: string, userB: string): Promise<PrivateMessage[]> {
    if (this.pool && this.dbConnected) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM private_messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY timestamp ASC",
          [userA, userB]
        );
        return res.rows.map(rowToPrivateMessage).filter(Boolean) as PrivateMessage[];
      } catch (err) {
        console.error("❌ خطأ أثناء جلب الرسائل الخاصة:", err);
      }
    }
    return [];
  }

  public async getPrivateChatsList(playerId: string): Promise<{ partnerId: string; lastMessage: string; timestamp: string; unreadCount: number }[]> {
    if (this.pool && this.dbConnected) {
      try {
        const res = await this.pool.query(`
          SELECT 
            CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
            message,
            timestamp,
            is_read,
            sender_id
          FROM private_messages
          WHERE sender_id = $1 OR receiver_id = $1
          ORDER BY timestamp DESC
        `, [playerId]);

        const partnersMap = new Map<string, { lastMessage: string; timestamp: string; unreadCount: number }>();
        
        for (const row of res.rows) {
          const partnerId = row.partner_id;
          const isUnread = !row.is_read && row.sender_id !== playerId;
          
          if (!partnersMap.has(partnerId)) {
            partnersMap.set(partnerId, {
              lastMessage: row.message,
              timestamp: new Date(row.timestamp).toISOString(),
              unreadCount: isUnread ? 1 : 0
            });
          } else if (isUnread) {
            const existing = partnersMap.get(partnerId)!;
            existing.unreadCount += 1;
          }
        }

        return Array.from(partnersMap.entries()).map(([partnerId, data]) => ({
          partnerId,
          ...data
        }));
      } catch (err) {
        console.error("❌ خطأ أثناء جلب قائمة المحادثات الخاصة:", err);
      }
    }
    return [];
  }

  public async addPrivateMessage(msg: PrivateMessage): Promise<void> {
    if (this.pool && this.dbConnected) {
      try {
        await this.pool.query(`
          INSERT INTO private_messages (id, sender_id, receiver_id, message, timestamp, is_read)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          msg.id, msg.senderId, msg.receiverId, this.cleanText(msg.message), msg.timestamp, msg.isRead
        ]);
      } catch (err) {
        console.error("❌ خطأ أثناء حفظ رسالة خاصة:", err);
      }
    }
  }

  public async markPrivateMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    if (this.pool && this.dbConnected) {
      try {
        await this.pool.query(
          "UPDATE private_messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE",
          [senderId, receiverId]
        );
      } catch (err) {
        console.error("❌ خطأ أثناء تعليم الرسائل كمقروءة:", err);
      }
    }
  }

  // Notifications System Actions
  public async getNotifications(playerId: string): Promise<Notification[]> {
    if (this.pool && this.dbConnected) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM notifications WHERE player_id = $1 ORDER BY timestamp DESC LIMIT 50",
          [playerId]
        );
        return res.rows.map(rowToNotification).filter(Boolean) as Notification[];
      } catch (err) {
        console.error("❌ خطأ أثناء جلب الإشعارات:", err);
      }
    }
    return [];
  }

  public async addNotification(notif: Notification): Promise<void> {
    if (this.pool && this.dbConnected) {
      try {
        await this.pool.query(`
          INSERT INTO notifications (id, player_id, type, title, content, is_read, timestamp, reference_id, extra_data)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          notif.id, notif.playerId, notif.type, notif.title, notif.content, notif.isRead, notif.timestamp, notif.referenceId || null, notif.extraData || null
        ]);
      } catch (err) {
        console.error("❌ خطأ أثناء حفظ إشعار جديد:", err);
      }
    }
  }

  public async markNotificationAsRead(notificationId: string): Promise<void> {
    if (this.pool && this.dbConnected) {
      try {
        await this.pool.query(
          "UPDATE notifications SET is_read = TRUE WHERE id = $1",
          [notificationId]
        );
      } catch (err) {
        console.error("❌ خطأ أثناء تعديل حالة قراءة الإشعار:", err);
      }
    }
  }

  public async markAllNotificationsAsRead(playerId: string): Promise<void> {
    if (this.pool && this.dbConnected) {
      try {
        await this.pool.query(
          "UPDATE notifications SET is_read = TRUE WHERE player_id = $1 AND is_read = FALSE",
          [playerId]
        );
      } catch (err) {
        console.error("❌ خطأ أثناء تعليم كل الإشعارات كمقروءة:", err);
      }
    }
  }

  public deleteChatMessage(id: string) {
    this.state.chatMessages = this.state.chatMessages.filter(m => m.id !== id);
    
    this.executePostgresQuery(
      "DELETE FROM chat_messages WHERE id = $1",
      [id]
    );
  }

  // Synchronize state changes (Tournaments management)
  public saveState() {
    if (!this.dbConnected) return;

    // Direct background synchronization of active tournament modifications
    this.state.tournaments.forEach(t => {
      this.executePostgresQuery(`
        INSERT INTO tournaments (id, title, end_date, participants_count, prizes_first, prizes_second, prizes_third)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          end_date = EXCLUDED.end_date,
          participants_count = EXCLUDED.participants_count,
          prizes_first = EXCLUDED.prizes_first,
          prizes_second = EXCLUDED.prizes_second,
          prizes_third = EXCLUDED.prizes_third
      `, [
        t.id, t.title, t.endDate, t.participantsCount, t.prizes.first, t.prizes.second, t.prizes.third
      ]);
    });
  }
}

export const dbStore = new DatabaseStore();
