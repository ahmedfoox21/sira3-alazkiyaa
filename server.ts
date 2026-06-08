/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

import { dbStore } from "./src/server/databaseStore";
import { preloadedQuestions } from "./src/server/questionsData";
import { Player, GameMode, RoomStatus, Room, MatchState, Question, ChatMessage, GameReport, Guild, Tournament, PrivateMessage, Notification } from "./src/types";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// JSON parsers
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "ClashMindsSuperSecret88";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "ahmedfox@gmail.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "0115855847";

// Memory database for user passwords to maintain backwards compatibility
const userPasswordHashes: Record<string, string> = {
  [ADMIN_EMAIL]: bcrypt.hashSync(ADMIN_PASSWORD, 10)
};

// -----------------------------------------------------------------
// GEMINI API Lazy Initialization
// -----------------------------------------------------------------
let geminiAI: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiAI) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        geminiAI = new GoogleGenAI({ apiKey: key });
        console.log("🤖 تم تهيئة محرك الذكاء الاصطناعي Gemini بنجاح لأسئلة المسابقات.");
      } catch (e) {
        console.error("❌ فشل تهيئة Gemini API:", e);
      }
    }
  }
  return geminiAI;
}

// -----------------------------------------------------------------
// REST API ROUTES
// -----------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// Authentication - Register
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة لتسجيل اللاعب" });
    }

    if (dbStore.isBannedEmail(email)) {
      return res.status(403).json({ error: "هذا الحساب محظور من اللعب بقرار إداري." });
    }

    if (dbStore.getPlayerByEmail(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني مسجل بالفعل لمستخدم آخر" });
    }

    const playerId = "ply_" + Math.random().toString(36).substring(2, 11);
    const hashedPassword = bcrypt.hashSync(password, 10);
    userPasswordHashes[email.toLowerCase()] = hashedPassword;

    const newPlayer: Player = {
      id: playerId,
      username: dbStore.cleanText(username),
      email: email.toLowerCase(),
      avatar: avatar || "🧙",
      level: 1,
      xp: 0,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      guildId: null,
      guildName: null,
      coins: 500, // starting wealth
      gems: 30,  // starting gems
      title: "مستجد ذكي",
      nameColor: "text-slate-200",
      borderId: null,
      role: "player",
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString()
    };

    dbStore.savePlayer(newPlayer);

    const token = jwt.sign({ id: newPlayer.id, email: newPlayer.email }, JWT_SECRET, { expiresIn: "24h" });

    res.status(201).json({
      token,
      player: newPlayer
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "حدث خطأ غير متوقع أثناء التسجيل" });
  }
});

// Authentication - Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
    }

    if (dbStore.isBannedEmail(email)) {
      return res.status(403).json({ error: "هذا البريد محظور في نظام صراع الأذكياء." });
    }

    // Try synchronizing the player directly with Neon database to handle any direct/manual changes or temp passwords
    await dbStore.syncPlayerFromDB(email);

    const player = dbStore.getPlayerByEmail(email);
    if (!player) {
      return res.status(400).json({ error: "بيانات الاعتماد غير صحيحة، لم يتم العثور على اللاعب" });
    }

    const matchedHash = player.passwordHash || userPasswordHashes[email.toLowerCase()];
    if (!matchedHash || !bcrypt.compareSync(password, matchedHash)) {
      return res.status(400).json({ error: "كلمة المرور غير صحيحة، حاول مجدداً" });
    }

    if (player.isBanned) {
      return res.status(403).json({ error: "هذا اللاعب محظور بقرار إداري." });
    }

    const token = jwt.sign({ id: player.id, email: player.email }, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      token,
      player
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "المعذرة، حدث خطأ في الخادم أثناء المصادقة" });
  }
});

// Get self profile via JWT payload
app.get("/api/auth/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "غير مصرح، الرجاء تزويد معرّف الجلسة" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    const player = dbStore.getPlayer(decoded.id);
    if (!player) {
      return res.status(404).json({ error: "لم يتم العثور على اللاعب صاحب الجلسة" });
    }

    if (player.isBanned) {
      return res.status(403).json({ error: "حسابك موقوف بقرار إداري." });
    }

    res.json({ player });
  } catch (e) {
    res.status(401).json({ error: "جلسة منتهية أو غير صالحة" });
  }
});

// Get all players (excluding bots, sorted by wins)
app.get("/api/players", (req, res) => {
  try {
    const players = dbStore.listPlayers()
      .filter(p => !p.email.includes("dummy") && !p.email.includes("bot") && p.username !== "المشرف العام" && p.id !== "admin_user" && p.role !== "admin" && p.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase())
      .sort((a, b) => b.wins - a.wins);
    res.json({ players });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get all guilds (excl admin guild)
app.get("/api/guilds", (req, res) => {
  try {
    const guilds = dbStore.listGuilds().filter(g => g.id !== "guild_1" && g.creatorId !== "admin_user" && dbStore.getPlayer(g.creatorId)?.role !== "admin" && dbStore.getPlayer(g.creatorId)?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase());
    res.json({ guilds });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Helper to get player from request header token safely
const getPlayerFromHeaders = (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    return dbStore.getPlayer(decoded.id);
  } catch {
    return null;
  }
};

// Update player cosmetics or details
app.post("/api/players/update", (req, res) => {
  try {
    const player = getPlayerFromHeaders(req);
    if (!player) return res.status(401).json({ error: "جلسة غير صالحة أو غير مصرح" });

    const { 
      username, avatar, borderId, bgId, nameColor, title, effectId, entranceId,
      missionsClaimed, missionsProgress, lastMissionsResetTime, ownedItems,
      coins, gems
    } = req.body;

    if (username !== undefined) {
      const cleanName = dbStore.cleanText(username.trim());
      if (cleanName.length < 3) return res.status(400).json({ error: "الاسم قصير جداً (يرجى إدخال 3 أحرف على الأقل)" });
      player.username = cleanName;
    }
    if (avatar !== undefined) player.avatar = avatar;
    if (borderId !== undefined) player.borderId = borderId;
    if (bgId !== undefined) player.bgId = bgId;
    if (nameColor !== undefined) player.nameColor = nameColor;
    if (title !== undefined) player.title = title;
    if (effectId !== undefined) player.effectId = effectId;
    if (entranceId !== undefined) player.entranceId = entranceId;
    if (missionsClaimed !== undefined) player.missionsClaimed = missionsClaimed;
    if (missionsProgress !== undefined) player.missionsProgress = missionsProgress;
    if (lastMissionsResetTime !== undefined) player.lastMissionsResetTime = lastMissionsResetTime;
    if (ownedItems !== undefined) player.ownedItems = ownedItems;
    if (coins !== undefined) player.coins = coins;
    if (gems !== undefined) player.gems = gems;

    dbStore.savePlayer(player);
    res.json({ player });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Send Friend Request
app.post("/api/friends/send", async (req, res) => {
  try {
    const player = getPlayerFromHeaders(req);
    if (!player) return res.status(401).json({ error: "جلسة منتهية أو غير مصرح" });

    const { targetId } = req.body;
    if (!targetId || targetId === player.id) {
      return res.status(400).json({ error: "معرف لاعب غير صالح" });
    }

    const target = dbStore.getPlayer(targetId);
    if (!target) return res.status(404).json({ error: "اللاعب غير موجود" });

    player.friends = player.friends || [];
    target.friendRequests = target.friendRequests || [];
    target.friends = target.friends || [];

    if (player.friends.includes(targetId)) {
      return res.status(400).json({ error: "هذا اللاعب صديقك بالفعل" });
    }
    if (target.friendRequests.includes(player.id)) {
      return res.status(400).json({ error: "لقد أرسلت طلباً بالفعل لهذا اللاعب" });
    }

    target.friendRequests.push(player.id);
    dbStore.savePlayer(target);

    // Save notification row in DB
    const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
    const newNotif: Notification = {
      id: notifId,
      playerId: targetId,
      type: "friend_request",
      title: `📬 طلب صداقة جديد`,
      content: `يريد اللاعب ${player.username} أن يكون صديقاً لك في تحديات صراع الأذكياء.`,
      isRead: false,
      timestamp: new Date().toISOString(),
      referenceId: player.id
    };
    await dbStore.addNotification(newNotif);
    io.to(`player_chan_${targetId}`).emit("new_notification", newNotif);

    // Dynamic alert over socket if target connected
    io.to(`player_chan_${targetId}`).emit("system_warning", `تلقيت طلب صداقة جديد من [${player.username}]`);

    res.json({ success: true, message: "تم إرسال طلب الصداقة بنجاح" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Accept Friend Request
app.post("/api/friends/accept", async (req, res) => {
  try {
    const player = getPlayerFromHeaders(req);
    if (!player) return res.status(401).json({ error: "جلسة منتهية أو غير مصرح" });

    const { requesterId } = req.body;
    if (!requesterId) return res.status(400).json({ error: "معرف طلب غير صالح" });

    const requester = dbStore.getPlayer(requesterId);
    if (!requester) return res.status(404).json({ error: "المرسل لم يعد موجوداً" });

    player.friends = player.friends || [];
    player.friendRequests = player.friendRequests || [];
    requester.friends = requester.friends || [];

    if (!player.friendRequests.includes(requesterId)) {
      return res.status(400).json({ error: "لا يوجد طلب صداقة معلق من هذا اللاعب" });
    }

    // Accept
    player.friendRequests = player.friendRequests.filter(id => id !== requesterId);
    if (!player.friends.includes(requesterId)) {
      player.friends.push(requesterId);
    }
    if (!requester.friends.includes(player.id)) {
      requester.friends.push(player.id);
    }

    dbStore.savePlayer(player);
    dbStore.savePlayer(requester);

    // Save notification to requester
    const acceptNotifId = "notif_" + Math.random().toString(36).substring(2, 11);
    const acceptNotif: Notification = {
      id: acceptNotifId,
      playerId: requesterId,
      type: "friend_request",
      title: `🤝 تم قبول طلب الصداقة`,
      content: `قام اللاعب ${player.username} بقبول طلب الصداقة الخاص بك! يمكنك الآن مراسلته واللعب معه.`,
      isRead: false,
      timestamp: new Date().toISOString(),
      referenceId: player.id
    };
    await dbStore.addNotification(acceptNotif);
    io.to(`player_chan_${requesterId}`).emit("new_notification", acceptNotif);

    io.to(`player_chan_${requesterId}`).emit("system_warning", `قبل [${player.username}] طلب الصداقة الخاص بك!`);

    res.json({ success: true, player });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Decline Friend Request
app.post("/api/friends/decline", (req, res) => {
  try {
    const player = getPlayerFromHeaders(req);
    if (!player) return res.status(401).json({ error: "جلسة منتهية أو غير مصرح" });

    const { requesterId } = req.body;
    if (!requesterId) return res.status(400).json({ error: "معرف طلب غير صالح" });

    player.friendRequests = player.friendRequests || [];
    player.friendRequests = player.friendRequests.filter(id => id !== requesterId);

    dbStore.savePlayer(player);
    res.json({ success: true, player });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Remove Friend
app.post("/api/friends/remove", (req, res) => {
  try {
    const player = getPlayerFromHeaders(req);
    if (!player) return res.status(401).json({ error: "جلسة منتهية أو غير مصرح" });

    const { targetId } = req.body;
    if (!targetId) return res.status(400).json({ error: "معرف صديق غير صالح" });

    const target = dbStore.getPlayer(targetId);
    
    player.friends = player.friends || [];
    player.friends = player.friends.filter(id => id !== targetId);
    dbStore.savePlayer(player);

    if (target) {
      target.friends = target.friends || [];
      target.friends = target.friends.filter(id => id !== player.id);
      dbStore.savePlayer(target);
    }

    res.json({ success: true, player });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Create Guild
app.post("/api/guilds/create", (req, res) => {
  try {
    const player = getPlayerFromHeaders(req);
    if (!player) return res.status(401).json({ error: "جلسة منتهية أو غير مصرح" });

    const { name, description, avatarEmblem, badgeSymbol } = req.body;
    if (!name || !description) return res.status(400).json({ error: "يرجى ملء جميع الحقول المطلوبة لتأسيس النقابة" });

    if (player.coins < 300) return res.status(400).json({ error: "عذراً! ليس لديك ذهب كافٍ لتأسيس نقابة (التكلفة: 300 ذهبة)" });

    const guildId = "guild_" + Math.random().toString(36).substring(2, 11);
    const newGuild: Guild = {
      id: guildId,
      name: name.trim(),
      avatar: avatarEmblem || "🛡️",
      badge: badgeSymbol || "⚔️",
      description: description.trim(),
      creatorId: player.id,
      membersCount: 1,
      totalPoints: 100,
      createdAt: new Date().toISOString()
    };

    // Charge creator
    player.coins -= 300;
    player.guildId = guildId;
    player.guildName = newGuild.name;

    dbStore.savePlayer(player);
    
    // Save to database
    dbStore.createGuild(newGuild);

    const publicGuilds = dbStore.listGuilds().filter(g => g.id !== "guild_1" && g.creatorId !== "admin_user" && dbStore.getPlayer(g.creatorId)?.role !== "admin" && dbStore.getPlayer(g.creatorId)?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase());
    res.json({ player, guilds: publicGuilds });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Join Guild
app.post("/api/guilds/join", (req, res) => {
  try {
    const player = getPlayerFromHeaders(req);
    if (!player) return res.status(401).json({ error: "جلسة منتهية أو غير مصرح" });

    const { guildId } = req.body;
    const guild = dbStore.state.guilds[guildId];
    if (!guild) return res.status(404).json({ error: "النقابة المطلوبة غير موجودة!" });

    if (player.guildId) return res.status(400).json({ error: "أنت تنتمي لنقابة بالفعل. غادرها أولاً لتنضم لغيرها!" });

    player.guildId = guildId;
    player.guildName = guild.name;
    guild.membersCount += 1;

    dbStore.savePlayer(player);
    dbStore.createGuild(guild);

    const publicGuilds = dbStore.listGuilds().filter(g => g.id !== "guild_1" && g.creatorId !== "admin_user" && dbStore.getPlayer(g.creatorId)?.role !== "admin" && dbStore.getPlayer(g.creatorId)?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase());
    res.json({ player, guilds: publicGuilds });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Leave Guild
app.post("/api/guilds/leave", (req, res) => {
  try {
    const player = getPlayerFromHeaders(req);
    if (!player) return res.status(401).json({ error: "جلسة منتهية أو غير مصرح" });

    const myGuildId = player.guildId;
    if (!myGuildId) return res.status(400).json({ error: "أنت لست ملتحقاً بأي نقابة للاستقالة منها!" });

    // Update player state first
    player.guildId = null;
    player.guildName = null;
    dbStore.savePlayer(player);

    const guild = dbStore.getGuild(myGuildId);
    if (guild) {
      // Find remaining members in database
      const remainingPlayers = dbStore.listPlayers().filter(p => p.guildId === myGuildId);
      
      if (remainingPlayers.length === 0) {
        // Last member left, delete from database completely
        dbStore.deleteGuild(myGuildId);
      } else {
        // Update membersCount
        guild.membersCount = remainingPlayers.length;
        // Optionally update points
        guild.totalPoints = Math.max(100, remainingPlayers.reduce((sum, p) => sum + (p.wins * 100), 100));
        dbStore.createGuild(guild);
      }
    }

    // Get updated public listing (already excluding admin guild)
    const publicGuilds = dbStore.listGuilds().filter(g => g.id !== "guild_1" && g.creatorId !== "admin_user" && dbStore.getPlayer(g.creatorId)?.role !== "admin" && dbStore.getPlayer(g.creatorId)?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase());
    res.json({ player, guilds: publicGuilds });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Simulating Weekly Tournament resolution instantly (Emergency/Simulation trigger)
app.post("/api/tournament/simulate", (req, res) => {
  try {
    const players = dbStore.listPlayers()
      .filter(p => !p.email.includes("dummy") && !p.email.includes("bot") && p.role !== "admin" && p.id !== "admin_user" && p.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase())
      .sort((a, b) => b.wins - a.wins);

    if (players.length === 0) {
      return res.status(400).json({ error: "لا يوجد لاعبون كافيون لإجراء البطولة حالياً!" });
    }

    // Capture winners (top 3)
    const firstPlace = players[0];
    const secondPlace = players[1] || null;
    const thirdPlace = players[2] || null;

    let announce = `🚨 انتهت بطولة كأس الأذكياء الأسبوعية الكبرى رسمياً وتم تتويج العباقرة المتصدرين بالصدارة المطلقة: 🚨\n\n`;

    if (firstPlace) {
      firstPlace.coins += 5000;
      firstPlace.gems += 250;
      firstPlace.title = "بطل الكأس الأسبوعي 🏆";
      firstPlace.borderId = "border_gold";
      dbStore.savePlayer(firstPlace);
      announce += `🥇 المركز الأول: [${firstPlace.username}] وحصل على 5000 ذهبة + 250 جوهرة + لقب الكأس الأسطوري وحظي بإطار التاج الذهبي الدائم!\n`;
    }

    if (secondPlace) {
      secondPlace.coins += 2500;
      secondPlace.gems += 100;
      secondPlace.borderId = "border_neon_purple";
      dbStore.savePlayer(secondPlace);
      announce += `🥈 المركز الثاني: [${secondPlace.username}] وحصل على 2500 ذهبة + 100 جوهرة وإطار الهالة البنفسجية!\n`;
    }

    if (thirdPlace) {
      thirdPlace.coins += 1000;
      thirdPlace.gems += 50;
      thirdPlace.borderId = "border_cyan";
      dbStore.savePlayer(thirdPlace);
      announce += `🥉 المركز الثالث: [${thirdPlace.username}] وحصل على 1000 ذهبة + 50 جوهرة وإطار السايان المكهرب!\n`;
    }

    // Reset tournament end date to 7 days from now as a new week
    const newEnd = new Date();
    newEnd.setDate(newEnd.getDate() + 7);
    if (dbStore.state.tournaments[0]) {
      dbStore.state.tournaments[0].endDate = newEnd.toISOString();
      dbStore.state.tournaments[0].participantsCount = 0;
    }
    dbStore.saveState();

    res.json({ announcement: announce, player: firstPlace });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Admin Statistics route
app.get("/api/admin/metrics", (req, res) => {
  const players = dbStore.listPlayers();
  const rooms = Object.values(activeRooms);
  const reports = dbStore.getReports();

  res.json({
    totalPlayers: players.length,
    activeRooms: rooms.length,
    totalCoinsInEconomy: players.reduce((acc, p) => acc + p.coins, 0),
    totalGemsInEconomy: players.reduce((acc, p) => acc + p.gems, 0),
    pendingReports: reports.filter(r => r.status === "pending").length
  });
});

// Gemini-AI Route to generate custom questions
app.post("/api/ai/generate-question", async (req, res) => {
  try {
    const { category, mode } = req.body; // e.g. "إسلاميات", emoji / trivia
    const aiEngine = getGemini();

    if (!aiEngine) {
      // Fallback: Pick random from preloaded matching category
      const filtered = preloadedQuestions.filter(q => q.category.includes(category) || q.mode === mode);
      const chosen = filtered[Math.floor(Math.random() * filtered.length)] || preloadedQuestions[0];
      return res.json({
        success: true,
        fallback: true,
        question: {
          ...chosen,
          id: "gen_ai_fallback_" + Math.random().toString(36).substring(2, 7),
          questionText: chosen.questionText + " (موالدة تلقائياً)"
        }
      });
    }

    const promptText = mode === GameMode.Emoji
      ? `قم بإنشاء سؤال إيموجي (Emoji Guess) باللغة العربية في مجال: '${category || "عام"}'.
         يجب أن يحتوي السؤال على 2-4 رموز تعبيرية (Emojis) تعبر عن شخصية، فيلم، حكمة، أو بلد عربي.
         أضف 4 خيارات باللغة العربية ممتازة، وإجابة واحدة صحيحة، مع تلميح (Hint) صغير ذكي باللغة العربية.
         تنسيق الرد مطلوب في صيغة JSON صالحة كالتالي:
         {"questionText": "...", "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], "correctAnswer": "الخيار المطابق تماماً للحل من ضمن الـ 4 خيارات", "hint": "..."}`
      : `قم بإنشاء سؤال مسابقات (Trivia Quiz) باللغة العربية في مجال: '${category || "ثقافة عامة"}'.
         السؤال يجب أن يكون مشوقاً ومفيداً وذا إجابة حاسمة.
         أضف 4 خيارات ممتازة باللغة العربية وإجابة واحدة صحيحة تماماً.
         تنسيق الرد مطلوب في صيغة JSON صالحة كالتالي:
         {"questionText": "...", "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], "correctAnswer": "الخيار الصحيح المطابق تماماً من الـ 4 خيارات"}`;

    const response = await aiEngine.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText
    });

    const parsedText = response.text || "";
    // Extract JSON block if surrounded by markdown codeblock tags ```json ... ```
    const matchJson = parsedText.match(/\{[\s\S]*\}/);
    if (matchJson) {
      const parsedQuestion = JSON.parse(matchJson[0]);
      const formatted: Question = {
        id: "ai_q_" + Math.random().toString(36).substring(2, 11),
        category: category || "ثقافة ذكية جينيه",
        mode: mode || GameMode.Trivia,
        questionText: parsedQuestion.questionText,
        options: parsedQuestion.options,
        correctAnswer: parsedQuestion.correctAnswer,
        hint: parsedQuestion.hint
      };
      return res.json({ success: true, fallback: false, question: formatted });
    }

    throw new Error("فشل فك تحليل كود JSON المولد من الذكاء الاصطناعي");
  } catch (error: any) {
    console.error("⚠️ فشل توليد السؤال باستخدام Gemini:", error);
    // Silent recovery
    const randomPre = preloadedQuestions[Math.floor(Math.random() * preloadedQuestions.length)];
    res.json({
      success: true,
      fallback: true,
      question: {
        ...randomPre,
        id: "ai_err_" + Math.random().toString(36).substring(2, 8)
      }
    });
  }
});


// -----------------------------------------------------------------
// SOCKETS & MULTIPLAYER GAMESTATE engine
// -----------------------------------------------------------------
const activeRooms: Record<string, Room> = {};
const activeMatchStates: Record<string, MatchState> = {};
const connectedSocketPlayers: Record<string, string> = {}; // socket.id -> playerId
const onlinePlayerCounters = new Set<string>();

// Dynamic parsing of mentions (@Name, @الكل) and sending corresponding notifications
async function handleMentionsAndNotification(sender: Player, message: ChatMessage, isGuild: boolean) {
  try {
    const players = dbStore.listPlayers();
    for (const target of players) {
      if (target.id !== sender.id && message.message.includes("@" + target.username)) {
        const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
        const newNotif: Notification = {
          id: notifId,
          playerId: target.id,
          type: "mention",
          title: `🔔 تمت الإشارة إليك`,
          content: `قام ${sender.username} بالإشارة إليك في ${isGuild ? "دردشة النقابة" : "الدردشة العامة"}`,
          isRead: false,
          timestamp: new Date().toISOString(),
          referenceId: message.id,
          extraData: JSON.stringify({ chatType: isGuild ? "guild" : "general", msgId: message.id })
        };
        await dbStore.addNotification(newNotif);
        io.to(`player_chan_${target.id}`).emit("new_notification", newNotif);
      }
    }

    if (isGuild && message.guildId && message.message.includes("@الكل")) {
      const guildMembers = dbStore.listPlayers().filter(p => p.guildId === message.guildId && p.id !== sender.id);
      for (const member of guildMembers) {
        const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
        const newNotif: Notification = {
          id: notifId,
          playerId: member.id,
          type: "mention",
          title: `📢 نداء عاجل بالنقابة`,
          content: `قام ${sender.username} بدعوة الجميع بالإشارة (@الكل) في دردشة النقابة`,
          isRead: false,
          timestamp: new Date().toISOString(),
          referenceId: message.id,
          extraData: JSON.stringify({ chatType: "guild", msgId: message.id })
        };
        await dbStore.addNotification(newNotif);
        io.to(`player_chan_${member.id}`).emit("new_notification", newNotif);
      }
    }
  } catch (err) {
    console.error("❌ خطأ أثناء معالجة الإشارات في الخادم:", err);
  }
}

io.on("connection", (socket) => {
  console.log(`🔌 لاعب متصل بالخادم: ${socket.id}`);

  // Authentication via socket
  socket.on("auth_handshake", async (playerId: string) => {
    if (!playerId) return;
    connectedSocketPlayers[socket.id] = playerId;
    onlinePlayerCounters.add(playerId);
    
    // Broadcast updated online count excluding admin
    const healthyCount = Array.from(onlinePlayerCounters).filter(id => id !== "admin_user").length;
    io.emit("online_count_update", healthyCount);

    // Join general notification channel
    socket.join(`player_chan_${playerId}`);

    // Auto join guild socket room
    const p = dbStore.getPlayer(playerId);
    if (p && p.guildId) {
      socket.join(`guild_room_${p.guildId}`);
      console.log(`🏰 اللاعب ${playerId} انضم لغرفة نقابته: guild_room_${p.guildId}`);
    }

    console.log(`✅ اللاعب ${playerId} اعتمد جلسته ويجري شحن جلب إشعاراته...`);

    try {
      const notifs = await dbStore.getNotifications(playerId);
      socket.emit("notifications_list", notifs);
    } catch (err) {
      console.error("خطأ أثناء جلب إشعارات البدء:", err);
    }
  });

  // Global Chat list trigger - Filter out those with guildId!
  socket.on("get_global_chats", () => {
    const list = dbStore.getChatMessages().filter(m => !m.guildId);
    socket.emit("global_chats_list", list);
  });

  // Sending chat message with filter triggers + Mentions parsing
  socket.on("send_global_chat", async (data: { senderId: string; message: string }) => {
    const player = dbStore.getPlayer(data.senderId);
    if (!player) return;
    if (player.isBanned || player.isMuted) {
      return socket.emit("system_warning", "أنت محروم أو صامت مؤقتاً في الشات العام.");
    }

    const newMessage: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      senderId: player.id,
      senderName: player.username,
      senderAvatar: player.avatar,
      senderTitle: player.title,
      senderColor: player.nameColor,
      message: data.message,
      timestamp: new Date().toISOString()
    };

    dbStore.addChatMessage(newMessage);
    io.emit("new_global_chat", newMessage);

    // Call handles mentions parsing
    await handleMentionsAndNotification(player, newMessage, false);
  });

  // Guild chat list trigger
  socket.on("get_guild_chats", (data: { guildId: string }) => {
    if (!data.guildId) return;
    const list = dbStore.getChatMessages().filter(m => m.guildId === data.guildId);
    socket.emit("guild_chats_list", list);
  });

  // Send message in Guild chat
  socket.on("send_guild_chat", async (data: { senderId: string; guildId: string; message: string }) => {
    const player = dbStore.getPlayer(data.senderId);
    if (!player) return;
    if (player.isBanned || player.isMuted) {
      return socket.emit("system_warning", "أنت محروم أو صامت مؤقتاً بالدردشة.");
    }

    const newMessage: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      senderId: player.id,
      senderName: player.username,
      senderAvatar: player.avatar,
      senderTitle: player.title,
      senderColor: player.nameColor,
      message: data.message,
      timestamp: new Date().toISOString(),
      guildId: data.guildId
    };

    dbStore.addChatMessage(newMessage);
    io.to("guild_room_" + data.guildId).emit("new_guild_chat", newMessage);

    // Parse mentions targeting guild-members
    await handleMentionsAndNotification(player, newMessage, true);
  });

  // Fetch private chats history thread partners
  socket.on("get_private_chats_list", async (data: { playerId: string }) => {
    if (!data.playerId) return;
    const items = await dbStore.getPrivateChatsList(data.playerId);
    
    // Resolve full profile cards for partners
    const list = items.map(it => {
      const p = dbStore.getPlayer(it.partnerId);
      return {
        partnerId: it.partnerId,
        partnerName: p ? p.username : "لاعب غير معروف",
        partnerAvatar: p ? p.avatar : "avatar_initials",
        partnerLevel: p ? p.level : 1,
        partnerRole: p ? p.role : "user",
        lastMessage: it.lastMessage,
        timestamp: it.timestamp,
        unreadCount: it.unreadCount
      };
    });

    socket.emit("private_chats_list", list);
  });

  // Fetch DM messages between current player & partner
  socket.on("get_private_messages", async (data: { playerId: string; partnerId: string }) => {
    if (!data.playerId || !data.partnerId) return;
    const list = await dbStore.getPrivateMessages(data.playerId, data.partnerId);
    socket.emit("private_messages_list", list);
  });

  // Send Direct Private Message (PM)
  socket.on("send_private_message", async (data: { senderId: string; receiverId: string; message: string }) => {
    const sender = dbStore.getPlayer(data.senderId);
    const receiver = dbStore.getPlayer(data.receiverId);
    if (!sender || !receiver) return;

    if (sender.isBanned || sender.isMuted) {
      return socket.emit("system_warning", "أنت محظور من استخدام الرسائل الخاصة.");
    }

    const newPm: PrivateMessage = {
      id: "pm_" + Math.random().toString(36).substring(2, 11),
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    await dbStore.addPrivateMessage(newPm);

    // Emit live to online sockets
    io.to(`player_chan_${data.senderId}`).emit("new_private_message", newPm);
    io.to(`player_chan_${data.receiverId}`).emit("new_private_message", newPm);

    // Save notification to receiver
    const newNotif: Notification = {
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      playerId: data.receiverId,
      type: "private_message",
      title: `💬 رسالة خاصة جديدة`,
      content: `رسالة خاصة جديدة من ${sender.username}`,
      isRead: false,
      timestamp: new Date().toISOString(),
      referenceId: data.senderId
    };
    await dbStore.addNotification(newNotif);
    io.to(`player_chan_${data.receiverId}`).emit("new_notification", newNotif);

    // Emit live list update to both (for real-time updating of unread counts/latest message)
    const triggerUpdate = async (id: string) => {
      const items = await dbStore.getPrivateChatsList(id);
      const list = items.map(it => {
        const p = dbStore.getPlayer(it.partnerId);
        return {
          partnerId: it.partnerId,
          partnerName: p ? p.username : "لاعب غير معروف",
          partnerAvatar: p ? p.avatar : "avatar_initials",
          partnerLevel: p ? p.level : 1,
          partnerRole: p ? p.role : "user",
          lastMessage: it.lastMessage,
          timestamp: it.timestamp,
          unreadCount: it.unreadCount
        };
      });
      io.to(`player_chan_${id}`).emit("private_chats_list", list);
    };

    await triggerUpdate(data.senderId);
    await triggerUpdate(data.receiverId);
  });

  // Mark all PMs sent by partner as read for current player
  socket.on("mark_private_messages_read", async (data: { playerId: string; partnerId: string }) => {
    if (!data.playerId || !data.partnerId) return;
    await dbStore.markPrivateMessagesAsRead(data.partnerId, data.playerId);
    
    // Refresh lists and notify partner
    const items = await dbStore.getPrivateChatsList(data.playerId);
    const list = items.map(it => {
      const p = dbStore.getPlayer(it.partnerId);
      return {
        partnerId: it.partnerId,
        partnerName: p ? p.username : "لاعب غير معروف",
        partnerAvatar: p ? p.avatar : "avatar_initials",
        partnerLevel: p ? p.level : 1,
        partnerRole: p ? p.role : "user",
        lastMessage: it.lastMessage,
        timestamp: it.timestamp,
        unreadCount: it.unreadCount
      };
    });
    socket.emit("private_chats_list", list);
    io.to(`player_chan_${data.partnerId}`).emit("private_messages_marked_read", { readerId: data.playerId });
  });

  // Pull Notification feeds
  socket.on("get_notifications", async (data: { playerId: string }) => {
    if (!data.playerId) return;
    const notifs = await dbStore.getNotifications(data.playerId);
    socket.emit("notifications_list", notifs);
  });

  // Read single notification
  socket.on("mark_notification_read", async (data: { playerId: string; notificationId: string }) => {
    if (!data.playerId || !data.notificationId) return;
    await dbStore.markNotificationAsRead(data.notificationId);
    const notifs = await dbStore.getNotifications(data.playerId);
    socket.emit("notifications_list", notifs);
  });

  // Read all notifications
  socket.on("mark_all_notifications_read", async (data: { playerId: string }) => {
    if (!data.playerId) return;
    await dbStore.markAllNotificationsAsRead(data.playerId);
    const notifs = await dbStore.getNotifications(data.playerId);
    socket.emit("notifications_list", notifs);
  });

  // Admin announcement broadcast socket callback
  socket.on("send_admin_announcement", async (data: { senderId: string; announcement: string }) => {
    const sender = dbStore.getPlayer(data.senderId);
    if (!sender || sender.role !== "admin") return;

    const players = dbStore.listPlayers().filter(p => p.id !== "admin_user");
    for (const p of players) {
      const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
      const newNotif: Notification = {
        id: notifId,
        playerId: p.id,
        type: "admin_announcement",
        title: `📢 إعلان إداري رسمي`,
        content: data.announcement,
        isRead: false,
        timestamp: new Date().toISOString(),
        referenceId: sender.id
      };
      await dbStore.addNotification(newNotif);
      io.to(`player_chan_${p.id}`).emit("new_notification", newNotif);
    }
    console.log(`📢 [إعلان عام] تم بث إعلان إداري بنجاح مـن (${sender.username}) لكافة اللاعبين: ${data.announcement}`);
  });

  // Fetching and listing game rooms
  socket.on("get_active_rooms", () => {
    socket.emit("active_rooms_list", Object.values(activeRooms));
  });

  // Create room handler
  socket.on("create_room", (data: { name: string; type: "1v1" | "2v2"; mode: GameMode; creatorId: string }) => {
    const creator = dbStore.getPlayer(data.creatorId);
    if (!creator) return;

    const roomId = "room_" + Math.random().toString(36).substring(2, 11);
    const newRoom: Room = {
      id: roomId,
      name: dbStore.cleanText(data.name || `تحدي الأذكياء ${creator.username}`),
      type: data.type,
      mode: data.mode,
      status: RoomStatus.Waiting,
      players: [creator.id],
      maxPlayers: data.type === "1v1" ? 2 : 4,
      creatorId: creator.id,
      createdAt: new Date().toISOString()
    };

    activeRooms[roomId] = newRoom;
    socket.join(roomId);
    
    // Notify all players about the room browser additions
    io.emit("active_rooms_list", Object.values(activeRooms));
    socket.emit("room_action_success", newRoom);
    console.log(`🏠 تم إنشاء غرفة جديدة [${newRoom.name}] بواسطة ${creator.username}`);

    // Create persistent system chat message regarding this lobby
    const roomAdvMessage: ChatMessage = {
      id: "rm_adv_" + roomId,
      senderId: creator.id,
      senderName: creator.username,
      senderAvatar: creator.avatar,
      senderTitle: creator.title,
      senderColor: creator.nameColor,
      message: `أنشأ اللاعب تحدياً جديداً! 🎮`,
      timestamp: new Date().toISOString(),
      isSystem: true,
      roomId: roomId,
      roomStatus: "waiting",
      roomType: data.type,
      roomMode: data.mode
    };
    dbStore.addChatMessage(roomAdvMessage);
    // Refresh clients lists
    io.emit("new_global_chat", roomAdvMessage);
  });

  // Join room handler
  socket.on("join_room", (data: { roomId: string; playerId: string }) => {
    const room = activeRooms[data.roomId];
    if (!room) {
      return socket.emit("room_action_error", "عذراً، هذه الغرفة غير موجودة أو انتهت.");
    }

    if (room.status !== RoomStatus.Waiting) {
      return socket.emit("room_action_error", "للأسف، بدأت المباراة بالمسابقة بالفعل.");
    }

    if (room.players.includes(data.playerId)) {
      socket.join(data.roomId);
      return socket.emit("room_action_success", room);
    }

    if (room.players.length >= room.maxPlayers) {
      return socket.emit("room_action_error", "هذه الغرفة كاملة العدد الآن.");
    }

    room.players.push(data.playerId);
    socket.join(data.roomId);

    io.to(data.roomId).emit("room_players_updated", room.players.map(p => dbStore.getPlayer(p)).filter(Boolean));
    io.emit("active_rooms_list", Object.values(activeRooms));
    socket.emit("room_action_success", room);

    // Auto trigger match start when standard slots are fully seated
    if (room.players.length === room.maxPlayers) {
      startTriviaMatch(room);
    }
  });

  // Leave room handler
  socket.on("leave_room", (data: { roomId: string; playerId: string }) => {
    const room = activeRooms[data.roomId];
    if (!room) return;

    room.players = room.players.filter(p => p !== data.playerId);
    socket.leave(data.roomId);

    if (room.players.length === 0) {
      // Auto cleanup empty rooms
      delete activeRooms[data.roomId];
      console.log(`🗑️ غادر جميع اللاعبين فتم مسح الغرفة ${data.roomId} تلقائياً.`);
    } else {
      if (room.creatorId === data.playerId) {
        room.creatorId = room.players[0]; // assign next player as creator
      }
      io.to(room.id).emit("room_players_updated", room.players.map(p => dbStore.getPlayer(p)).filter(Boolean));
    }

    io.emit("active_rooms_list", Object.values(activeRooms));
    socket.emit("left_room_success");

    // If leaving during active match, penalize the leaver and crown the other!
    const activeMatch = Object.values(activeMatchStates).find(m => m.roomId === room.id && m.status === "playing");
    if (activeMatch) {
      forfeitMatch(activeMatch.matchId, data.playerId, "انسحب أحد المتسابقين فخسر فريقه فوراً!");
    }
  });

  // Invitation to room handler
  socket.on("invite_player_to_room", (data: { roomId: string; inviterId: string; inviteeId: string }) => {
    const inviter = dbStore.getPlayer(data.inviterId);
    const room = activeRooms[data.roomId];
    if (!inviter || !room) return;

    // Send visual banner invite to the invitee target channel
    io.to(`player_chan_${data.inviteeId}`).emit("room_invite_received", {
      roomId: room.id,
      roomName: room.name,
      inviterName: inviter.username,
      inviterAvatar: inviter.avatar
    });
  });

// Helper to normalize Arabic string for comparison in guess-the-emoji mode
function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/فرانسا/g, "فرنسا")
    .replace(/\s+/g, " ")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "");
}

  // Question answer submission
  socket.on("submit_answer", (data: { matchId: string; playerId: string; answer: string; timeTaken: number }) => {
    const match = activeMatchStates[data.matchId];
    if (!match || match.status !== "playing") return;

    const currentQuestion = match.questions[match.currentQuestionIndex];
    if (!currentQuestion) return;

    const isCorrect = normalizeArabic(currentQuestion.correctAnswer) === normalizeArabic(data.answer);
    
    // Store only first submission
    if (!match.answersSubmitted[data.playerId]) {
      match.answersSubmitted[data.playerId] = {
        answer: data.answer,
        isCorrect,
        timeTaken: data.timeTaken
      };

      // In 1v1 or 2v2 calculate points instantly
      if (isCorrect) {
        // Base score is 100 points
        let speedBonus = 0;
        
        // Find if anyone else already submitted a correct answer for this question in this round
        const otherCorrectSubmits = Object.entries(match.answersSubmitted).filter(
          ([pId, sub]) => pId !== data.playerId && sub.isCorrect
        );
        const isFirstCorrect = (otherCorrectSubmits.length === 0);

        if (isFirstCorrect) {
          // Speed points if answered before their opponent
          if (data.timeTaken <= 1.0) {
            speedBonus = 100; // correct in first second = +100 points
          } else if (data.timeTaken <= 3.0) {
            speedBonus = 50;  // correct in first 3 seconds = +50 points
          }
        }

        match.scores[data.playerId] = (match.scores[data.playerId] || 0) + 100 + speedBonus;
      } else {
        match.scores[data.playerId] = match.scores[data.playerId] || 0;
      }

      // Check if all active players in room have submitted answers
      const room = activeRooms[match.roomId];
      const participantCount = room ? room.players.length : 0;
      const submissionsCount = Object.keys(match.answersSubmitted).length;

      if (submissionsCount >= participantCount) {
        advanceMatchRound(match.matchId);
      } else {
        // Broadcast that someone submission was recorded
        io.to(match.roomId).emit("player_answered_bump", { playerId: data.playerId });
      }
    }
  });

  // -----------------------------------------------------------------
  // WEBRTC SIGNALING FOR AUDIO CHAT
  // -----------------------------------------------------------------
  socket.on("webrtc_join_voice", (data: { roomId: string; playerId: string }) => {
    socket.join(`voice_${data.roomId}`);
    socket.to(`voice_${data.roomId}`).emit("webrtc_peer_joined", {
      peerSocketId: socket.id,
      playerId: data.playerId
    });
    console.log(`🎙️ انضم اللاعب ${data.playerId} للمحادثة الصوتية للغرفة ${data.roomId}`);
  });

  // Forwarding SDP offers & answers
  socket.on("webrtc_offer", (payload: { targetSocketId: string; offer: any; senderPlayerId: string }) => {
    io.to(payload.targetSocketId).emit("webrtc_offer_received", {
      senderSocketId: socket.id,
      offer: payload.offer,
      senderPlayerId: payload.senderPlayerId
    });
  });

  socket.on("webrtc_answer", (payload: { targetSocketId: string; answer: any }) => {
    io.to(payload.targetSocketId).emit("webrtc_answer_received", {
      senderSocketId: socket.id,
      answer: payload.answer
    });
  });

  socket.on("webrtc_ice_candidate", (payload: { targetSocketId: string; candidate: any }) => {
    io.to(payload.targetSocketId).emit("webrtc_ice_candidate_received", {
      senderSocketId: socket.id,
      candidate: payload.candidate
    });
  });

  socket.on("webrtc_voice_speaking", (data: { roomId: string; playerId: string; isSpeaking: boolean }) => {
    io.to(`voice_${data.roomId}`).emit("webrtc_voice_speaking_update", {
      playerId: data.playerId,
      isSpeaking: data.isSpeaking
    });
  });

  socket.on("disconnect", () => {
    console.log(`🔌 قطع اتصال اللاعب: ${socket.id}`);
    const playerId = connectedSocketPlayers[socket.id];
    if (playerId) {
      onlinePlayerCounters.delete(playerId);
      delete connectedSocketPlayers[socket.id];
      const healthyCount = Array.from(onlinePlayerCounters).filter(id => id !== "admin_user").length;
      io.emit("online_count_update", healthyCount);

      // Handle running matches forfeit if client disconnected
      Object.values(activeMatchStates).forEach(match => {
        if (match.status === "playing") {
          const room = activeRooms[match.roomId];
          if (room && room.players.includes(playerId)) {
            // Forfeit match
            forfeitMatch(match.matchId, playerId, `قطع المتسابق اتصاله بالشبكة، انتصر الطرف الآخر تلقائياً!`);
            
            // Cleanup player from room
            room.players = room.players.filter(p => p !== playerId);
            if (room.players.length === 0) {
              delete activeRooms[room.id];
            } else {
              io.to(room.id).emit("room_players_updated", room.players.map(p => dbStore.getPlayer(p)).filter(Boolean));
            }
            io.emit("active_rooms_list", Object.values(activeRooms));
          }
        }
      });
    }
  });
});

// -----------------------------------------------------------------
// GAME MECHANICS ENGINE
// -----------------------------------------------------------------

// Start match loop
async function startTriviaMatch(room: Room) {
  room.status = RoomStatus.Active;
  io.emit("active_rooms_list", Object.values(activeRooms));

  // Update room lobby status in chat logs
  await dbStore.updateRoomChatMessage(room.id, "playing");
  io.emit("global_chats_list", dbStore.getChatMessages().filter(m => !m.guildId));

  const matchId = "match_" + Math.random().toString(36).substring(2, 11);
  room.currentMatchId = matchId;

  // Compile list of questions: mixing preloaded & falling some random variations based on mode
  const modeQuestions = preloadedQuestions.filter(q => q.mode === room.mode);
  // shuffle array
  const shuffled = [...modeQuestions].sort(() => 0.5 - Math.random());
  const maxQ = room.mode === GameMode.Emoji ? 6 : 10;
  const selectedQuestions = shuffled.slice(0, maxQ);

  const matchState: MatchState = {
    matchId,
    roomId: room.id,
    questions: selectedQuestions,
    currentQuestionIndex: 0,
    scores: {},
    answersSubmitted: {},
    timer: 6, // 6 seconds for each question
    status: "playing"
  };

  // seed starting scores to zero
  room.players.forEach(pId => {
    matchState.scores[pId] = 0;
  });

  activeMatchStates[matchId] = matchState;

  // Notify players in room that match is starting
  io.to(room.id).emit("match_started", {
    matchId,
    questionsCount: selectedQuestions.length,
    players: room.players.map(pId => dbStore.getPlayer(pId)).filter(Boolean)
  });

  // Start round timer clock ticking
  tickMatchTimer(matchId);
}

// Running clock timer
function tickMatchTimer(matchId: string) {
  const match = activeMatchStates[matchId];
  if (!match || match.status !== "playing") return;

  const currentQ = match.questions[match.currentQuestionIndex];
  if (!currentQ) return;

  // Emit actual round question to players in room
  io.to(match.roomId).emit("match_round_question", {
    questionText: currentQ.questionText,
    category: currentQ.category,
    options: currentQ.options, // empty for EmojiGuess but client will utilize clue logic
    hint: currentQ.hint,
    currentQuestionIndex: match.currentQuestionIndex,
    timer: match.timer
  });

  const timerInterval = setInterval(() => {
    const updatedMatch = activeMatchStates[matchId];
    if (!updatedMatch || updatedMatch.status !== "playing") {
      clearInterval(timerInterval);
      return;
    }

    updatedMatch.timer -= 1;
    io.to(updatedMatch.roomId).emit("match_timer_sync", { timer: updatedMatch.timer });

    if (updatedMatch.timer <= 0) {
      clearInterval(timerInterval);
      // Round expired, advance round
      advanceMatchRound(matchId);
    }
  }, 1000);
}

// Proceed match round or declare victory
function advanceMatchRound(matchId: string) {
  const match = activeMatchStates[matchId];
  if (!match || match.status !== "playing") return;

  const currentQ = match.questions[match.currentQuestionIndex];
  
  // Send correct answers to screen
  io.to(match.roomId).emit("round_ended_results", {
    correctAnswer: currentQ ? currentQ.correctAnswer : "",
    playerAnswers: match.answersSubmitted,
    scores: match.scores
  });

  match.status = "round_ended";

  setTimeout(() => {
    const nextMatch = activeMatchStates[matchId];
    if (!nextMatch) return;

    // Reset submissions
    nextMatch.answersSubmitted = {};
    nextMatch.currentQuestionIndex += 1;
    nextMatch.timer = 6;
    nextMatch.status = "playing";

    if (nextMatch.currentQuestionIndex >= nextMatch.questions.length) {
      // Game Over
      endMatchPerfect(matchId);
    } else {
      // Start next question ticking
      tickMatchTimer(matchId);
    }
  }, 3000); // 3 seconds window to see results of round
}

// Match complete victory calculation
function endMatchPerfect(matchId: string) {
  const match = activeMatchStates[matchId];
  if (!match) return;

  match.status = "match_ended";
  const room = activeRooms[match.roomId];
  if (!room) return;

  // Decide Winners & award gold XP
  let winnerId = "";
  let reasonLabel = "مباراة مشوقة! تم فرز النقاط النهائية لكل من الفريقين.";

  if (room.type === "1v1") {
    const p1 = room.players[0];
    const p2 = room.players[1];
    const s1 = match.scores[p1] || 0;
    const s2 = p2 ? (match.scores[p2] || 0) : 0;

    if (s1 > s2) {
      winnerId = p1;
    } else if (s2 > s1) {
      winnerId = p2;
    } // empty means draw
  } else {
    // 2v2 team points calculations (teamA: 1st + 2nd, teamB: 3rd + 4th)
    const tA_p1 = room.players[0];
    const tA_p2 = room.players[1];
    const tB_p1 = room.players[2];
    const tB_p2 = room.players[3];

    const scoreA = (match.scores[tA_p1] || 0) + (tA_p2 ? (match.scores[tA_p2] || 0) : 0);
    const scoreB = (tB_p1 ? (match.scores[tB_p1] || 0) : 0) + (tB_p2 ? (match.scores[tB_p2] || 0) : 0);

    if (scoreA > scoreB) {
      winnerId = "team_a";
    } else if (scoreB > scoreA) {
      winnerId = "team_b";
    }
  }

  // Award rewards & log histories
  room.players.forEach(pId => {
    const player = dbStore.getPlayer(pId);
    if (!player) return;

    player.matchesPlayed += 1;
    let gainedCoins = 50; // base reward
    let gainedXP = 15;

    const isWinner = (room.type === "1v1" && pId === winnerId) ||
                    (room.type === "2v2" && winnerId === "team_a" && (pId === room.players[0] || pId === room.players[1])) ||
                    (room.type === "2v2" && winnerId === "team_b" && (pId === room.players[2] || pId === room.players[3]));

    // Initialize fields if missing
    if (player.winStreak === undefined) player.winStreak = 0;
    if (player.maxWinStreak === undefined) player.maxWinStreak = 0;
    if (!player.matchHistory) player.matchHistory = [];

    // Find opponent name
    let opponentName = "تحدي عشوائي";
    if (room.type === "1v1") {
      const oppId = room.players.find(p => p !== pId);
      if (oppId) {
        const oppPl = dbStore.getPlayer(oppId);
        if (oppPl) opponentName = oppPl.username;
      }
    } else {
      opponentName = "مباراة تحالف 2vs2";
    }

    if (isWinner) {
      player.wins += 1;
      player.winStreak += 1;
      if (player.winStreak > player.maxWinStreak) {
        player.maxWinStreak = player.winStreak;
      }
      gainedCoins = 200; // winner reward
      gainedXP = 50;
      
      player.matchHistory.unshift({
        id: "hist_" + Math.random().toString(36).substring(2, 9),
        opponent: opponentName,
        result: "win",
        date: new Date().toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      });
    } else {
      player.losses += 1;
      player.winStreak = 0; // reset win streak on loss
      
      player.matchHistory.unshift({
        id: "hist_" + Math.random().toString(36).substring(2, 9),
        opponent: opponentName,
        result: "loss",
        date: new Date().toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      });
    }

    // Keep history trimmed to last 10 entries max
    if (player.matchHistory.length > 10) {
      player.matchHistory = player.matchHistory.slice(0, 10);
    }

    // Level progression check with speed/correct points bonus
    const matchScore = match.scores[pId] || 0;
    const scoreXpBonus = Math.floor(matchScore * 0.1); // 10% of match score is added as reward XP (speed points speed up level up!)
    const totalXPToAdd = gainedXP + scoreXpBonus;

    player.coins += gainedCoins;
    player.xp += totalXPToAdd;
    
    // Level formula: Level = floor(sqrt(xp / 100)) + 1
    const targetLevel = Math.floor(Math.sqrt(player.xp / 100)) + 1;
    if (targetLevel > player.level) {
      player.level = targetLevel;
      player.gems += (targetLevel * 2); // gems reward on level up!
    }

    dbStore.savePlayer(player);
  });

  // Notify players
  io.to(room.id).emit("match_complete_stats", {
    winnerId,
    reason: reasonLabel,
    scores: match.scores,
    players: room.players.map(p => dbStore.getPlayer(p)).filter(Boolean)
  });

  // Reset room state
  room.status = RoomStatus.Waiting;
  room.players = []; // clear players so they return to lobby
  delete activeMatchStates[matchId];
  
  // Close the active room automatically, forcing clean lobby return
  delete activeRooms[room.id];
  dbStore.updateRoomChatMessage(room.id, "finished");
  io.emit("global_chats_list", dbStore.getChatMessages().filter(m => !m.guildId));
  io.emit("active_rooms_list", Object.values(activeRooms));
}

// Forfeit match system
function forfeitMatch(matchId: string, quitterId: string, customReason: string) {
  const match = activeMatchStates[matchId];
  if (!match || match.status !== "playing") return;

  match.status = "match_ended";
  const room = activeRooms[match.roomId];
  if (!room) return;

  let winnerId = "";
  // Decide winner - the other party
  room.players.forEach(pId => {
    if (pId !== quitterId) {
      winnerId = pId;
    }
  });

  room.players.forEach(pId => {
    const player = dbStore.getPlayer(pId);
    if (!player) return;

    player.matchesPlayed += 1;
    if (pId !== quitterId) {
      player.wins += 1;
      player.coins += 150;
      player.xp += 30;
      const tLvl = Math.floor(Math.sqrt(player.xp / 100)) + 1;
      if (tLvl > player.level) {
        player.level = tLvl;
        player.gems += 5;
      }
    } else {
      player.losses += 1;
    }
    dbStore.savePlayer(player);
  });

  io.to(room.id).emit("match_complete_stats", {
    winnerId,
    reason: customReason,
    quitterId,
    scores: match.scores,
    players: room.players.map(p => dbStore.getPlayer(p)).filter(Boolean)
  });

  room.status = RoomStatus.Waiting;
  delete activeMatchStates[matchId];
  delete activeRooms[room.id];
  dbStore.updateRoomChatMessage(room.id, "finished");
  io.emit("global_chats_list", dbStore.getChatMessages().filter(m => !m.guildId));
  io.emit("active_rooms_list", Object.values(activeRooms));
}


// -----------------------------------------------------------------
// INTEGRATING STATIC CLIENT HANDLERS (Vite SPA Production rules)
// -----------------------------------------------------------------
const isProduction = process.env.NODE_ENV === "production";

async function bootApp() {
  // تفعيل نسخ أيقونة التطبيق المخصصة إلى المجلد العام للمظاهر وتجهيزها للهاتف
  try {
    const publicDir = path.join(process.cwd(), "public");
    const distDir = path.join(process.cwd(), "dist");
    
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const sourceIcon = path.join(process.cwd(), "src", "assets", "images", "game_app_icon_1780942209376.png");
    if (fs.existsSync(sourceIcon)) {
      // نسخ للمجلد العام
      fs.copyFileSync(sourceIcon, path.join(publicDir, "icon.png"));
      fs.copyFileSync(sourceIcon, path.join(publicDir, "logo.png"));
      fs.copyFileSync(sourceIcon, path.join(publicDir, "apple-touch-icon.png"));
      
      // نسخ لمجلد التوزيع (dist) إن وجد لتأمين الحواف في وضع الإنتاج
      if (fs.existsSync(distDir)) {
        fs.copyFileSync(sourceIcon, path.join(distDir, "icon.png"));
        fs.copyFileSync(sourceIcon, path.join(distDir, "logo.png"));
        fs.copyFileSync(sourceIcon, path.join(distDir, "apple-touch-icon.png"));
        
        const manifestSrc = path.join(publicDir, "manifest.json");
        if (fs.existsSync(manifestSrc)) {
          fs.copyFileSync(manifestSrc, path.join(distDir, "manifest.json"));
        }
      }
      console.log("🎨 تم نسخ وتأمين أيقونات اللعبة المتبقية في مجلد التطبيق العام ومجلد dist بنجاح!");
    } else {
      console.warn("⚠️ لم يتم العثور على أيقونة اللعبة المصدرية في: " + sourceIcon);
    }
  } catch (iconErr) {
    console.error("❌ خطأ أثناء نسخ أيقونة اللعبة:", iconErr);
  }

  // خدمة مجلد public مباشرة لضمان وصول المتصفح للأيقونة وملف المانيفست في جميع الأوقات
  app.use(express.static(path.join(process.cwd(), "public")));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("⚡ تم تشغيل وسيط Vite للتطوير المباشر.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("📦 تم تشغيل الخادم في وضع الإنتاج وخدمة الملفات الثابتة.");
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 صراع الأذكياء يعمل في الخلفية على المنفذ: http://localhost:${PORT}`);
  });
}

bootApp();
