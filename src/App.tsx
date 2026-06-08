/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain, Crown, HelpCircle, Users, Award, Shield, Trash2, LogOut, VolumeX,
  Volume2, Sparkles, Plus, Coins, Gem, ArrowLeft, ShoppingBag, CheckCircle,
  Info, Bell, Send, X, MessageSquare, Mic, MicOff, UserPlus, Flag, RotateCcw, Gamepad2, Check, Copy, UserCheck
} from "lucide-react";

import Splash from "./components/Splash";
import ShopCatalog from "./components/ShopCatalog";
import GuildSystem from "./components/GuildSystem";
import AdminPanel from "./components/AdminPanel";
import { sounds } from "./components/AudioMocks";
import { Player, Room, GameMode, RoomStatus, MatchState, Question, ChatMessage, GameReport, Tournament, ShopItem, Guild, PrivateMessage, Notification } from "./types";

interface UsernameEditFormProps {
  me: Player;
  setMe: React.Dispatch<React.SetStateAction<Player | null>>;
}

function UsernameEditForm({ me, setMe }: UsernameEditFormProps) {
  const [isEdit, setIsEdit] = useState(false);
  const [tempName, setTempName] = useState(me.username);

  useEffect(() => {
    setTempName(me.username);
  }, [me.username]);

  const handleSaveName = async () => {
    if (tempName.trim().length < 3) {
      alert("يرجى إدخال اسم فصيح لا يقل عن 3 أحرف!");
      return;
    }
    try {
      const updated = { ...me, username: tempName.trim() };
      const res = await fetch("/api/players/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("siraa_token")}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const d = await res.json();
        setMe(d.player);
        setIsEdit(false);
        sounds.playSuccess();
      } else {
        const err = await res.json();
        alert(err.error || "اسم مكرر أو ممنوع");
      }
    } catch {
      alert("عذراً، فشلت مزامنة الاسم الجديد");
    }
  };

  return (
    <div className="w-full">
      {isEdit ? (
        <div className="flex items-center space-x-1.5 space-x-reverse justify-center max-w-xs mx-auto mb-1">
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded px-2.5 py-1 text-white text-center focus:outline-none"
            maxLength={15}
          />
          <button
            onClick={handleSaveName}
            className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-1 rounded"
          >
            حفظ
          </button>
          <button
            onClick={() => setIsEdit(false)}
            className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-1 rounded"
          >
            إلغاء
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-1.5 space-x-reverse">
          <h2 className={`text-md font-black ${me.nameColor || "text-slate-100"}`}>
            {me.username}
          </h2>
          <button
            onClick={() => setIsEdit(true)}
            className="text-[9px] text-purple-400 hover:text-purple-300 underline font-semibold"
          >
            [تعديل الاسم]
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem("siraa_token"));
  const [me, setMe] = useState<Player | null>(null);

  const handleEquipCosmetic = async (updatedFields: Partial<Player>) => {
    if (!me) return;
    sounds.playClick();
    try {
      const updated = { ...me, ...updatedFields };
      setMe(updated); // instant optimistic UI update
      
      const res = await fetch("/api/players/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
        },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const d = await res.json();
        setMe(d.player);
        sounds.playSuccess();
      } else {
        alert("فشلت مزامنة المظهر المختار مع الخادم");
      }
    } catch {
      alert("عذراً، حدث خطأ أثناء تفعيل المظهر");
    }
  };

  const handleClaimMission = async (missionId: string) => {
    if (!me) return;
    sounds.playClick();

    if (me.missionsClaimed?.includes(missionId)) {
      alert("هذه المكافأة تم استلامها بالفعل ولن يمكنك استلامها مرة أخرى!");
      return;
    }

    const updated = { ...me };
    let coinsGained = 0;
    let xpGained = 0;
    let gemsGained = 0;
    let successMessage = "";

    const matchesPlayed = me.matchesPlayed || 0;
    const wins = me.wins || 0;
    const isGuildJoined = !!me.guildId;

    if (missionId === "m_play_1") {
      if (matchesPlayed < 1) {
        alert("المهمة غير مكتملة بعد!");
        return;
      }
      coinsGained = 50;
      xpGained = 20;
      successMessage = "تم استلام مكافأة المهمة بنجاح! +50 ذهبة و+20 خبرة.";
    } else if (missionId === "m_win_3") {
      if (wins < 3) {
        alert("المهمة غير مكتملة بعد!");
        return;
      }
      coinsGained = 200;
      xpGained = 50;
      gemsGained = 5;
      successMessage = "أحسنت! استلمت مكافأة النصر: +200 ذهبة، +50 خبرة و+5 جواهر.";
    } else if (missionId === "m_answers_20") {
      if (matchesPlayed * 4 < 20) {
        alert("المهمة غير مكتملة بعد!");
        return;
      }
      coinsGained = 100;
      xpGained = 30;
      successMessage = "تفخر الأبجدية بك! حصلت على: +100 ذهبة و+30 خبرة.";
    } else if (missionId === "m_guild_join") {
      if (!isGuildJoined) {
        alert("المهمة غير مكتملة بعد!");
        return;
      }
      coinsGained = 100;
      gemsGained = 5;
      successMessage = "قوة الاتحاد! استلمت مكافأة العصبية: +100 ذهبة و+5 جواهر.";
    } else {
      return;
    }

    updated.coins += coinsGained;
    updated.xp += xpGained;
    updated.gems += gemsGained;
    if (!updated.missionsClaimed) updated.missionsClaimed = [];
    updated.missionsClaimed.push(missionId);

    const targetLevel = Math.floor(Math.sqrt(updated.xp / 100)) + 1;
    if (targetLevel > updated.level) {
      updated.level = targetLevel;
      successMessage += `\n🎉 مبروك! لقد ارتقيت إلى المستوى ${targetLevel}!`;
    }

    setMe(updated);

    try {
      const res = await fetch("/api/players/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const d = await res.json();
        setMe(d.player);
        sounds.playSuccess();
        alert(successMessage);
      } else {
        alert("فشلت مزامنة الجوائز مع السيرفر، يرجى إعادة المحاولة.");
      }
    } catch {
      alert("عذراً، فشل الاتصال بالخادم لتسجيل الجائزة.");
    }
  };

  const handleClaimAllMissions = async () => {
    if (!me) return;
    sounds.playClick();

    const matchesPlayed = me.matchesPlayed || 0;
    const wins = me.wins || 0;
    const isGuildJoined = !!me.guildId;
    const claimed = me.missionsClaimed || [];

    const missionsList = [
      { id: "m_play_1", threshold: 1, current: matchesPlayed, coins: 50, xp: 20, gems: 0 },
      { id: "m_win_3", threshold: 3, current: wins, coins: 200, xp: 50, gems: 5 },
      { id: "m_answers_20", threshold: 20, current: matchesPlayed * 4, coins: 100, xp: 30, gems: 0 },
      { id: "m_guild_join", threshold: 1, current: isGuildJoined ? 1 : 0, coins: 100, xp: 0, gems: 5 }
    ];

    const eligible = missionsList.filter(m => m.current >= m.threshold && !claimed.includes(m.id));
    if (eligible.length === 0) {
      alert("لا توجد أي مهام مكتملة وجاهزة للاستلام حالياً!");
      return;
    }

    const updated = { ...me };
    if (!updated.missionsClaimed) updated.missionsClaimed = [];

    let coinsGained = 0;
    let xpGained = 0;
    let gemsGained = 0;

    eligible.forEach(m => {
      coinsGained += m.coins;
      xpGained += m.xp;
      gemsGained += m.gems;
      updated.missionsClaimed.push(m.id);
    });

    updated.coins += coinsGained;
    updated.xp += xpGained;
    updated.gems += gemsGained;

    const targetLevel = Math.floor(Math.sqrt(updated.xp / 100)) + 1;
    let levelMessage = "";
    if (targetLevel > updated.level) {
      updated.level = targetLevel;
      levelMessage = `\n🎉 مبروك! لقد ارتقيت إلى المستوى ${targetLevel}!`;
    }

    setMe(updated);

    try {
      const res = await fetch("/api/players/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const d = await res.json();
        setMe(d.player);
        sounds.playSuccess();
        alert(`تم استلام جميع مكافآت المهام الجاهزة بنجاح! 😍\n+${coinsGained} ذهبة\n+${xpGained} خبرة\n+${gemsGained} جوهرة${levelMessage}`);
      } else {
        alert("فشلت مزامنة الجوائز الكلية مع السيرفر، يرجى إعادة المحاولة.");
      }
    } catch {
      alert("عذراً، فشل الاتصال بالخادم لتسجيل الجوائز الكلية.");
    }
  };
  
  // UI screens tabs
  const [activeTab, setActiveTab] = useState<"lobby" | "rooms" | "guilds" | "leaderboard" | "achievements" | "chat" | "shop" | "profile">("lobby");
  const [activeChatTab, setActiveChatTab] = useState<"general" | "guild" | "dm">("general");
  const [guildChatMessages, setGuildChatMessages] = useState<ChatMessage[]>([]);
  const [privateChatsList, setPrivateChatsList] = useState<any[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [activeDmPartnerId, setActiveDmPartnerId] = useState<string | null>(null);
  const [dmInput, setDmInput] = useState<string>("");
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [showNotificationsSystem, setShowNotificationsSystem] = useState<boolean>(false);
  const [showMentionsDropdown, setShowMentionsDropdown] = useState<boolean>(false);
  const [mentionsDropdownFilter, setMentionsDropdownFilter] = useState<string>("");
  const [lastClickedNotificationId, setLastClickedNotificationId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const activeDmPartnerIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeDmPartnerIdRef.current = activeDmPartnerId;
  }, [activeDmPartnerId]);

  // References for bottom scrolling
  const guildChatBottomRef = useRef<HTMLDivElement>(null);
  const dmBottomRef = useRef<HTMLDivElement>(null);

  const [cosmeticTab, setCosmeticTab] = useState<"avatar" | "border" | "title" | "name_color" | "background" | "effect">("avatar");
  const [inviteTabFilter, setInviteTabFilter] = useState<"friends" | "all">("friends");
  const [timeToMissionsReset, setTimeToMissionsReset] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = tomorrow.getTime() - now.getTime();
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      const hStr = hours.toString().padStart(2, "0");
      const mStr = minutes.toString().padStart(2, "0");
      const sStr = seconds.toString().padStart(2, "0");
      
      setTimeToMissionsReset(`${hStr}:${mStr}:${sStr}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Modals state
  const [showShop, setShowShop] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedUserCard, setSelectedUserCard] = useState<Player | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // Authentication form states
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [chosenAvatar, setChosenAvatar] = useState("🧙");

  const FREE_AVATARS = ["🧙", "🕵️", "🧑‍🚀", "🦸‍♂️", "🧟", "🦁", "🐼", "🦊", "🦖", "🦄"];

  // Real-time Database references duplicated locally for immediate interactions
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [guildsList, setGuildsList] = useState<Guild[]>([]);
  const [guildViewId, setGuildViewId] = useState<string | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [reportsList, setReportsList] = useState<GameReport[]>([]);
  const [bannedEmailsList, setBannedEmailsList] = useState<string[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([
    {
      id: "tour_weekly",
      title: "بطولة كأس الأذكياء الأسبوعية الكبرى",
      endDate: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
      participantsCount: 42,
      prizes: {
        first: "5000 ذهبة + 250 جوهرة + لقب أسطوري + إطار ذهبي",
        second: "2500 ذهبة + 100 جوهرة + إطار فضي",
        third: "1000 ذهبة + 50 جوهرة + إطار برونزي"
      }
    }
  ]);

  // Socket states
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [currentJoinedRoom, setCurrentJoinedRoom] = useState<Room | null>(null);

  // Match play states
  const [activeMatch, setActiveMatch] = useState<MatchState | null>(null);
  const [matchQuestionsCount, setMatchQuestionsCount] = useState(10);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [currentQuestionCategory, setCurrentQuestionCategory] = useState("");
  const [currentQuestionOptions, setCurrentQuestionOptions] = useState<string[]>([]);
  const [currentQuestionHint, setCurrentQuestionHint] = useState("");
  const [matchTicks, setMatchTicks] = useState(6);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [roundFeedback, setRoundFeedback] = useState<{
    correctAnswer: string;
    playerAnswers: Record<string, { answer: string; isCorrect: boolean }>;
    scores: Record<string, number>;
  } | null>(null);
  const [matchOverReport, setMatchOverReport] = useState<{
    winnerId: string;
    reason: string;
    scores: Record<string, number>;
    players?: Player[];
    correctCount?: number;
    wrongCount?: number;
    timeElapsed?: number;
  } | null>(null);

  const [matchStats, setMatchStats] = useState({
    correctCount: 0,
    wrongCount: 0,
    startTime: 0
  });

  const [emojiGuessInput, setEmojiGuessInput] = useState("");

  // WebRTC voice indicators
  const [teamMicOn, setTeamMicOn] = useState(false);
  const [speakingPlayers, setSpeakingPlayers] = useState<Record<string, boolean>>({});

  // Achievements mock metrics list
  const achievementsList = [
    { id: "ach_1", title: "الانطلاقة الذكية", desc: "سجل حسابك الأول بنجاح فى صراع الأذكياء", reward: "50 金", threshold: 1, current: 1 },
    { id: "ach_2", title: "مقاتل المسابقات", desc: "العب 5 مباريات أونلاين كاملة", reward: "150 金 + 10 Gems", threshold: 5, current: 0 },
    { id: "ach_3", title: "الفيلسوف الأكبر", desc: "حقق 3 انتصارات متتالية فى نمط 1 ضد 1", reward: "300 金 + 25 Gems", threshold: 3, current: 0 }
  ];

  // System warnings
  const [notifications, setNotifications] = useState<string[]>([]);

  // Sound Mute Toggle
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Auto-scoll chat
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Synchronize players, guilds and tournaments lists
  const fetchGlobalData = async (retryCount = 0) => {
    try {
      const plRes = await fetch("/api/players");
      if (plRes.ok) {
        const data = await plRes.json();
        setPlayersList(data.players || []);
      }
      
      const gdRes = await fetch("/api/guilds");
      if (gdRes.ok) {
        const data = await gdRes.json();
        setGuildsList(data.guilds || []);
      }
    } catch (e) {
      if (retryCount < 3) {
        setTimeout(() => {
          fetchGlobalData(retryCount + 1);
        }, 1500 * (retryCount + 1));
      } else {
        console.error("Error fetching live lists:", e);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchGlobalData();
    setIsAudioMuted(sounds.getMuteStatus());

    // Seeding dynamic shop catalog items
    setShopItems([
      { id: "avatar_gold_crown", name: "أفاتار تاج الملوك الأسطوري", description: "أفاتار ملكي مزين بتاج مرصع بالألماس والياقوت.", type: "avatar", rarity: "legendary", priceType: "gems", priceValue: 120, assetValue: "👑" },
      { id: "avatar_dark_knight", name: "أفاتار فارس الظلام النادر", description: "أفاتار غامض لمحارب غامض يدمر الصعاب فكرياً.", type: "avatar", rarity: "epic", priceType: "coins", priceValue: 3000, assetValue: "🕵️" },
      { id: "avatar_clever_nightmare", name: "أفاتار كابوس الأذكياء", description: "مظهر مرعب وخارق يثير وجل المنافسين بعبقرية حادة.", type: "avatar", rarity: "legendary", priceType: "gems", priceValue: 150, assetValue: "😈" },
      { id: "avatar_albert", name: "أفاتار المخترع العبقري", description: "أفاتار يجسد روح الابتكار والفضول العلمي.", type: "avatar", rarity: "rare", priceType: "coins", priceValue: 1200, assetValue: "👨‍🔬" },
      { id: "avatar_quantum_emperor", name: "إمبراطور الكوانتم السيبراني", description: "مخترق الزمن الكوني وسيد الأبعاد الرقمية المتقدمة لفك شفرات أصعب الألغاز المعقدة.", type: "avatar", rarity: "epic", priceType: "gems", priceValue: 75, assetValue: "🦾" },
      { id: "border_gold", name: "إطار الكأس الذهبي المتوهج", description: "إطار ذهبي فاخر يحيط بأيقونة حسابك في كل مكان.", type: "border", rarity: "legendary", priceType: "gems", priceValue: 150, assetValue: "border-gold" },
      { id: "border_neon_purple", name: "إطار النيون البنفسجي المضيء", description: "إطار نيون بنفسجي مستقبلي بوهج ساحر.", type: "border", rarity: "epic", priceType: "coins", priceValue: 2000, assetValue: "border-purple" },
      { id: "border_cyan", name: "إطار السايان المكهرب", description: "إطار سايان مشع بالطاقة الإلكترونية الصاعقة.", type: "border", rarity: "rare", priceType: "coins", priceValue: 800, assetValue: "border-cyan" },
      { id: "title_philosopher", name: "لقب أسطوري: فيلسوف العصر", description: "لقب فخم يظهر أسفل اسمك يعكس عمق الحكمة اللامحدودة.", type: "title", rarity: "legendary", priceType: "gems", priceValue: 200, assetValue: "فيلسوف العصر" },
      { id: "title_quick_mind", name: "لقب ملحمي: البرق والذكاء السريع", description: "لقب للاعبين الذين يمتلكون سرعة استجابة مذهلة.", type: "title", rarity: "epic", priceType: "coins", priceValue: 1500, assetValue: "العقل الناري" },
      { id: "color_golden_name", name: "لون اسم مذهب", description: "يجعل اسمك يدرج باللون الذهبي البراق الفاخر.", type: "name_color", rarity: "legendary", priceType: "gems", priceValue: 90, assetValue: "text-amber-400 font-bold" },
      { id: "color_magenta_name", name: "لون اسم بنفسجي متوهج", description: "يجعل اسمك يدرج باللون البنفسجي الساطع الجذاب.", type: "name_color", rarity: "epic", priceType: "coins", priceValue: 1000, assetValue: "text-fuchsia-400 font-semibold" },
      { id: "bg_nebula", name: "خلفية السديم الفضائي الملون", description: "تحول خلفية ملفك الشخصي إلى مشهد مجرات رائع.", type: "background", rarity: "legendary", priceType: "gems", priceValue: 180, assetValue: "bg-gradient-to-br from-indigo-950 via-purple-900 to-black animate-pulse" },
      { id: "bg_desert_sunset", name: "خلفية شفق الرمال الصحراوي", description: "سمة دافئة مريحة ومهيبة بألوان برونزية غامرة.", type: "background", rarity: "rare", priceType: "coins", priceValue: 2500, assetValue: "bg-gradient-to-tr from-amber-950 via-red-950 to-stone-900" },
      { id: "effect_plasma_glow", name: "مؤثر البلازما المتفجر", description: "يمنح صورتك وباقات الإجابة زخارف سيبرانية ملتهبة.", type: "effect", rarity: "epic", priceType: "gems", priceValue: 80, assetValue: "shadow-[0_0_15px_#a855f7] border-purple-500 animate-pulse" },
      { id: "effect_sun_spark", name: "توهج شمس المعرفة", description: "هالة شعاع ذهبي تدور بنعومة حول تفاصيل حسابك.", type: "effect", rarity: "legendary", priceType: "coins", priceValue: 4000, assetValue: "shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-bounce" },
      { id: "guild_badge_crest", name: "شعار التحالف الأبي", description: "أيقونة شعار نقابة حصرية على نمط درع التاج السامي.", type: "guild_badge", rarity: "rare", priceType: "coins", priceValue: 1500, assetValue: "⚜️" },
      { id: "guild_badge_star", name: "شعار النجمة السباعية العتيقة", description: "رمز النقابة المستلهم من موروث الفلاسفة العرب الأوائل.", type: "guild_badge", rarity: "epic", priceType: "gems", priceValue: 70, assetValue: "⭐" }
    ]);

    // Setup fallback user if no JWT is found
    if (!authToken) {
      setMe(null);
    } else {
      fetchSelfProfile(authToken);
    }
  }, [authToken]);

  // Pull listings as tab shifts
  useEffect(() => {
    fetchGlobalData();
  }, [activeTab]);

  // Fetch profiles
  const fetchSelfProfile = async (token: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        let player: Player = data.player;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const lastReset = player.lastMissionsResetTime ? Number(player.lastMissionsResetTime) : 0;
        let needsSave = false;

        // Initialize ownedItems
        if (!player.ownedItems) {
          player.ownedItems = [];
          needsSave = true;
        }

        // Auto-seed active cosmetics so they are owned
        const activeItemsToSeed = [player.borderId, player.bgId, player.effectId].filter(Boolean) as string[];
        let updatedOwned = [...(player.ownedItems || [])];
        let hasNewSeed = false;
        activeItemsToSeed.forEach(itemId => {
          if (itemId && !updatedOwned.includes(itemId)) {
            updatedOwned.push(itemId);
            hasNewSeed = true;
          }
        });
        if (hasNewSeed) {
          player.ownedItems = updatedOwned;
          needsSave = true;
        }

        // 24 Hour Reset cycle check
        if (!lastReset || (now - lastReset >= oneDayMs)) {
          player.missionsClaimed = [];
          player.missionsProgress = {};
          player.lastMissionsResetTime = now;
          needsSave = true;
        }

        if (needsSave) {
          try {
            await fetch("/api/players/update", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                missionsClaimed: player.missionsClaimed || [],
                missionsProgress: player.missionsProgress || {},
                lastMissionsResetTime: player.lastMissionsResetTime,
                ownedItems: player.ownedItems
              })
            });
          } catch (err) {
            console.error("Failed saving missions reset / ownedItems seeds:", err);
          }
        }

        setMe(player);
      } else {
        // Clear broken session
        handleLogout();
      }
    } catch (e) {
      // Local development fallback
      const decodedFallback: Player = {
        id: "ply_development_1",
        username: "المتسابق التجريبي",
        email: "demo@siraa.com",
        avatar: "🧙",
        level: 4,
        xp: 420,
        wins: 12,
        losses: 8,
        matchesPlayed: 20,
        guildId: null,
        guildName: null,
        coins: 850,
        gems: 45,
        title: "حكيم مبتدئ",
        nameColor: "text-slate-100",
        borderId: null,
        createdAt: new Date().toISOString()
      };
      setMe(decodedFallback);
    }
  };

  // Socket listeners setup
  useEffect(() => {
    if (!me) return;

    // Connect to websocket relative root
    const skClient = io();
    setSocket(skClient);

    // Identity verification
    skClient.emit("auth_handshake", me.id);

    // Initial query
    skClient.emit("get_global_chats");
    skClient.emit("get_active_rooms");
    skClient.emit("get_private_chats_list", { playerId: me.id });
    skClient.emit("get_notifications", { playerId: me.id });

    if (me.guildId) {
      skClient.emit("get_guild_chats", { guildId: me.guildId });
    }

    // General counters and socket bindings
    skClient.on("online_count_update", (count: number) => {
      setOnlineCount(count);
    });

    skClient.on("global_chats_list", (msgs: ChatMessage[]) => {
      setChatMessages(msgs);
    });

    skClient.on("new_global_chat", (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      // Autoscroll chat
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    skClient.on("guild_chats_list", (msgs: ChatMessage[]) => {
      setGuildChatMessages(msgs);
    });

    skClient.on("new_guild_chat", (msg: ChatMessage) => {
      setGuildChatMessages((prev) => [...prev, msg]);
      setTimeout(() => guildChatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    skClient.on("private_chats_list", (list: any[]) => {
      setPrivateChatsList(list);
    });

    skClient.on("private_messages_list", (msgs: PrivateMessage[]) => {
      setPrivateMessages(msgs);
      setTimeout(() => dmBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    skClient.on("new_private_message", (msg: PrivateMessage) => {
      setPrivateMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const isFromPartner = (msg.senderId === activeDmPartnerIdRef.current || msg.receiverId === activeDmPartnerIdRef.current);
        if (isFromPartner) {
          if (msg.receiverId === me.id) {
            skClient.emit("mark_private_messages_read", { playerId: me.id, partnerId: activeDmPartnerIdRef.current });
          }
          return [...prev, msg];
        }
        return prev;
      });
      skClient.emit("get_private_chats_list", { playerId: me.id });
    });

    skClient.on("private_messages_marked_read", (data: { readerId: string }) => {
      setPrivateMessages((prev) => prev.map(m => m.senderId === me.id ? { ...m, isRead: true } : m));
    });

    skClient.on("notifications_list", (list: Notification[]) => {
      setNotificationsList(list);
    });

    skClient.on("new_notification", (notif: Notification) => {
      setNotificationsList((prev) => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setAnnouncement(notif.content);
      sounds.playSuccess();
    });

    skClient.on("active_rooms_list", (rooms: Room[]) => {
      setActiveRooms(rooms);
    });

    // Handle room entries
    skClient.on("room_players_updated", (playerIds: any[]) => {
      // Sync names
    });

    // Invitations receiver
    skClient.on("room_invite_received", (data: { roomId: string; roomName: string; inviterName: string; inviterAvatar: string }) => {
      sounds.playFanfare();
      const inviteMsg = `دعوة تحدي! دعاك [${data.inviterName}] للانضمام إلى الغرفة [${data.roomName}]`;
      setNotifications((prev) => [inviteMsg, ...prev]);
      
      if (window.confirm(`${inviteMsg}. هل تود قبول التحدي والالتحاق بالساحة؟`)) {
        handleJoinExistRoom(data.roomId);
      }
    });

    // MATCHMAKING LOOPS
    skClient.on("match_started", (data: { matchId: string; questionsCount: number; players: Player[] }) => {
      sounds.playFanfare();
      setMatchQuestionsCount(data.questionsCount);
      setRoundFeedback(null);
      setMatchOverReport(null);
      setSelectedAnswer(null);
      setEmojiGuessInput("");
      setMatchStats({
        correctCount: 0,
        wrongCount: 0,
        startTime: Date.now()
      });
      
      const startingMatchState: MatchState = {
        matchId: data.matchId,
        roomId: currentJoinedRoom?.id || "",
        questions: [],
        currentQuestionIndex: 0,
        scores: {},
        answersSubmitted: {},
        timer: 15,
        status: "playing"
      };
      // Bind players
      data.players.forEach(p => { startingMatchState.scores[p.id] = 0; });
      setActiveMatch(startingMatchState);
    });

    skClient.on("match_round_question", (data: {
      questionText: string;
      category: string;
      options?: string[];
      hint?: string;
      currentQuestionIndex: number;
      timer: number;
    }) => {
      sounds.playTick();
      setCurrentQuestionText(data.questionText);
      setCurrentQuestionCategory(data.category);
      setCurrentQuestionOptions(data.options || []);
      setCurrentQuestionHint(data.hint || "");
      setMatchTicks(data.timer);
      setSelectedAnswer(null);
      setRoundFeedback(null);
      setEmojiGuessInput("");
      
      setActiveMatch((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentQuestionIndex: data.currentQuestionIndex,
          timer: data.timer
        };
      });
    });

    skClient.on("match_timer_sync", (payload: { timer: number }) => {
      setMatchTicks(payload.timer);
    });

    skClient.on("player_answered_bump", (data: { playerId: string }) => {
      sounds.playClick();
    });

    skClient.on("round_ended_results", (data: {
      correctAnswer: string;
      playerAnswers: Record<string, { answer: string; isCorrect: boolean }>;
      scores: Record<string, number>;
    }) => {
      setRoundFeedback({
        correctAnswer: data.correctAnswer,
        playerAnswers: data.playerAnswers,
        scores: data.scores
      });

      // Update statistics
      if (me) {
        const myAnswerObj = data.playerAnswers[me.id];
        if (myAnswerObj) {
          if (myAnswerObj.isCorrect) {
            setMatchStats((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
            sounds.playSuccess();
          } else {
            setMatchStats((prev) => ({ ...prev, wrongCount: prev.wrongCount + 1 }));
            sounds.playError();
          }
        } else {
          setMatchStats((prev) => ({ ...prev, wrongCount: prev.wrongCount + 1 }));
          sounds.playError();
        }
      }

      // Sync local score boards
      setActiveMatch((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          scores: data.scores
        };
      });
    });

    skClient.on("match_complete_stats", (data: {
      winnerId: string;
      reason: string;
      scores: Record<string, number>;
      players: Player[];
    }) => {
      sounds.playFanfare();

      setRoundFeedback(null);
      setEmojiGuessInput("");

      setMatchStats((currentStats) => {
        const totalSecs = Math.round((Date.now() - currentStats.startTime) / 1000);
        setMatchOverReport({
          winnerId: data.winnerId,
          reason: data.reason,
          scores: data.scores,
          players: data.players,
          correctCount: currentStats.correctCount,
          wrongCount: currentStats.wrongCount,
          timeElapsed: totalSecs > 0 ? totalSecs : 36
        });
        return currentStats;
      });

      // Award/sync with actual server-authoritative calculations
      const serverUpdatedMe = data.players?.find(p => p.id === me?.id);
      if (serverUpdatedMe) {
        setMe(serverUpdatedMe);
      } else {
        // Fallback local calculations that cleanly compute level based on formula
        const hasWon = (data.winnerId === me?.id);
        if (hasWon) {
          setMe((prev) => {
            if (!prev) return null;
            const newXp = prev.xp + 50;
            const targetLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
            return {
              ...prev,
              wins: (prev.wins || 0) + 1,
              coins: (prev.coins || 0) + 200,
              xp: newXp,
              level: targetLevel > (prev.level || 1) ? targetLevel : (prev.level || 1)
            };
          });
        } else {
          setMe((prev) => {
            if (!prev) return null;
            const newXp = prev.xp + 15;
            const targetLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
            return {
              ...prev,
              losses: (prev.losses || 0) + 1,
              coins: (prev.coins || 0) + 50,
              xp: newXp,
              level: targetLevel > (prev.level || 1) ? targetLevel : (prev.level || 1)
            };
          });
        }
      }

      // Exit active screens
      setCurrentJoinedRoom(null);
      setActiveMatch(null);
    });

    // System Warning trigger
    skClient.on("system_warning", (warnText: string) => {
      sounds.playError();
      setAnnouncement(warnText);
    });

    // RTC audio speaker sync
    skClient.on("webrtc_voice_speaking_update", (data: { playerId: string; isSpeaking: boolean }) => {
      setSpeakingPlayers((prev) => ({
        ...prev,
        [data.playerId]: data.isSpeaking
      }));
    });

    return () => {
      skClient.disconnect();
    };
  }, [me?.id]);

  // Dynamic fetcher and marker-as-read when active DM partner changes
  useEffect(() => {
    if (socket && me && activeDmPartnerId) {
      socket.emit("get_private_messages", { playerId: me.id, partnerId: activeDmPartnerId });
      socket.emit("mark_private_messages_read", { playerId: me.id, partnerId: activeDmPartnerId });
    }
  }, [activeDmPartnerId, socket, me?.id]);

  // Login handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    setAuthError("");

    if (!authEmail || !authPassword || (isRegisterMode && !authUsername)) {
      setAuthError("الرجاء إدخال الحقول المطلوبة بالكامل!");
      return;
    }

    const payload = isRegisterMode 
      ? { username: authUsername, email: authEmail, password: authPassword, avatar: chosenAvatar }
      : { email: authEmail, password: authPassword };

    const url = isRegisterMode ? "/api/auth/register" : "/api/auth/login";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        sounds.playSuccess();
        localStorage.setItem("siraa_token", data.token);
        setAuthToken(data.token);
        setMe(data.player);
      } else {
        sounds.playError();
        setAuthError(data.error || "خطأ غير متوقع في المصادقة");
      }
    } catch (err) {
      // Local sandbox auto-generate bypass
      sounds.playSuccess();
      const fakeId = "ply_" + Math.random().toString(36).substring(2, 8);
      const guestPlayer: Player = {
        id: fakeId,
        username: authUsername || "ضيف فصيح",
        email: authEmail.toLowerCase(),
        avatar: chosenAvatar || "🧙",
        level: 1,
        xp: 0,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        guildId: null,
        guildName: null,
        coins: 1000,
        gems: 50,
        title: "حكيم بطل",
        nameColor: "text-amber-400 font-bold",
        borderId: null,
        createdAt: new Date().toISOString()
      };
      setMe(guestPlayer);
      setAuthToken("fake_token_" + fakeId);
      localStorage.setItem("siraa_token", "fake_token_" + fakeId);
    }
  };

  const handleLogout = () => {
    sounds.playClick();
    localStorage.removeItem("siraa_token");
    setAuthToken(null);
    setMe(null);
    setCurrentJoinedRoom(null);
    setActiveMatch(null);
  };

  const toggleSoundMute = () => {
    const isMuted = sounds.toggleMute();
    setIsAudioMuted(isMuted);
  };

  // ROOM INTERACTIONS
  const handleCreateRoomAction = (type: "1v1" | "2v2", mode: GameMode) => {
    sounds.playClick();
    if (!socket || !me) return;

    socket.emit("create_room", {
      name: `مجلس تحدي ${me.username}`,
      type,
      mode,
      creatorId: me.id
    });

    socket.once("room_action_success", (room: Room) => {
      setCurrentJoinedRoom(room);
      setActiveTab("rooms");
    });
  };

  const handleJoinExistRoom = (rId: string) => {
    sounds.playClick();
    if (!socket || !me) return;

    socket.emit("join_room", {
      roomId: rId,
      playerId: me.id
    });

    socket.once("room_action_success", (room: Room) => {
      setCurrentJoinedRoom(room);
      setActiveTab("rooms");
    });

    socket.once("room_action_error", (errorMsg: string) => {
      sounds.playError();
      setAnnouncement(errorMsg);
    });
  };

  const handleLeaveCurrentRoom = () => {
    sounds.playClick();
    if (!socket || !me || !currentJoinedRoom) return;

    socket.emit("leave_room", {
      roomId: currentJoinedRoom.id,
      playerId: me.id
    });

    setCurrentJoinedRoom(null);
    setActiveMatch(null);
  };

  // Submit match answer index / text
  const handleSubmitAnswerAction = (ans: string) => {
    if (!socket || !me || !activeMatch || selectedAnswer) return;
    sounds.playClick();
    setSelectedAnswer(ans);

    socket.emit("submit_answer", {
      matchId: activeMatch.matchId,
      playerId: me.id,
      answer: ans,
      timeTaken: 6 - matchTicks
    });
  };

  // Invite player online list handler
  const handleInvitePlayerToRoom = (targetId: string) => {
    sounds.playClick();
    if (!socket || !currentJoinedRoom || !me) return;
    socket.emit("invite_player_to_room", {
      roomId: currentJoinedRoom.id,
      inviterId: me.id,
      inviteeId: targetId
    });
    setAnnouncement(`تم إرسال دعوة التحدي للقرين بنجاح.`);
  };

  // Chat message sending
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !me) return;
    sounds.playClick();

    if (activeChatTab === "general") {
      socket.emit("send_global_chat", {
        senderId: me.id,
        message: chatInput.trim()
      });
    } else if (activeChatTab === "guild") {
      if (!me.guildId) return;
      socket.emit("send_guild_chat", {
        senderId: me.id,
        guildId: me.guildId,
        message: chatInput.trim()
      });
    }
    setChatInput("");
  };

  // Direct Message sending
  const handleSendPrivateMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmInput.trim() || !socket || !me || !activeDmPartnerId) return;
    sounds.playClick();

    socket.emit("send_private_message", {
      senderId: me.id,
      receiverId: activeDmPartnerId,
      message: dmInput.trim()
    });
    setDmInput("");
  };

  // Append autocomplete mention text to current input safely
  const appendMentionToInput = (username: string) => {
    const isDm = activeChatTab === "dm";
    const currentVal = isDm ? dmInput : chatInput;
    const lastAtIdx = currentVal.lastIndexOf("@");
    if (lastAtIdx === -1) return;
    
    const newVal = currentVal.substring(0, lastAtIdx) + `@${username} `;
    if (isDm) {
      setDmInput(newVal);
    } else {
      setChatInput(newVal);
    }
    setShowMentionsDropdown(false);
  };

  const handleChatTextInputChange = (val: string) => {
    setChatInput(val);
    const lastAtIdx = val.lastIndexOf("@");
    if (lastAtIdx !== -1 && lastAtIdx >= val.lastIndexOf(" ")) {
      const query = val.substring(lastAtIdx + 1);
      setMentionsDropdownFilter(query);
      setShowMentionsDropdown(true);
    } else {
      setShowMentionsDropdown(false);
    }
  };

  const handleDmTextInputChange = (val: string) => {
    setDmInput(val);
    const lastAtIdx = val.lastIndexOf("@");
    if (lastAtIdx !== -1 && lastAtIdx >= val.lastIndexOf(" ")) {
      const query = val.substring(lastAtIdx + 1);
      setMentionsDropdownFilter(query);
      setShowMentionsDropdown(true);
    } else {
      setShowMentionsDropdown(false);
    }
  };

  // Toxic behaviour report trigger
  const handleFileReport = (reportedUser: Player) => {
    sounds.playClick();
    const reasonSelection = prompt("لماذا تود الإبلاغ عن هذا المنافس؟\n1. كلمة بذيئة / إساءة\n2. غش / تلاعب بالثواني\n3. سلوك غير رياضي\n\nأدخل سبب البلاغ كتابياً:");
    if (!reasonSelection) return;

    const dummyReport: GameReport = {
      id: "rep_" + Math.random().toString(36).substring(2, 11),
      reporterId: me?.username || "لاعب غيور",
      reportedId: reportedUser.username,
      reason: reasonSelection,
      description: "بلاغ فوري تم رفعه مباشرة من الساحة.",
      timestamp: new Date().toLocaleTimeString("ar-SA"),
      status: "pending"
    };

    setReportsList((prev) => [dummyReport, ...prev]);
    alert("نشكرك على مساهمتك! تم إرسال البلاغ لقسم المراقبين وسيقطعون غرفته فوراً في حال المخالفة.");
  };

  // Mute game player
  const handleMutePlayerToggleAction = (pId: string) => {
    setPlayersList((prev) => 
      prev.map((pl) => (pl.id === pId ? { ...pl, isMuted: !pl.isMuted } : pl))
    );
  };

  // Mute microphone simulated WebRTC call triggers
  const handleMicrophoneToggle = () => {
    sounds.playClick();
    const updatedMic = !teamMicOn;
    setTeamMicOn(updatedMic);
    if (socket && me && currentJoinedRoom) {
      socket.emit("webrtc_voice_speaking", {
        roomId: currentJoinedRoom.id,
        playerId: me.id,
        isSpeaking: updatedMic
      });
    }
  };

  // Admin capabilities hooks
  const handleAdminBanPlayer = (email: string) => {
    setBannedEmailsList((prev) => [...prev, email.toLowerCase()]);
    // flag user locally
    setPlayersList((prev) => prev.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, isBanned: true } : u)));
  };

  const handleAdminUnbanPlayer = (email: string) => {
    setBannedEmailsList((prev) => prev.filter((e) => e !== email.toLowerCase()));
    setPlayersList((prev) => prev.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, isBanned: false } : u)));
  };

  const handleAdminDeleteRoomAction = (rId: string) => {
    setActiveRooms((prev) => prev.filter((r) => r.id !== rId));
  };

  // Splash wait
  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  // Not logged view
  if (!me) {
    return (
      <div className="min-h-screen bg-[#070512] flex flex-col items-center justify-center text-white px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1),transparent_70%)]" />

        <div className="relative w-full max-w-sm mb-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center animate-glow mb-4">
            <Brain className="w-10 h-10 text-amber-300 animate-float" />
          </div>
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-200 to-white">
            صِـــــرَاعُ الأَذْكِـــــيَاء
          </h1>
          <p className="text-xs text-purple-300 mt-1 uppercase tracking-widest font-mono">مسابقة العقول العربية المباشرة</p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm bg-[#110d29] border border-purple-500/10 rounded-2xl p-5 shadow-2xl relative"
        >
          <div className="flex bg-slate-950/80 p-1.5 rounded-lg mb-4 text-xs font-bold font-sans">
            <button
              onClick={() => { sounds.playClick(); setIsRegisterMode(false); }}
              className={`flex-1 py-1.5 rounded-md transition-colors ${!isRegisterMode ? "bg-purple-600 text-white font-black" : "text-slate-400"}`}
            >
              تسجيل في قاعة اللعب
            </button>
            <button
              onClick={() => { sounds.playClick(); setIsRegisterMode(true); }}
              className={`flex-1 py-1.5 rounded-md transition-colors ${isRegisterMode ? "bg-purple-600 text-white font-black" : "text-slate-400"}`}
            >
              إنشاء حساب بطل
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {isRegisterMode && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">اسم اللاعب البطل</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسمك أو لقبك المستعار..."
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                required
                placeholder="أدخل بريدك الإلكتروني المعتمد..."
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">كلمة المرور الحصينة</label>
              <input
                type="password"
                required
                placeholder="حد أدنى 6 أحرف أو أرقام..."
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Avatar picker during registration */}
            {isRegisterMode && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] text-slate-400">اختر أفاتار مجاني للبداية ({chosenAvatar})</label>
                <div className="flex space-x-1.5 space-x-reverse overflow-x-auto pb-1.5">
                  {FREE_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => { sounds.playClick(); setChosenAvatar(av); }}
                      className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-slate-900 border text-md transition-colors ${
                        chosenAvatar === av ? "border-amber-400 bg-amber-950/20" : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {authError && <p className="text-xs text-rose-400 text-center leading-tight">{authError}</p>}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl transition-transform active:scale-95 shadow-lg shadow-amber-500/25 mt-4"
            >
              {isRegisterMode ? "تأكيد واستلام الجوائز 🎁" : "الجهاد الفكري وتسجيل الدخول ⚔️"}
            </button>
          </form>

          <p className="text-[10px] text-slate-500 text-center mt-3 leading-relaxed">
            بالتسجيل، أنت توافق على احترام اللاعبين الآخرين بـ صراع الأذكياء وعدم إثارة الشتائم.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070512] font-sans flex items-start justify-center md:py-6 text-white overflow-hidden relative">
      {/* Absolute floating notifications popup announcements */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-[#161233] border-l-4 border-amber-400 shadow-2xl rounded-lg p-3 flex items-start justify-between"
          >
            <div className="flex items-start space-x-2 space-x-reverse text-xs text-slate-200">
              <span className="text-base text-amber-400 shrink-0">🔔</span>
              <p className="leading-relaxed">{announcement}</p>
            </div>
            <button onClick={() => setAnnouncement(null)} className="p-1 hover:bg-slate-800 rounded">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md bg-[#0a0718] border-0 md:border md:border-slate-900 rounded-none md:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col h-screen md:h-[820px] shrink-0">
        
        {/* GAME HEADER HEADER */}
        <header className="sticky top-0 z-20 bg-[#0d091e]/90 backdrop-blur border-b border-purple-500/10 px-4 py-3 flex items-center justify-between shadow-lg">
          <div 
            onClick={() => { sounds.playClick(); setActiveTab("profile"); }}
            className="flex items-center space-x-2.5 space-x-reverse cursor-pointer group active:scale-95 transition-all select-none"
            title="عرض الملف الشخصي الكامل"
          >
            <div className="relative">
              {/* Avatar gold framing decoration if possessed */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-slate-900 text-xl border transition-colors group-hover:border-purple-400 ${
                me.borderId === "border_gold" ? "border-amber-400 animate-glow" : "border-purple-500"
              }`}>
                {me.avatar}
              </div>
              {me.borderId === "border_gold" && (
                <div className="absolute -inset-0.5 rounded-full border border-amber-400/50 animate-pulse pointer-events-none" />
              )}
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1 space-x-reverse">
                <span className={`text-xs font-black max-w-[100px] truncate group-hover:text-purple-300 transition-colors ${me.nameColor || "text-slate-100"}`}>{me.username}</span>
                <span className="bg-purple-950 text-purple-300 text-[8px] font-mono px-1 rounded border border-purple-500/20">Lvl {me.level}</span>
              </div>
              <p className="text-[9px] text-slate-400 truncate">{me.title || "لا يوجد لقب تجميلي"}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 space-x-reverse">
            
            {/* Notifications Bell button */}
            <div className="relative">
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowNotificationsSystem(prev => !prev);
                }}
                className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 relative transition-transform active:scale-95 flex items-center justify-center id-notifications-bell-btn"
                title="مركز الإشعارات والمناداة"
                id="header_bell_button"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                {notificationsList.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-[8px] font-mono font-black text-white px-1 py-0.5 rounded-full animate-bounce min-w-[14px] leading-none text-center">
                    {notificationsList.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
            </div>

            {/* Audio Toggle config */}
            <button
              onClick={toggleSoundMute}
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300"
              title="كتم الصوت تماماً"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Admin Desk portal */}
            {(me?.role === "admin" || me?.id === "admin_user" || me?.email === "ahmedfox@gmail.com") && (
              <button
                onClick={() => { sounds.playClick(); setShowAdmin(true); }}
                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300"
                title="لوحة الإدارة"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* COMPREHENSIVE ACTIVE TRIVIA ARENA SCREEN OVERLAY */}
        {activeMatch && (
          <div className="absolute inset-0 z-30 bg-[#0d091e] flex flex-col p-4 animate-fade-in text-slate-200">
            {/* Arena score metrics header */}
            <div className="flex items-center justify-between border-b border-purple-500/10 pb-3 mb-4">
              <div className="flex items-center space-x-1 space-x-reverse text-xs text-purple-300">
                <Brain className="w-4 h-4 text-amber-400" />
                <span>السؤال {activeMatch.currentQuestionIndex + 1} / {matchQuestionsCount}</span>
              </div>

              {/* Ticking clock progress widget */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full border-2 border-dashed ${
                  matchTicks <= 2 ? "border-rose-500 animate-pulse" : "border-amber-400"
                }`} />
                <span className={`text-base font-mono font-black ${
                  matchTicks <= 2 ? "text-rose-400" : "text-white"
                }`}>{matchTicks}</span>
              </div>

              {/* Team voice chat toggle buttons inside active room match */}
              <button
                onClick={handleMicrophoneToggle}
                className={`flex items-center space-x-1 space-x-reverse px-2.5 py-1 text-[10px] rounded border ${
                  teamMicOn
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300 animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {teamMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                <span>صوت الفريق</span>
              </button>
            </div>

            {roundFeedback ? (
              /* BEAUTIFUL REVEAL SCREEN Overlay inside Active Match */
              <div className="flex-1 flex flex-col justify-between mt-4 overflow-y-auto space-y-4">
                
                {/* Visual Card showing correct answer */}
                <div className="bg-gradient-to-b from-[#1c123d] to-[#0c081e] p-5 rounded-2xl border border-amber-500/30 text-center shadow-xl relative">
                  <span className="absolute -top-3 right-1/2 translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-300">
                    🎉 كشف الإجابة الصحيحة 🎉
                  </span>
                  
                  <div className="text-4xl mt-4 select-none animate-bounce">
                    🎬🦁👑
                  </div>

                  <p className="text-xs text-purple-300 font-bold mt-2">اسم الإجابة المعتمد:</p>
                  <h3 className="text-lg font-black text-amber-300 mt-0.5 select-all">
                    "{roundFeedback.correctAnswer}"
                  </h3>

                  {/* Clarification meaning / Hint */}
                  {currentQuestionHint && (
                    <div className="mt-3 p-2 bg-purple-950/40 rounded-lg border border-purple-500/10 text-[10px] text-purple-300">
                      ℹ️ <span className="font-extrabold text-[#7ed6df]">توضيح الرموز:</span> {currentQuestionHint}
                    </div>
                  )}
                </div>

                {/* Scoreboard showing correct/incorrect/timeout answers */}
                <div className="space-y-2 flex-1">
                  <div className="text-right text-[11px] font-extrabold text-[#95afc0] mb-2 mr-1">
                    📊 أداء اللاعبين في جولة الإيموجي الحالية:
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {currentJoinedRoom?.players.map((pId) => {
                      const opponent = playersList.find((op) => op.id === pId) || (pId === me?.id ? me : null);
                      if (!opponent) return null;

                      const sub = roundFeedback.playerAnswers[pId];
                      const currentScore = roundFeedback.scores[pId] || 0;

                      let statusBadge = null;
                      if (!sub) {
                        statusBadge = (
                          <div className="flex items-center space-x-1 space-x-reverse bg-rose-950/40 border border-rose-500/20 text-rose-300 text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0">
                            <span>⏳ انتهى وطال الوقت</span>
                          </div>
                        );
                      } else if (sub.isCorrect) {
                        statusBadge = (
                          <div className="flex items-center space-x-1 space-x-reverse bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0">
                            <span>✅ أجاب بشكل صحيح</span>
                          </div>
                        );
                      } else {
                        statusBadge = (
                          <div className="flex items-center space-x-1 space-x-reverse bg-orange-950/40 border border-orange-500/20 text-orange-300 text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0">
                            <span className="truncate max-w-[120px]">❌ خاطئة ({sub.answer})</span>
                          </div>
                        );
                      }

                      return (
                        <div key={pId} className="bg-[#120c27] p-2.5 rounded-xl border border-purple-500/10 flex items-center justify-between">
                          <div className="flex items-center space-x-2 space-x-reverse min-w-0">
                            <span className="text-md select-none">{opponent.avatar || "👤"}</span>
                            <div className="min-w-0 text-right">
                              <p className="text-[11px] font-black text-slate-100 truncate flex items-center space-x-1 space-x-reverse">
                                {pId === me?.id && <span className="bg-purple-600 text-[8px] text-white px-1.5 rounded-md">أنت</span>}
                                <span style={{ color: opponent.nameColor || "inherit" }}>{opponent.username}</span>
                              </p>
                              <p className="text-[9px] text-[#ffbe76] font-extrabold">{currentScore} نقطة</p>
                            </div>
                          </div>

                          {statusBadge}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer status ticks */}
                <div className="text-center text-[10px] text-[#ffbe76]/70 font-bold bg-slate-950/40 p-2.5 rounded-xl animate-pulse">
                  ⏱️ استعد.. جاري الانتقال التلقائي للغز الإيموجي التالي...
                </div>

              </div>
            ) : (
              /* STANDARD QUESTION ARENA SCREEN */
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Visual Progress Bar (linear countdown from 100% to 0% over 6 seconds) */}
                  <div className="w-full bg-slate-950 border border-purple-500/20 h-2.5 rounded-full overflow-hidden mb-3.5 relative shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                        matchTicks <= 2 ? "bg-gradient-to-r from-rose-500 to-red-600 animate-pulse" : "bg-gradient-to-r from-cyan-400 via-purple-500 to-indigo-500"
                      }`}
                      style={{ width: `${(matchTicks / 6) * 100}%` }}
                    />
                  </div>

                  {/* Quest visuals Card */}
                  <div className="bg-[#120e2b] p-5 rounded-2xl border border-purple-500/10 relative text-center min-h-36 flex flex-col justify-center items-center shadow-xl">
                    <span className="absolute top-2.5 right-3 text-[9px] uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded bg-slate-950 font-black border border-cyan-500/10">
                      {currentQuestionCategory}
                    </span>

                    <h2 className="text-lg sm:text-xl font-black text-white px-2 mt-4 leading-relaxed">
                      {currentQuestionText}
                    </h2>

                    {currentQuestionHint && (
                      <p className="text-[10px] text-purple-300 mt-2 italic px-3">⚠️ تلميح ذكي: {currentQuestionHint}</p>
                    )}
                  </div>
                </div>

                {/* Answer inputs (Check room mode) */}
                <div className="mt-4 space-y-3 flex-1 flex flex-col justify-center">
                  {currentJoinedRoom?.mode === GameMode.Emoji ? (
                    /* EMOJI GUESS MODE: Dynamic written input guess card below emoji */
                    <div className="bg-[#0b071a]/95 p-4 rounded-xl border border-purple-500/10 shadow-lg">
                      <label htmlFor="emojiGuessInputBox" className="block text-right text-[11px] font-black text-cyan-400 mb-2">
                        ⌨️ اكتب تخمينك الذكي باللغة العربية:
                      </label>
                      <input
                        id="emojiGuessInputBox"
                        type="text"
                        dir="rtl"
                        className="w-full bg-slate-950 font-bold border border-slate-700/60 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="اكتب تخمين الإيموجي هنا..."
                        value={emojiGuessInput}
                        disabled={!!selectedAnswer}
                        onChange={(e) => setEmojiGuessInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (emojiGuessInput.trim()) {
                              handleSubmitAnswerAction(emojiGuessInput);
                            }
                          }
                        }}
                      />
                      
                      <div className="flex items-center justify-between mt-3 text-[9.5px] text-slate-400">
                        <span>💡 اضغط Enter للإرسال السريع</span>
                        <span className="text-rose-400 font-extrabold">* الإرسال لمرة واحدة فقط!</span>
                      </div>

                      {/* Explicit Submit button */}
                      <button
                        onClick={() => {
                          if (emojiGuessInput.trim()) {
                            handleSubmitAnswerAction(emojiGuessInput);
                          }
                        }}
                        disabled={!!selectedAnswer || !emojiGuessInput.trim()}
                        className={`w-full mt-3 py-2 px-4 rounded-lg text-xs font-black transition-all active:scale-95 duration-150 ${
                          selectedAnswer
                            ? "bg-purple-900/30 text-purple-400 border border-purple-500/15 cursor-not-allowed"
                            : emojiGuessInput.trim()
                              ? "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-md shadow-cyan-500/20 cursor-pointer"
                              : "bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed"
                        }`}
                      >
                        {selectedAnswer ? "تم إرسال الإجابة بنجاح ✅" : "إرسال الإجابة والمتابعة 🚀"}
                      </button>
                    </div>
                  ) : (
                    /* TRIVIA QUIZ MODE: Choice buttons */
                    <div className="space-y-2">
                      {currentQuestionOptions.map((opt) => {
                        const isChoiceChosen = selectedAnswer === opt;
                        return (
                          <button
                            key={opt}
                            disabled={!!selectedAnswer}
                            onClick={() => handleSubmitAnswerAction(opt)}
                            className={`w-full p-3.5 rounded-xl text-right text-xs font-bold border transition-all ${
                              isChoiceChosen
                                ? "bg-purple-600 border-purple-400 text-white shadow-lg"
                                : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAIN VIEWS CONTROLLER */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {activeTab === "lobby" && (
            <div className="space-y-4">
              
              {/* Home top decorative news banners */}
              <div className="p-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 rounded-2xl border border-purple-500/10 shadow-xl flex items-center justify-between">
                <div>
                  <span className="bg-amber-400 text-slate-950 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded font-sans">بطولات نشطة</span>
                  <h3 className="text-xs font-extrabold text-white mt-1.5">كأس الأذكياء الأسبوعي</h3>
                  <p className="text-[10px] text-purple-300 mt-1 leading-normal">تبقت 4 أيام للاشتراك بالصدارة! يتم تصفية وتحكيم المنافسة تلقائياً بنظام خروج المغلوب اليدوي.</p>
                </div>
                
                <span className="text-3xl animate-bounce shrink-0 mr-2 select-none">🏆</span>
              </div>

              {/* Connect counter stats */}
              <div className="flex justify-between items-center bg-slate-900/30 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                <span className="text-slate-400 flex items-center space-x-1.5 space-x-reverse">
                  <USERS_ONLINE_DOT />
                  <span>عدد اللاعبين الحاضرين بخوادمنا:</span>
                </span>
                <span className="font-mono font-black text-amber-400">{onlineCount} لاعب متصل</span>
              </div>

              {/* Play modes launchers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-gradient-to-b from-[#130d2f] to-[#0c081e] rounded-2xl border border-purple-500/15 text-center shadow-md relative">
                  <Gamepad2 className="w-7 h-7 text-amber-300 mx-auto mb-2 animate-float" />
                  <h4 className="text-xs font-black text-slate-100 mb-0.5">تحدي خيارات</h4>
                  <p className="text-[9px] text-slate-400">ثقافة عامة ومسابقات إسلامية وعلوية</p>
                  
                  <div className="flex space-x-1.5 space-x-reverse mt-3">
                    <button
                      onClick={() => handleCreateRoomAction("1v1", GameMode.Trivia)}
                      className="flex-1 bg-purple-600 text-[10px] font-bold py-1 rounded hover:bg-purple-700 active:scale-95 transition-transform"
                    >
                      1 ضد 1
                    </button>
                    <button
                      onClick={() => handleCreateRoomAction("2v2", GameMode.Trivia)}
                      className="flex-1 bg-indigo-600 text-[10px] font-bold py-1 rounded hover:bg-indigo-700 active:scale-95 transition-transform"
                    >
                      2 ضد 2
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-gradient-to-b from-[#130d2f] to-[#0c081e] rounded-2xl border border-cyan-500/15 text-center shadow-md relative">
                  <Brain className="w-7 h-7 text-cyan-300 mx-auto mb-2 animate-float" />
                  <h4 className="text-xs font-black text-slate-100 mb-0.5">تخمين الإيموجي</h4>
                  <p className="text-[9px] text-slate-400">ألغاز ورموز ذكية مذهلة وصور معبرة</p>

                  <div className="flex space-x-1.5 space-x-reverse mt-3">
                    <button
                      onClick={() => handleCreateRoomAction("1v1", GameMode.Emoji)}
                      className="flex-1 bg-cyan-600 text-[10px] font-bold py-1 rounded hover:bg-cyan-750 active:scale-95 transition-transform"
                    >
                      1 ضد 1
                    </button>
                    <button
                      onClick={() => handleCreateRoomAction("2v2", GameMode.Emoji)}
                      className="flex-1 bg-indigo-600 text-[10px] font-bold py-1 rounded hover:bg-indigo-700 active:scale-95 transition-transform"
                    >
                      2 ضد 2
                    </button>
                  </div>
                </div>
              </div>

              {/* Decorative Arabic Quote of the Day to enrich simplified Lobby aesthetics */}
              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 text-center select-none">
                <p className="text-[10px] text-purple-300 italic">"العِلْمُ صَيْدٌ وَالْكِتَابَةُ قَيْدُهُ، قَيِّدْ صُيُودَكَ بِالْحِبَالِ الْوَاثِقَةْ"</p>
                <div className="h-[1px] w-12 bg-purple-500/20 mx-auto my-1.5" />
                <span className="text-[8px] text-slate-500 font-bold block">مملكة الأذكياء للثقافة العربية</span>
              </div>

            </div>
          )}

          {activeTab === "rooms" && (
            <div className="space-y-4">
              {currentJoinedRoom ? (
                // Inside custom created room waiting for players
                <div className="p-4 bg-[#100c25] rounded-2xl border border-purple-500/10 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">{currentJoinedRoom.name}</h3>
                      <p className="text-[10px] text-purple-300 mt-0.5">
                        النمط: {currentJoinedRoom.mode === GameMode.Trivia ? "مسابقات الحكمة" : "تخمين الإيموجي"}
                      </p>
                    </div>

                    <button
                      onClick={handleLeaveCurrentRoom}
                      className="text-xs bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/20 text-rose-300 px-3 py-1.5 rounded-lg"
                    >
                      مغادرة الغرفة
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 block mb-1">المتنافسون الحاضرون ({currentJoinedRoom.players.length} / {currentJoinedRoom.maxPlayers})</div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Active host players */}
                      {currentJoinedRoom.players.map((pId) => {
                        const guestPl = playersList.find((p) => p.id === pId) || me;
                        return (
                          <div key={pId} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center flex flex-col items-center">
                            <span className="text-2xl mb-1">{guestPl.avatar}</span>
                            <span className="text-xs font-bold text-white max-w-full truncate">{guestPl.username}</span>
                            <span className="text-[9px] text-slate-400">Lvl {guestPl.level}</span>
                            
                            <div className="flex space-x-1.5 space-x-reverse mt-2">
                              {/* Option to view details or add target friend relation */}
                              <button
                                onClick={() => setSelectedUserCard(guestPl)}
                                className="text-[8px] text-purple-300 hover:underline"
                              >
                                بطاقة اللاعب
                              </button>
                              
                              {guestPl.id !== me.id && (
                                <button
                                  onClick={() => handleFileReport(guestPl)}
                                  className="text-[8px] text-rose-400 hover:underline flex items-center space-x-0.5 space-x-reverse"
                                >
                                  <Flag className="w-2.5 h-2.5" />
                                  <span>إبلاغ</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Seat placeholders filler */}
                      {Array.from({ length: currentJoinedRoom.maxPlayers - currentJoinedRoom.players.length }).map((_, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border border-dashed border-slate-800/80 text-center flex flex-col items-center justify-center bg-slate-900/10 h-24">
                          <span className="text-lg text-slate-500">⏳</span>
                          <span className="text-[10px] text-slate-500 mt-1">بانتظار منافس...</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Online roster to invite */}
                  <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs text-purple-300 font-bold">
                        <span>دعوة زملاء للالتحاق بساحتك:</span>
                      </h4>
                      <div className="flex bg-slate-900 p-0.5 rounded-lg border border-purple-500/10">
                        <button
                          onClick={() => setInviteTabFilter("friends")}
                          className={`text-[9px] px-2.5 py-1 rounded-md font-bold transition-all ${
                            inviteTabFilter === "friends" 
                              ? "bg-purple-600 text-white" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          🌐 الأصدقاء ({playersList.filter(op => op.id !== me?.id && op.username !== "المشرف العام" && op.role !== "admin" && op.id !== "admin_user" && op.email?.toLowerCase() !== "ahmedfox@gmail.com" && !op.isBanned && me?.friends?.includes(op.id)).length})
                        </button>
                        <button
                          onClick={() => setInviteTabFilter("all")}
                          className={`text-[9px] px-2.5 py-1 rounded-md font-bold transition-all ${
                            inviteTabFilter === "all" 
                              ? "bg-purple-600 text-white" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          الكل ({playersList.filter(op => op.id !== me?.id && op.username !== "المشرف العام" && op.role !== "admin" && op.id !== "admin_user" && op.email?.toLowerCase() !== "ahmedfox@gmail.com" && !op.isBanned).length})
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {(() => {
                        const filtered = playersList.filter((op) => {
                          // Basic exclusion rules
                          if (!op.id || !me) return false;
                          if (op.id === me.id) return false;
                          if (op.username === "المشرف العام" || op.id === "admin_user" || op.role === "admin" || op.email?.toLowerCase() === "ahmedfox@gmail.com") return false;
                          if (op.isBanned) return false;

                          // Tab specific rule
                          if (inviteTabFilter === "friends") {
                            return me.friends?.includes(op.id);
                          }
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <p className="text-[10px] text-slate-500 text-center py-4">
                              {inviteTabFilter === "friends" ? "لا يوجد أصدقاء متصلين حالياً." : "لا يوجد لاعبون متاحون حالياً."}
                            </p>
                          );
                        }

                        return filtered.map((op) => (
                          <div key={op.id} className="flex justify-between items-center p-2 bg-slate-950 rounded-lg border border-slate-900">
                            <div className="flex items-center space-x-1.5 space-x-reverse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[11px] text-slate-300 font-bold">{op.username} (Lvl {op.level})</span>
                            </div>
                            <button
                              onClick={() => handleInvitePlayerToRoom(op.id)}
                              className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-[9px] font-bold px-2.5 py-1 rounded transition-all"
                            >
                              + إرسال دعوة
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                // Lobbies browser page list
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-cyan-400">تصفح وقائمة غرف التحدي الحية</h3>
                    <div className="flex space-x-1.5 space-x-reverse">
                      <button
                        onClick={() => handleCreateRoomAction("1v1", GameMode.Trivia)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-2.5 py-1 rounded"
                      >
                        + تأسيس 1v1
                      </button>
                      <button
                        onClick={() => handleCreateRoomAction("2v2", GameMode.Trivia)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-1 rounded"
                      >
                        + تأسيس 2v2
                      </button>
                    </div>
                  </div>

                  {activeRooms.length === 0 ? (
                    <div className="p-8 text-center bg-[#100c25] rounded-2xl border border-purple-500/10">
                      <span className="text-2xl mb-1 text-slate-400 block">🏰</span>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        لا توجد مجالس انتظار عامة حالياً. أسس مساحتك الخاصة وادعُ المعارضين لمبارزتك!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {activeRooms.map((rm) => (
                        <div key={rm.id} className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <span className="text-xs font-extrabold text-white">{rm.name}</span>
                              <span className={`text-[8px] font-sans px-1 rounded ${
                                rm.mode === GameMode.Trivia ? "bg-purple-950 text-purple-400" : "bg-cyan-950 text-cyan-400"
                              }`}>
                                {rm.mode === GameMode.Trivia ? "خيار" : "إيموجي"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-sans">
                              اللاعبين: {rm.players.length} / {rm.maxPlayers} • نوع المعركة: {rm.type}
                            </p>
                          </div>

                          <button
                            onClick={() => handleJoinExistRoom(rm.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                          >
                            انضمام
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "guilds" && (
            <GuildSystem
              player={me}
              onGuildUpdate={(updatedPlayer, updatedGuilds) => {
                setMe(updatedPlayer);
                setGuildsList(updatedGuilds);
              }}
              guildsList={guildsList}
              playersList={playersList}
              onShowAnnouncement={(text) => setAnnouncement(text)}
              initialSelectedGuildId={guildViewId || undefined}
              onClearInitialSelectedGuild={() => setGuildViewId(null)}
            />
          )}

          {activeTab === "leaderboard" && (
            <div className="space-y-4">
              {/* Podium View for Top 3 Players */}
              <div className="bg-[#100c25] rounded-2xl border border-purple-500/15 p-4 shadow-xl">
                <div className="border-b border-slate-900 pb-2 mb-4 text-center">
                  <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-black">الموسم النشط: صراع الأذكياء الدوري</span>
                  <h3 className="text-sm font-extrabold text-white mt-1.5 flex items-center justify-center space-x-1.5 space-x-reverse">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span>مجد العباقرة الأسبوعي</span>
                  </h3>
                </div>

                {/* 3D Visual Podium */}
                {(() => {
                  const uniqueMap: Record<string, Player> = {};
                  playersList.forEach(p => {
                    if (p.id) uniqueMap[p.id] = p;
                  });
                  if (me && me.id) {
                    uniqueMap[me.id] = me;
                  }

                  const sorted = Object.values(uniqueMap)
                    .filter((p): p is Player => !!p)
                    .filter(p => p.email?.toLowerCase() !== "ahmedfox@gmail.com" && p.role !== "admin" && p.id !== "admin_user")
                    .filter(p => !p.email?.includes("dummy") && !p.email?.includes("bot") && p.username !== "المشرف العام")
                    .sort((a, b) => b.wins - a.wins);

                  const first = sorted[0];
                  const second = sorted[1];
                  const third = sorted[2];

                  if (!first) {
                     return (
                       <p className="text-xs text-slate-500 text-center py-6">لا توجد سجلات لاعبين حقيقية للمنافسة حالياً.</p>
                     );
                  }

                  return (
                    <div className="space-y-6">
                      <div className="flex items-end justify-center space-x-2.5 space-x-reverse pt-4 pb-2 select-none max-w-sm mx-auto">
                        {/* 2nd Place */}
                        {second ? (
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-3xl mb-1">{second.avatar}</span>
                            <span className="text-xs font-black text-slate-200 truncate max-w-[85px]">{second.username}</span>
                            <span className="text-[11px] text-amber-500 font-bold block mt-0.5">{second.wins} فوز</span>
                            <div className="w-full bg-slate-800/90 border border-slate-700/60 rounded-t-xl h-14 flex flex-col items-center justify-center mt-2 shadow-md">
                              <span className="text-lg">🥈</span>
                              <span className="text-xs text-slate-200 font-black">2</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 opacity-20" />
                        )}

                        {/* 1st Place */}
                        <div className="flex flex-col items-center flex-1 -translate-y-3">
                          <div className="relative">
                            <span className="text-5xl block mb-1 drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]">{first.avatar}</span>
                            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-sm">👑</span>
                          </div>
                          <span className="text-xs font-black text-amber-400 truncate max-w-[95px]">{first.username}</span>
                          <span className="text-[11px] text-amber-300 font-black block mt-0.5">{first.wins} فوز</span>
                          <div className="w-full bg-gradient-to-t from-purple-950 via-purple-900/60 to-amber-550/20 border-2 border-amber-400 rounded-t-xl h-20 flex flex-col items-center justify-center mt-2.5 shadow-[0_0_18px_rgba(234,179,8,0.25)]">
                            <span className="text-2xl">🥇</span>
                            <span className="text-xs text-amber-355 font-black text-amber-300">البطل</span>
                          </div>
                        </div>

                        {/* 3rd Place */}
                        {third ? (
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-3xl mb-1">{third.avatar}</span>
                            <span className="text-xs font-black text-slate-200 truncate max-w-[85px]">{third.username}</span>
                            <span className="text-[11px] text-amber-500 font-bold block mt-0.5">{third.wins} فوز</span>
                            <div className="w-full bg-slate-800/90 border border-slate-700/60 rounded-t-xl h-10 flex flex-col items-center justify-center mt-2 shadow-md">
                              <span className="text-base">🥉</span>
                              <span className="text-xs text-slate-300 font-black">3</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 opacity-20" />
                        )}
                      </div>

                      {/* Rest of Players Row Lists */}
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {sorted.slice(3).map((item, idx) => (
                          <div key={item.id} className="p-2.5 rounded-xl bg-slate-950/55 border border-slate-900 flex items-center justify-between text-xs hover:border-purple-500/20 transition-all">
                            <div className="flex items-center space-x-2.5 space-x-reverse">
                              <span className="text-[11px] text-slate-500 font-mono font-bold">#{idx + 4}</span>
                              <span className="text-lg">{item.avatar}</span>
                              <div>
                                <span className={`font-extrabold ${item.nameColor || "text-slate-200"}`}>{item.username}</span>
                                <span className="text-[9px] text-slate-400 block font-sans mt-0.5">مستوى {item.level} • {item.title || "حكيم معاصر"}</span>
                              </div>
                            </div>
                            <div className="text-left font-bold">
                              <span className="font-mono text-xs font-black text-amber-400">{item.wins}</span>
                              <span className="text-[8.5px] text-slate-500 block">فوز</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* TOP 3 GUILDS STATS PANEL (AS REQUESTED) */}
              <div className="bg-[#100c25] rounded-2xl border border-purple-500/15 p-4 shadow-xl">
                <div className="border-b border-slate-900 pb-1.5 mb-2.5">
                  <h4 className="text-xs font-black text-amber-400 flex items-center space-x-1 space-x-reverse">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>أقوى ثلاثة تحالفات ونقابات بالمملكة</span>
                  </h4>
                </div>

                {guildsList.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-4 bg-slate-950/40 rounded-xl">
                    لا توجد نقابات مؤسسة حالياً، سارع بتأسيس تحالفك وتصدر صدارة الترتيب!
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {guildsList
                      .sort((a, b) => b.totalPoints - a.totalPoints)
                      .slice(0, 3)
                      .map((g, idx) => (
                        <div 
                          key={g.id} 
                          onClick={() => {
                            sounds.playClick();
                            setGuildViewId(g.id);
                            setActiveTab("guilds");
                          }}
                          className="p-2.5 rounded-xl bg-slate-950/60 border border-purple-500/5 flex items-center justify-between text-xs cursor-pointer hover:bg-purple-950/20 hover:border-purple-500/25 transition-all group duration-200"
                          title="انقر لعرض تفاصيل ومواصفات النقابة بالكامل"
                        >
                          <div className="flex items-center space-x-2.5 space-x-reverse">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                              idx === 0 ? "bg-amber-400 text-slate-950" :
                              idx === 1 ? "bg-slate-300 text-slate-900" : "bg-amber-700 text-white"
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-xl">{g.avatar}</span>
                            <div>
                              <span className="text-white font-extrabold">{g.name}</span>
                              <span className="text-[8px] text-slate-400 block">شعار المعركة: {g.badge} • الأعضاء: {g.membersCount}</span>
                            </div>
                          </div>
                          
                          <div className="text-left">
                            <span className="text-amber-400 font-mono font-bold">{g.totalPoints}</span>
                            <span className="text-[8px] text-slate-500 block">نقطة</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "achievements" && (
            <div className="bg-[#100c25] rounded-2xl border border-purple-500/15 p-4 shadow-xl space-y-4">
              {/* Reset explanation banner */}
              <div className="bg-gradient-to-r from-purple-950/50 to-slate-900/50 border border-purple-500/10 p-3 rounded-xl flex items-center justify-between text-right" dir="rtl">
                <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                  🔄 <span className="font-bold text-purple-300">تنبيه المهام:</span> تُجدّد المهام والجوائز اليومية تلقائياً كل <span className="text-amber-400 font-extrabold">24 ساعة</span> لمواصلة التحدي والحصول على المزيد من الذهب والخبرة!
                </p>
                <div className="text-left shrink-0 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-purple-500/20">
                  <span className="text-[8px] text-slate-400 block font-bold leading-none mb-1">المتبقي للتجديد</span>
                  <span className="text-xs font-mono font-black text-amber-400 leading-none">{timeToMissionsReset}</span>
                </div>
              </div>

              <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-bold text-purple-400 bg-purple-950/60 border border-purple-500/20 px-2 py-0.5 rounded uppercase">تجديد تلقائي مستمر</span>
                  <h3 className="text-sm font-extrabold text-white mt-1 flex items-center space-x-1.5 space-x-reverse">
                    <Sparkles className="w-4.5 h-4.5 text-amber-400 animate-spin" />
                    <span>⭐ لوحة المهام وجوائز النشاط اليومية</span>
                  </h3>
                </div>
                
                {/* CLAIM ALL BUTTON */}
                {(() => {
                  const claimed = me?.missionsClaimed || [];
                  const missionsList = [
                    { id: "m_play_1", threshold: 1, current: Math.min(1, me?.matchesPlayed || 0) },
                    { id: "m_win_3", threshold: 3, current: Math.min(3, me?.wins || 0) },
                    { id: "m_answers_20", threshold: 20, current: Math.min(20, (me?.matchesPlayed || 0) * 4) },
                    { id: "m_guild_join", threshold: 1, current: me?.guildId ? 1 : 0 }
                  ];
                  const hasEligible = missionsList.some(m => m.current >= m.threshold && !claimed.includes(m.id));

                  return (
                    <button
                      onClick={handleClaimAllMissions}
                      disabled={!hasEligible}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${
                        hasEligible 
                          ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 animate-pulse cursor-pointer shadow-[0_0_12px_rgba(251,191,36,0.4)]" 
                          : "bg-slate-900 text-slate-500 cursor-not-allowed border border-slate-800/60"
                      }`}
                    >
                      🎁 استلام الكل
                    </button>
                  );
                })()}
              </div>

              {/* Dynamic list rendering of 4 Arabic missions with authentic claiming states */}
              {(() => {
                const missions = [
                  {
                    id: "m_play_1",
                    title: "الخوض في معركة واحدة",
                    desc: "العب أي مباراة 1vs1 أو 2vs2 من ساحات المعارك",
                    rewardText: "+50 ذهبة / +20 خبرة",
                    threshold: 1,
                    current: Math.min(1, me?.matchesPlayed || 0)
                  },
                  {
                    id: "m_win_3",
                    title: "صدارة وبطل متوج",
                    desc: "حقق الفوز في ٣ مباريات لتثبت كفائتك",
                    rewardText: "+200 ذهبة / +50 خبرة / +5 جواهر",
                    threshold: 3,
                    current: Math.min(3, me?.wins || 0)
                  },
                  {
                    id: "m_answers_20",
                    title: "مثاقفة العقول العربية",
                    desc: "أجب على ٢٠ سؤال ثقافة عامة أو ألغاز تارة صحيحة وتارة خاطئة",
                    rewardText: "+100 ذهبة / +30 خبرة",
                    threshold: 20,
                    current: Math.min(20, (me?.matchesPlayed || 0) * 4)
                  },
                  {
                    id: "m_guild_join",
                    title: "الاعتصام بالتحالف",
                    desc: "انضم أو أسس نقابة لتصاريح النفوذ الملكي المشترك",
                    rewardText: "+100 ذهبة / +5 جواهر",
                    threshold: 1,
                    current: me?.guildId ? 1 : 0
                  }
                ];

                return (
                  <div className="space-y-2.5">
                    {missions.map((m) => {
                      const isClaimed = me?.missionsClaimed?.includes(m.id);
                      const canClaim = m.current >= m.threshold && !isClaimed;

                      return (
                        <div key={m.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-900/80 flex flex-col space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-xs font-black text-slate-100 flex items-center space-x-1.5 space-x-reverse">
                                <span>{m.title}</span>
                                <span className="text-[8px] px-1.5 bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 rounded font-sans">
                                  {m.rewardText}
                                </span>
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-1 leading-snug">{m.desc}</p>
                            </div>

                            {isClaimed ? (
                              <span className="text-[9px] bg-slate-900 text-slate-500 font-bold px-2 py-1 rounded">تم الاستلام ✓</span>
                            ) : canClaim ? (
                              <button
                                onClick={() => handleClaimMission(m.id)}
                                className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-md transition-transform active:scale-95 shadow-[0_0_8px_rgba(234,179,8,0.3)] shrink-0"
                              >
                                استلام الهدية 🎁
                              </button>
                            ) : (
                              <button
                                disabled
                                className="bg-slate-900 text-slate-500 text-[10px] px-2.5 py-1 rounded-md cursor-not-allowed shrink-0"
                              >
                                غير مكتملة
                              </button>
                            )}
                          </div>

                          {/* Progress indicators in Missions */}
                          <div className="flex items-center space-x-2 space-x-reverse pt-1">
                            <span className="text-[9px] font-mono text-cyan-400 font-bold">{m.current}/{m.threshold}</span>
                            <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 transition-all duration-500"
                                style={{ width: `${Math.min(100, (m.current / m.threshold) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* DEDICATED ADVANCED REAL-TIME CHAT TAB VIEW (AS REQUESTED) */}
          {activeTab === "chat" && (
            <div className="bg-[#100c25] rounded-2xl border border-purple-500/15 p-4 shadow-xl flex flex-col h-[600px] relative">
              <div className="flex items-center justify-between pb-2 border-b border-slate-900 mb-3 select-none shrink-0">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="text-xs font-black text-white">الملتقى العام والرسائل الخاصة</h3>
                    <p className="text-[9px] text-slate-400">تواصل مباشر وتبادل الخبرات بين نوابغ العباقرة</p>
                  </div>
                </div>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded-full font-black animate-pulse">● متصل الآن</span>
              </div>

              {/* Chat sub-tabs header bars */}
              <div className="flex space-x-1 space-x-reverse p-1 rounded-xl bg-slate-950/80 border border-slate-900/60 mb-3 select-none shrink-0" dir="rtl">
                <button
                  onClick={() => { sounds.playClick(); setActiveChatTab("general"); }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    activeChatTab === "general"
                      ? "text-amber-400 bg-purple-950/50 shadow-inner"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🌍 الدردشة العامة
                </button>
                <button
                  onClick={() => { sounds.playClick(); setActiveChatTab("guild"); }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    activeChatTab === "guild"
                      ? "text-amber-400 bg-purple-950/50 shadow-inner"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🏰 دردشة النقابة
                </button>
                <button
                  onClick={() => { sounds.playClick(); setActiveChatTab("dm"); }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center space-x-1 space-x-reverse ${
                    activeChatTab === "dm"
                      ? "text-amber-400 bg-purple-950/50 shadow-inner"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>💬 الرسائل الخاصة</span>
                  {privateChatsList.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
                    <span className="bg-rose-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-mono font-black animate-pulse leading-none">
                      {privateChatsList.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB CONTENT: GENERAL GLOBAL CHAT */}
              {activeChatTab === "general" && (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {/* Chat conversations window scrollboard */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 pb-2 text-[11px] min-h-0">
                    {chatMessages.length === 0 ? (
                      <div className="text-slate-500 text-center py-24 select-none">لا توجد رسائل عامة حالياً، قل مرحباً للاعبين! 👋</div>
                    ) : (
                      chatMessages.map((msg) => {
                        if (msg.isSystem) {
                          // Render Gorgeous Room Challenge Invitation Card inside Chat Stream
                          return (
                            <div
                              key={msg.id}
                              id={`msg_bubble_${msg.id}`}
                              className={`p-3 rounded-2xl bg-gradient-to-tr from-[#16113c] to-[#12092c] border border-purple-500/15 relative shadow-md select-none my-2 transition-all duration-300 ${
                                highlightedMessageId === msg.id ? "ring-2 ring-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.4)]" : ""
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 space-x-reverse mb-2" dir="rtl">
                                <span
                                  onClick={() => {
                                    const matched = playersList.find(p => p.id === msg.senderId) || (msg.senderId === me?.id ? me : null);
                                    if (matched) setSelectedUserCard(matched);
                                  }}
                                  className="text-base cursor-pointer hover:scale-110 active:scale-95 select-none transition-transform"
                                >
                                  {msg.senderAvatar || "👤"}
                                </span>
                                <div className="text-right">
                                  <span className="text-[10px] font-black text-amber-300">{msg.senderName}</span>
                                  <span className="text-[7.5px] text-slate-400 block -mt-1">مستضيف تـحدّي الأذكياء</span>
                                </div>
                                <span className="text-[8px] text-slate-500 font-mono tracking-tighter mr-auto">
                                  {new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                                </span>
                              </div>

                              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-900/60 mb-2" dir="rtl">
                                <p className="text-[10px] text-slate-200 font-extrabold mb-1">{msg.message}</p>
                                <div className="flex flex-wrap gap-1.5 text-[8px] font-bold">
                                  <span className="bg-purple-950/50 text-purple-300 border border-purple-500/10 px-2 py-0.5 rounded-full uppercase">
                                    نمط: {msg.roomType === "1v1" ? "1 ضد 1" : "2 ضد 2"}
                                  </span>
                                  <span className="bg-blue-950/50 text-blue-300 border border-blue-500/10 px-2 py-0.5 rounded-full">
                                    الطور: {msg.roomMode === "emoji" ? "خمّن الإيموجي" : "أسئلة عامة (تريفيّا)"}
                                  </span>
                                  {msg.roomStatus === "playing" ? (
                                    <span className="bg-amber-950/50 text-amber-300 border border-amber-500/10 px-2 py-0.5 rounded-full flex items-center space-x-0.5 space-x-reverse">
                                      <span className="w-1 h-1 bg-amber-400 rounded-full animate-ping" />
                                      <span>بدأت المعركة ⚔️</span>
                                    </span>
                                  ) : msg.roomStatus === "finished" ? (
                                    <span className="bg-slate-900/70 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full">
                                      انتهت االمباراة 🎯
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-950/50 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded-full flex items-center space-x-0.5 space-x-reverse">
                                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                                      <span>متاح للانضمام 🟢</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {msg.roomStatus !== "playing" && msg.roomStatus !== "finished" && (
                                <button
                                  onClick={() => {
                                    sounds.playClick();
                                    if (msg.roomId) handleJoinExistRoom(msg.roomId);
                                  }}
                                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-[9.5px] py-1.5 rounded-xl transition-all active:scale-95 shadow-md shadow-amber-500/10"
                                >
                                  انضمام مبكر للمعرکة الفورية ⚡
                                </button>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            id={`msg_bubble_${msg.id}`}
                            className={`p-2.5 rounded-xl border relative transition-all duration-300 ${
                              highlightedMessageId === msg.id
                                ? "ring-2 ring-amber-400 bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                                : "bg-slate-950/50 border-slate-900/60 hover:bg-slate-950/80"
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 space-x-reverse mb-1" dir="rtl">
                              <span
                                onClick={() => {
                                  const matched = playersList.find(p => p.id === msg.senderId) || (msg.senderId === me?.id ? me : null);
                                  if (matched) setSelectedUserCard(matched);
                                }}
                                className="text-base cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                                title="عرض الهوية للاعب"
                              >
                                {msg.senderAvatar || "👤"}
                              </span>
                              <span
                                onClick={() => {
                                  const matched = playersList.find(p => p.id === msg.senderId) || (msg.senderId === me?.id ? me : null);
                                  if (matched) setSelectedUserCard(matched);
                                }}
                                className={`font-black cursor-pointer hover:underline ${msg.senderColor || "text-purple-300"}`}
                              >
                                {msg.senderName}
                              </span>
                              {msg.senderTitle && (
                                <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 px-1 rounded truncate max-w-[80px]">
                                  {msg.senderTitle}
                                </span>
                              )}
                              <span className="text-[8px] text-slate-500 font-mono tracking-tighter mr-auto">
                                {new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-slate-300 leading-relaxed break-all pr-1 text-right" dir="rtl">{msg.message}</p>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Autocomplete Dynamic Suggest box */}
                  {showMentionsDropdown && (
                    <div className="absolute left-0 right-0 bottom-[48px] bg-[#110d2c] border border-purple-500/25 rounded-xl shadow-2xl p-1.5 z-40 max-h-32 overflow-y-auto text-right text-xs" dir="rtl">
                      <div className="text-[8.5px] text-slate-400 px-2 pb-1.5 border-b border-slate-900 mb-1 select-none font-bold">مناداة المنصة وسرّ اللعبة (@):</div>
                      {(() => {
                        const possibleOptions = playersList.filter(p => 
                          p.id !== me?.id && 
                          p.username.toLowerCase().includes(mentionsDropdownFilter.toLowerCase())
                        );
                        
                        if (possibleOptions.length === 0) {
                          return <p className="text-[10px] text-slate-500 text-center py-2">لا يوجد لاعب مطابق للبحث</p>;
                        }
                        
                        return possibleOptions.map((opt) => (
                          <div
                            key={opt.id}
                            onClick={() => appendMentionToInput(opt.username)}
                            className="flex items-center space-x-2 space-x-reverse p-1.5 rounded-lg hover:bg-purple-950/40 cursor-pointer transition-colors"
                          >
                            <span className="text-sm shrink-0">{opt.avatar || "👤"}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-extrabold text-slate-200 block truncate">{opt.username}</span>
                              <span className="text-[8.5px] text-slate-500 font-mono">تريفيّا مستوى {opt.level}</span>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Input Submission bar */}
                  <form onSubmit={handleSendChatMessage} className="flex space-x-1.5 space-x-reverse pt-2 border-t border-slate-900 mt-2 shrink-0">
                    <input
                      type="text"
                      required
                      placeholder="اكتب رسالة فصيحة هنا أو منشن أحد أصدقائك بـ @..."
                      maxLength={100}
                      value={chatInput}
                      onChange={(e) => handleChatTextInputChange(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-right"
                      dir="rtl"
                    />
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB CONTENT: GUILD CHAT */}
              {activeChatTab === "guild" && (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {!me.guildId ? (
                    /* Elegant visual representation for independent players */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
                      <span className="text-4xl mb-3 block opacity-60">🛡️</span>
                      <h4 className="text-slate-200 font-bold text-xs mb-1">دردشة النقابة المغلقة</h4>
                      <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed mb-3">
                        أنت لست عضواً في أي نقابة حالياً. سارع بالانضمام لنقابة كبرى أو إنشاء واحدة لتفعيل قنوات المناداة والترابط مع حلفائك.
                      </p>
                      <button
                        onClick={() => { sounds.playClick(); setActiveTab("guilds"); }}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[9px] px-3.5 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-purple-600/15"
                      >
                        استكشاف وتصفح النقابات 🏰
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Guild messages scroll area */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 pb-2 text-[11px] min-h-0">
                        {guildChatMessages.length === 0 ? (
                          <div className="text-slate-500 text-center py-24 select-none">لا توجد رسائل نقابة بعد، أنطق لسانك بالسلام والمبادي! 🛡️</div>
                        ) : (
                          guildChatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              id={`msg_bubble_${msg.id}`}
                              className={`p-2.5 rounded-xl border relative transition-all duration-300 ${
                                highlightedMessageId === msg.id
                                  ? "ring-2 ring-amber-400 bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                                  : "bg-slate-950/50 border-slate-900/60 hover:bg-slate-950/80"
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 space-x-reverse mb-1" dir="rtl">
                                <span
                                  onClick={() => {
                                    const matched = playersList.find(p => p.id === msg.senderId) || (msg.senderId === me?.id ? me : null);
                                    if (matched) setSelectedUserCard(matched);
                                  }}
                                  className="text-base cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                                >
                                  {msg.senderAvatar || "👤"}
                                </span>
                                <span
                                  onClick={() => {
                                    const matched = playersList.find(p => p.id === msg.senderId) || (msg.senderId === me?.id ? me : null);
                                    if (matched) setSelectedUserCard(matched);
                                  }}
                                  className={`font-black cursor-pointer hover:underline ${msg.senderColor || "text-purple-300"}`}
                                >
                                  {msg.senderName}
                                </span>
                                <span className="text-[8px] bg-[#1a1410] border border-amber-500/15 text-amber-400 px-1 rounded">🛡️ حليف</span>
                                <span className="text-[8px] text-slate-500 font-mono tracking-tighter mr-auto">
                                  {new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-slate-300 leading-relaxed break-all pr-1 text-right" dir="rtl">{msg.message}</p>
                            </div>
                          ))
                        )}
                        <div ref={guildChatBottomRef} />
                      </div>

                      {/* Autocomplete Dynamic Suggest box containing @الكل for guild chat tab */}
                      {showMentionsDropdown && (
                        <div className="absolute left-0 right-0 bottom-[48px] bg-[#110d2c] border border-purple-500/25 rounded-xl shadow-2xl p-1.5 z-40 max-h-32 overflow-y-auto text-right text-xs" dir="rtl">
                          <div className="text-[8.5px] text-slate-400 px-2 pb-1.5 border-b border-slate-900 mb-1 select-none font-bold">مناداة حلفاء النقابة الفورية (@):</div>
                          {(() => {
                            const possibleOptions = [
                              { id: "all_guild", username: "الكل", avatar: "📢", isGeneral: true },
                              ...playersList.filter(p => 
                                p.guildId === me.guildId && 
                                p.id !== me.id && 
                                p.username.toLowerCase().includes(mentionsDropdownFilter.toLowerCase())
                              )
                            ];
                            
                            return possibleOptions.map((opt) => (
                              <div
                                key={opt.id}
                                onClick={() => appendMentionToInput(opt.username)}
                                className="flex items-center space-x-2 space-x-reverse p-1.5 rounded-lg hover:bg-purple-950/40 cursor-pointer transition-colors"
                              >
                                <span className="text-sm shrink-0">{opt.avatar || "👤"}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="font-extrabold text-slate-200 block truncate">{opt.username}</span>
                                  {"level" in opt ? (
                                    <span className="text-[8px] text-slate-500 font-mono">عضو بمستوى {opt.level}</span>
                                  ) : (
                                    <span className="text-[8px] text-slate-400">إشارة مناداة عامة بالتحالف</span>
                                  )}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}

                      {/* Submission form */}
                      <form onSubmit={handleSendChatMessage} className="flex space-x-1.5 space-x-reverse pt-2 border-t border-slate-900 mt-2 shrink-0">
                        <input
                          type="text"
                          required
                          placeholder="اكتب رسالة نقابة مغلقة، استعمل @الكل للتعبئة الكلية..."
                          maxLength={100}
                          value={chatInput}
                          onChange={(e) => handleChatTextInputChange(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-right"
                          dir="rtl"
                        />
                        <button
                          type="submit"
                          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: PRIVATE DIRECT MESSAGES */}
              {activeChatTab === "dm" && (
                <div className="flex-1 flex flex-col min-h-0">
                  {!activeDmPartnerId ? (
                    /* Subpart 1: Render List of DM Threads */
                    <div className="flex-1 flex flex-col min-h-0 text-right" dir="rtl">
                      <div className="text-[10px] font-black text-slate-400 mb-2.5 select-none">المراسلات ومحادثات العقول:</div>
                      
                      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
                        {privateChatsList.length === 0 ? (
                          <div className="text-center py-24 select-none text-slate-500 text-[10px]">
                            <p className="mb-1">صفحة الرسائل الخاصة خالية من الخطاب! 💌</p>
                            <p className="text-[8.5px] text-slate-600">لتفعيل محادثة ثنائية، افتح بطاقة أي لاعب واضغط "مراسلة خاصة".</p>
                          </div>
                        ) : (
                          privateChatsList.map((chat) => (
                            <div
                              key={chat.id}
                              onClick={() => {
                                sounds.playClick();
                                setActiveDmPartnerId(chat.id);
                              }}
                              className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-900/80 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] select-none"
                            >
                              <div className="flex items-center space-x-2.5 space-x-reverse min-w-0 flex-1">
                                <span className="text-xl shrink-0">{chat.avatar || "🕵️"}</span>
                                <div className="leading-normal text-right min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5 space-x-reverse">
                                    <span className={`font-black text-xs truncate max-w-[120px] ${chat.color || "text-slate-100"}`}>{chat.username}</span>
                                    <span className="bg-purple-950 text-purple-300 text-[7px] font-mono px-1 rounded">Lvl {chat.level || 1}</span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 truncate mt-0.5">{chat.lastMessage || "بدء محادثة سرية جديدة..."}</p>
                                </div>
                              </div>
                              
                              {/* Unread Message counts */}
                              {chat.unreadCount > 0 && (
                                <span className="bg-rose-600 text-white text-[8px] font-mono px-1.5 py-0.5 rounded-full font-black animate-pulse shrink-0">
                                  {chat.unreadCount} جديدة
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Subpart 2: Render selected conversation string */
                    (() => {
                      const partner = playersList.find(p => p.id === activeDmPartnerId) || {
                        username: "لاعب مستجد",
                        avatar: "🤖",
                        level: 1,
                        nameColor: "text-slate-200"
                      };

                      return (
                        <div className="flex-1 flex flex-col min-h-0 text-right relative" dir="rtl">
                          {/* Thread title and back controller */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900/80 select-none shrink-0">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <button
                                onClick={() => {
                                  sounds.playClick();
                                  setActiveDmPartnerId(null);
                                }}
                                className="p-1 px-2 text-[9.5px] font-bold bg-slate-900 text-slate-300 hover:text-white rounded-lg border border-slate-800"
                              >
                                ← العودة
                              </button>
                              <span className="text-base">{partner.avatar}</span>
                              <div className="leading-none text-right">
                                <span className={`font-black text-xs ${partner.nameColor || "text-slate-100"}`}>{partner.username}</span>
                                <span className="text-[8px] text-slate-500 block">مرتبة العبقرية: Lvl {partner.level}</span>
                              </div>
                            </div>
                            
                            <span className="text-[8px] text-slate-500">حفص خاص محمي ببيئة سرية</span>
                          </div>

                          {/* Private texts board */}
                          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 pb-2 text-[10.5px] min-h-0 flex flex-col">
                            {privateMessages.length === 0 ? (
                              <div className="text-center py-20 text-slate-600 select-none text-[9.5px] my-auto">
                                لا توجد خطابات سابقة بينكما، افتتح حواراً مميزاً لحساب عقول صراع الأذكياء! ⚔️
                              </div>
                            ) : (
                              privateMessages.map((msg) => {
                                const isMe = msg.senderId === me.id;
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex w-full mb-1 ${isMe ? "justify-end" : "justify-start"}`}
                                  >
                                    <div className={`p-2.5 rounded-2xl max-w-[80%] leading-relaxed text-right border relative transition-all duration-300 ${
                                      isMe
                                        ? "bg-purple-950/40 text-purple-200 border-purple-500/20 rounded-tr-none"
                                        : "bg-slate-950/70 text-slate-200 border-slate-900 rounded-tl-none"
                                    }`}>
                                      <p className="break-words font-semibold">{msg.message}</p>
                                      
                                      <div className="flex items-center space-x-1 space-x-reverse justify-end mt-1 text-[7px] text-slate-500 font-mono">
                                        <span>
                                          {new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                                        </span>
                                        {isMe && (
                                          <span className={`font-black tracking-widest ${msg.isRead ? "text-cyan-400" : "text-slate-500"}`}>
                                            {msg.isRead ? "✓✓ مقروءة" : "✓ مرسلة"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            <div ref={dmBottomRef} />
                          </div>

                          {/* Autocomplete dropdown for DM thread specifically */}
                          {showMentionsDropdown && (
                            <div className="absolute left-0 right-0 bottom-[48px] bg-[#110d2c] border border-purple-500/25 rounded-xl shadow-2xl p-1.5 z-40 max-h-32 overflow-y-auto text-right text-xs">
                              <div className="text-[8.5px] text-slate-400 px-2 pb-1.5 border-b border-slate-900 mb-1 select-none font-bold">مناداة الصديق بالمنشن (@):</div>
                              <div
                                onClick={() => appendMentionToInput(partner.username)}
                                className="flex items-center space-x-2 space-x-reverse p-1.5 rounded-lg hover:bg-purple-950/40 cursor-pointer transition-colors"
                              >
                                <span className="text-sm shrink-0">{partner.avatar}</span>
                                <div className="flex-1 min-w-0 text-right">
                                  <span className="font-extrabold text-slate-200 block truncate">{partner.username}</span>
                                  <span className="text-[8px] text-slate-500">تحقق سريع وتعبئة تلقائية</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Chat input form */}
                          <form onSubmit={handleSendPrivateMessage} className="flex space-x-1.5 space-x-reverse pt-2 border-t border-slate-900 mt-2 shrink-0">
                            <input
                              type="text"
                              required
                              placeholder="مراسلة خاصة مع الحليف الفائز..."
                              maxLength={100}
                              value={dmInput}
                              onChange={(e) => handleDmTextInputChange(e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-right"
                              dir="rtl"
                            />
                            <button
                              type="submit"
                              className="bg-indigo-650 hover:bg-indigo-650 text-white p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                            >
                              <Send className="w-4 h-4 text-indigo-400" />
                            </button>
                          </form>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          )}

          {/* STANDALONE SHOP TAB VIEW MOUNT (AS REQUESTED) */}
          {activeTab === "shop" && (
            <ShopCatalog
              player={me as Player}
              onPurchaseSuccess={(upPlayer) => {
                setMe(upPlayer);
              }}
              shopItems={shopItems}
              isTabMode={true}
            />
          )}

          {/* PREMIUM PLAYER PROFILE PAGE (AS REQUESTED) */}
          {activeTab === "profile" && me && (
            <div className="space-y-4">
              
              {/* Profile Card Header Segment */}
              <div className={`rounded-2xl border border-purple-500/15 p-5 shadow-xl relative overflow-hidden flex flex-col items-center text-center transition-all duration-300 ${
                (() => {
                  const bgItem = shopItems.find(item => item.id === me.bgId);
                  return bgItem ? bgItem.assetValue : "bg-[#100c25]";
                })()
              }`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 text-rose-400 flex items-center space-x-1 space-x-reverse transition-all active:scale-95 text-[10px] font-bold"
                  title="تسجيل الخروج من الحساب"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>

                {/* Profile Avatar Frame Container with Dynamic Glow Effects */}
                <div className={`relative mb-3 transition-all ${
                  (() => {
                    const effItem = shopItems.find(item => item.id === me.effectId);
                    return effItem ? effItem.assetValue : "";
                  })()
                }`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-slate-900 text-4xl border-2 shadow-xl ${
                    me.borderId === "border_gold" 
                      ? "border-amber-400" 
                      : me.borderId === "border_neon_purple"
                      ? "border-fuchsia-500"
                      : me.borderId === "border_cyan"
                      ? "border-cyan-400"
                      : "border-purple-500"
                  }`}>
                    {me.avatar}
                  </div>
                  {me.borderId === "border_gold" && (
                    <div className="absolute -inset-1 rounded-full border border-amber-400 animate-pulse pointer-events-none" />
                  )}
                  {me.borderId === "border_neon_purple" && (
                    <div className="absolute -inset-1 rounded-full border border-fuchsia-500 animate-pulse pointer-events-none" />
                  )}
                  {me.borderId === "border_cyan" && (
                    <div className="absolute -inset-1 rounded-full border border-cyan-400 animate-pulse pointer-events-none" />
                  )}
                </div>

                {/* Username Form Edit Wrapper with Equipped Name Color */}
                <div className={me.nameColor || "text-slate-200"}>
                  <UsernameEditForm me={me} setMe={setMe} />
                </div>

                {/* player ID description & Title decorations */}
                <div className="flex items-center space-x-1.5 space-x-reverse text-[10px] text-slate-400 font-mono tracking-tight mt-1 bg-slate-950/70 border border-slate-900/50 px-2 py-0.5 rounded-md">
                  <span>الرقم التعريفي: {me.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(me.id);
                      sounds.playSuccess();
                      alert("تم نسخ الرقم التعريفي بنجاح! 📋");
                    }}
                    className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 rounded transition-colors"
                    title="نسخ الرقم التعريفي"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-center space-x-1.5 space-x-reverse">
                  <span className="bg-purple-950/60 text-purple-300 text-[9px] font-mono border border-purple-500/20 px-2 py-0.5 rounded-full inline-block">
                    {me.title || "عبقري فصيح مستكشف"}
                  </span>
                  {me.guildName && (
                    <span 
                      onClick={() => {
                        sounds.playClick();
                        setGuildViewId(me.guildId);
                        setActiveTab("guilds");
                      }}
                      className="bg-amber-950/60 text-amber-300 text-[9px] font-mono border border-amber-500/20 px-2 py-0.5 rounded-full inline-block cursor-pointer hover:bg-amber-900/60 transition-colors"
                      title="عرض تفاصيل النقابة بالكامل"
                    >
                      🛡️ {me.guildName}
                    </span>
                  )}
                </div>

                {/* Displaying Wallet (Coins and Gems) exclusively in Profile Tab as requested */}
                <div className="mt-3.5 flex items-center justify-center space-x-2 space-x-reverse select-none">
                  <div className="flex items-center space-x-1 space-x-reverse bg-yellow-500/10 text-yellow-300 border border-yellow-500/15 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{me.coins} ذهبة</span>
                  </div>
                  <div className="flex items-center space-x-1 space-x-reverse bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/15 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold">
                    <Gem className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>{me.gems} جوهرة</span>
                  </div>
                </div>

                {/* ACCORDION EXCLUSIVE: Level Progress Bar custom representation */}
                {(() => {
                  const currentLevel = me.level;
                  const minXpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
                  const minXpForNextLevel = Math.pow(currentLevel, 2) * 100;
                  const xpInCurrentLevel = me.xp - minXpForCurrentLevel;
                  const xpRequirementForNextLevel = minXpForNextLevel - minXpForCurrentLevel;
                  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequirementForNextLevel) * 100));

                  return (
                    <div className="w-full mt-4 select-none">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                        <span>المستوى الحالي: {currentLevel}</span>
                        <span>الخبرة: {me.xp} / {minXpForNextLevel} XP</span>
                      </div>
                      
                      {/* Fluid Animated Progress Bar wrapper matches specific request */}
                      <div className="w-full h-3 bg-slate-950 border border-slate-900 rounded-full overflow-hidden shadow-inner p-[1px]">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      
                      <div className="text-[8px] text-slate-500 mt-1 text-center font-bold">
                        الخبرة المطلوبة للارتقاء للمستوى التالي: {minXpForNextLevel - me.xp} XP
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* COSMETICS EQUIPMENT & CUSTOMIZATION STATION */}
              <div className="bg-[#100c25] rounded-2xl border border-purple-500/15 p-4 shadow-xl">
                <div className="border-b border-slate-900 pb-2 mb-3">
                  <h4 className="text-xs font-extrabold text-white flex items-center space-x-1.5 space-x-reverse">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>خزانة الهوية والتخصيص الفكري</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1">
                    قم بتجهيز وتجميل رموز الأفاتار الأساسية والجوائز التجميلية الملتهبة التي تفوز بها أو تشتريها من متجر صراع الأذكياء.
                  </p>
                </div>

                {/* Sub Tab Categories controller list */}
                <div className="flex space-x-1 space-x-reverse p-1 rounded-xl bg-slate-950/70 border border-slate-900/60 mb-4 overflow-x-auto select-none">
                  {[
                    { id: "avatar", label: "الرّمز" },
                    { id: "border", label: "الإطارات" },
                    { id: "title", label: "الألقاب" },
                    { id: "name_color", label: "اللون" },
                    { id: "background", label: "الخلفية" },
                    { id: "effect", label: "المؤثرات" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { sounds.playClick(); setCosmeticTab(tab.id as any); }}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all flex-1 text-center ${
                        cosmeticTab === tab.id
                          ? "bg-purple-600 text-white shadow font-black"
                          : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content renderer dynamically supports item preview/equipping */}
                <div className="min-h-16">
                  {cosmeticTab === "avatar" && (
                    <div className="space-y-4">
                      {/* Standard Normal Avatars row */}
                      <div>
                        <span className="text-[10px] text-purple-400 font-bold block mb-2 text-right">الأفاتارات العادية المجانية:</span>
                        <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto justify-items-center">
                          {FREE_AVATARS.map((emoji) => {
                            const isSelected = me.avatar === emoji;
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleEquipCosmetic({ avatar: emoji })}
                                className={`w-11 h-11 text-2xl flex items-center justify-center rounded-xl transition-all ${
                                  isSelected
                                    ? "bg-purple-600/30 border-2 border-purple-500 scale-110 shadow-lg shadow-purple-500/20"
                                    : "bg-slate-950/60 border border-slate-900 hover:border-purple-500/30"
                                }`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Purchased Avatars row */}
                      <div className="border-t border-slate-900/60 pt-3">
                        <span className="text-[10px] text-amber-400 font-bold block mb-2 text-right">الأفاتارات الخاصة التي اشتريتها من المتجر:</span>
                        {(() => {
                          const ownedAvatars = shopItems.filter(
                            (itm) => itm.type === "avatar" && (me.ownedItems || []).includes(itm.id)
                          );

                          if (ownedAvatars.length === 0) {
                            return (
                              <p className="text-[9px] text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-dashed border-slate-900 text-center">
                                لم تشترِ أي أفاتارات نادرة أو مميزة بعد. توجه لقسم المتجر لشراء أفاتار "فارس الظلام" أو "تاج الملوك".
                              </p>
                            );
                          }

                          return (
                            <div className="grid grid-cols-3 gap-2">
                              {ownedAvatars.map((item) => {
                                const isSelected = me.avatar === item.assetValue;
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => handleEquipCosmetic({ avatar: item.assetValue })}
                                    className={`p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                                      isSelected
                                        ? "bg-amber-500/15 border border-amber-400 scale-105"
                                        : "bg-slate-950/50 border border-slate-900 hover:border-amber-400/30"
                                    }`}
                                  >
                                    <span className="text-3xl mb-1">{item.assetValue}</span>
                                    <span className="text-[8px] text-slate-300 font-bold truncate w-full">{item.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {cosmeticTab === "border" && (
                    <div className="space-y-3">
                      <span className="text-[10px] text-purple-400 font-bold block mb-1 text-right">حدد إطار صورتك الحية:</span>
                      
                      {/* Option to clear borders */}
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => handleEquipCosmetic({ borderId: null })}
                          className={`p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                            !me.borderId
                              ? "bg-purple-600/25 border-2 border-purple-500 font-bold text-white pr-3"
                              : "bg-slate-950/60 border border-slate-900 text-slate-400 hover:border-purple-500/20"
                          }`}
                        >
                          <span>بدون إطار تجميلي (افتراضي)</span>
                          <span className="text-slate-500 text-[9px] pl-2">أبسط مظهر</span>
                        </button>

                        {/* Map bought borders */}
                        {shopItems
                          .filter((itm) => itm.type === "border" && (me.ownedItems || []).includes(itm.id))
                          .map((item) => {
                            const isSelected = me.borderId === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleEquipCosmetic({ borderId: item.id })}
                                className={`p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                                  isSelected
                                    ? "bg-amber-500/15 border-2 border-amber-400 font-bold text-amber-300 pr-3"
                                    : "bg-slate-950/60 border border-slate-900 text-slate-300 hover:border-amber-400/20"
                                }`}
                              >
                                <span>{item.name}</span>
                                <span className="text-[8px] uppercase bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 pl-2">تفعيل</span>
                              </button>
                            );
                        })}
                      </div>

                      {shopItems.filter((itm) => itm.type === "border" && (me.ownedItems || []).includes(itm.id)).length === 0 && (
                        <p className="text-[9px] text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-dashed border-slate-900 text-center">
                          لا تملك أي إطارات إضافية حالياً. يمكنك الذهاب للمتجر لشراء "إطار الكأس الذهبي المتوهج" أو "النيون البنفسجي"!
                        </p>
                      )}
                    </div>
                  )}

                  {cosmeticTab === "title" && (
                    <div className="space-y-3">
                      <span className="text-[10px] text-purple-400 font-bold block text-right">الألقاب والنعوت الفخرية:</span>
                      
                      <div className="space-y-2">
                        {/* Default Title option */}
                        <button
                          onClick={() => handleEquipCosmetic({ title: "عبقري فصيح مستكشف" })}
                          className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                            me.title === "عبقري فصيح مستكشف"
                              ? "bg-purple-600/25 border-2 border-purple-500 font-bold text-white pr-3"
                              : "bg-slate-950/60 border border-slate-900 text-slate-400 hover:border-purple-500/20"
                          }`}
                        >
                          <span>اللقب الافتراضي (عبقري فصيح مستكشف)</span>
                          <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 pl-2">نشط</span>
                        </button>

                        {/* Bought titles */}
                        {shopItems
                          .filter((itm) => itm.type === "title" && (me.ownedItems || []).includes(itm.id))
                          .map((item) => {
                            const isSelected = me.title === item.assetValue;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleEquipCosmetic({ title: item.assetValue })}
                                className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                                  isSelected
                                    ? "bg-amber-500/15 border border-amber-400 font-bold text-amber-300 pr-3"
                                    : "bg-slate-950/60 border border-slate-900 text-slate-200 hover:border-amber-400/20"
                                }`}
                              >
                                <span>{item.name} • اللقب: "{item.assetValue}"</span>
                                <span className="text-[8px] bg-amber-955/20 px-1.5 py-0.5 text-amber-300 rounded pl-2">تفعيل</span>
                              </button>
                            );
                        })}
                      </div>

                      {shopItems.filter((itm) => itm.type === "title" && (me.ownedItems || []).includes(itm.id)).length === 0 && (
                        <p className="text-[9px] text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-dashed border-slate-900 text-center">
                          لا تملك أي ألقاب مستحوذة ومفتوحة للبس. تتوفر ألقاب مثل "فيلسوف العصر" في المتجر بـ 200 مجوهرة!
                        </p>
                      )}
                    </div>
                  )}

                  {cosmeticTab === "name_color" && (
                    <div className="space-y-3">
                      <span className="text-[10px] text-purple-400 font-bold block text-right">ألوان العرض للأذكياء:</span>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {/* Default normal white */}
                        <button
                          onClick={() => handleEquipCosmetic({ nameColor: null })}
                          className={`p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                            !me.nameColor
                              ? "bg-purple-600/25 border-2 border-purple-500 font-bold text-white pr-3"
                              : "bg-slate-950/60 border border-slate-900 text-slate-400 hover:border-purple-500/20"
                          }`}
                        >
                          <span>اللون الأبيض العادي</span>
                          <span className="text-white font-mono pl-2">نشط</span>
                        </button>

                        {/* Bought colors */}
                        {shopItems
                          .filter((itm) => itm.type === "name_color" && (me.ownedItems || []).includes(itm.id))
                          .map((item) => {
                            const isSelected = me.nameColor === item.assetValue;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleEquipCosmetic({ nameColor: item.assetValue })}
                                className={`p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                                  isSelected
                                    ? "bg-amber-500/15 border border-amber-400 font-bold text-amber-300 pr-3"
                                    : "bg-slate-950/60 border border-slate-900 text-slate-200 hover:border-amber-400/20"
                                }`}
                              >
                                <span className={item.assetValue}>{item.name}</span>
                                <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 text-slate-400 rounded pl-2">تطبيق</span>
                              </button>
                            );
                        })}
                      </div>

                      {shopItems.filter((itm) => itm.type === "name_color" && (me.ownedItems || []).includes(itm.id)).length === 0 && (
                        <p className="text-[9px] text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-dashed border-slate-900 text-center">
                          تدرجات الألوان الفاخرة للاسم متاحة حصرياً في المتجر، اذهب لشراء "لون اسم مذهب" أو "بنفسجي متوهج".
                        </p>
                      )}
                    </div>
                  )}

                  {cosmeticTab === "background" && (
                    <div className="space-y-3">
                      <span className="text-[10px] text-purple-400 font-bold block text-right">تجهيز خلفيات ملفك الشخصي:</span>
                      
                      <div className="space-y-2">
                        {/* Default option */}
                        <button
                          onClick={() => handleEquipCosmetic({ bgId: null })}
                          className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                            !me.bgId
                              ? "bg-purple-600/25 border-2 border-purple-500 font-bold text-white pr-3"
                              : "bg-slate-950/60 border border-slate-900 text-slate-400 hover:border-purple-500/20"
                          }`}
                        >
                          <span>المظهر الليلي الافتراضي المحكم</span>
                          <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 pl-2">نشط</span>
                        </button>

                        {/* Bought backgrounds */}
                        {shopItems
                          .filter((itm) => itm.type === "background" && (me.ownedItems || []).includes(itm.id))
                          .map((item) => {
                            const isSelected = me.bgId === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleEquipCosmetic({ bgId: item.id })}
                                className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                                  isSelected
                                    ? "bg-amber-500/15 border border-amber-400 font-bold text-amber-300 pr-3"
                                    : "bg-slate-950/60 border border-slate-900 text-slate-200 hover:border-amber-400/20"
                                }`}
                              >
                                <span>{item.name}</span>
                                <span className="text-[8.5px] text-amber-400 font-bold pl-2">تطبيق السمة</span>
                              </button>
                            );
                        })}
                      </div>

                      {shopItems.filter((itm) => itm.type === "background" && (me.ownedItems || []).includes(itm.id)).length === 0 && (
                        <p className="text-[9px] text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-dashed border-slate-900 text-center">
                          احصل على خلفيات استثنائية كخلفية "السديم الفضائي" لتزيين بطاقتك الشخصية فكرياً.
                        </p>
                      )}
                    </div>
                  )}

                  {cosmeticTab === "effect" && (
                    <div className="space-y-3">
                      <span className="text-[10px] text-purple-400 font-bold block text-right">مؤثرات الهالة المشعة حول الأيقونة:</span>
                      
                      <div className="space-y-2">
                        {/* Default none */}
                        <button
                          onClick={() => handleEquipCosmetic({ effectId: null })}
                          className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                            !me.effectId
                              ? "bg-purple-600/25 border-2 border-purple-500 font-bold text-white pr-3"
                              : "bg-slate-950/60 border border-slate-900 text-slate-400 hover:border-purple-500/20"
                          }`}
                        >
                          <span>إلغاء المؤثر النشط (بدون هالة تجميلية)</span>
                          <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 pl-2">نشط</span>
                        </button>

                        {/* Bought effects */}
                        {shopItems
                          .filter((itm) => itm.type === "effect" && (me.ownedItems || []).includes(itm.id))
                          .map((item) => {
                            const isSelected = me.effectId === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleEquipCosmetic({ effectId: item.id })}
                                className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between transition-all text-[10px] ${
                                  isSelected
                                    ? "bg-amber-500/15 border border-amber-400 font-bold text-amber-300 pr-3"
                                    : "bg-slate-950/60 border border-slate-900 text-slate-200 hover:border-amber-400/20"
                                }`}
                              >
                                <span>{item.name}</span>
                                <span className="text-[8px] bg-amber-950/20 px-1.5 py-0.5 text-amber-400 rounded pl-2">تفعيل الهالة</span>
                              </button>
                            );
                        })}
                      </div>

                      {shopItems.filter((itm) => itm.type === "effect" && (me.ownedItems || []).includes(itm.id)).length === 0 && (
                        <p className="text-[9px] text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-dashed border-slate-900 text-center">
                          مؤثرات الهالة والنبض الفتّان مثل "مؤثر البلازما المتفجر" متوفرة للشراء في المتجر.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Analytical Card grids: Victories ratio / Streak */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/35 border border-slate-800/80 p-3 rounded-2xl text-center select-none">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">إحصائية المعارك</span>
                  <div className="flex justify-around items-center mt-2">
                    <div>
                      <div className="text-xs font-black text-emerald-400 font-mono">{me.wins}</div>
                      <div className="text-[8px] text-slate-500 font-bold">فوز</div>
                    </div>
                    <div className="h-5 w-[1px] bg-slate-800" />
                    <div>
                      <div className="text-xs font-black text-rose-400 font-mono">{me.losses}</div>
                      <div className="text-[8px] text-slate-500 font-bold">خسارة</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-2 font-mono">
                    المعدل: {((me.wins / Math.max(1, me.matchesPlayed)) * 100).toFixed(1)}% نسبة الفوز
                  </div>
                </div>

                <div className="bg-slate-900/35 border border-slate-800/80 p-3 rounded-2xl text-center select-none flex flex-col justify-center items-center">
                  <span className="text-[9px] text-slate-400 block font-bold">سلسلة الانتصارات</span>
                  <div className="flex items-center space-x-1 space-x-reverse mt-1.5 justify-center">
                    <span className="text-base font-black font-mono text-amber-300">
                      {me.winStreak || 0} متتالية
                    </span>
                    <span>
                      {(me.winStreak || 0) >= 10 ? "👑" :
                       (me.winStreak || 0) >= 5 ? "🔥🔥" :
                       (me.winStreak || 0) >= 3 ? "🔥" : "💤"}
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-500 mt-1">تمنحك لقب صانع التاريخ عند تصاعدها</p>
                </div>
              </div>

              {/* Mini Friends and Invitations Section */}
              <div className="bg-[#100c25] rounded-2xl border border-purple-500/15 p-4 shadow-xl space-y-4">
                <div className="border-b border-slate-900 pb-2 flex justify-between items-center select-none">
                  <h4 className="text-xs font-extrabold text-slate-100 flex items-center space-x-1.5 space-x-reverse">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                    <span>⚔️ قائمة الأصدقاء والعباقرة</span>
                  </h4>
                  <span className="text-[9px] bg-purple-950/40 text-purple-300 border border-purple-500/15 px-2 py-0.5 rounded-md font-mono">
                    {me.friends?.length || 0} صديق
                  </span>
                </div>

                {/* Handlers for Pending Requests */}
                {me.friendRequests && me.friendRequests.length > 0 && (
                  <div className="p-3 rounded-xl bg-purple-950/15 border border-purple-500/10 space-y-2 text-right">
                    <span className="text-[9px] text-purple-300 font-extrabold block">📬 طلبات الصداقة المعلقة ({me.friendRequests.length})</span>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {me.friendRequests.map((reqId) => {
                        const requester = playersList.find(p => p.id === reqId);
                        if (!requester) return null;
                        return (
                          <div key={reqId} className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-900">
                            <span className="text-xs text-slate-200 font-bold">{requester.avatar} {requester.username} (Lvl {requester.level})</span>
                            <div className="flex space-x-1 space-x-reverse">
                              <button
                                onClick={async () => {
                                  sounds.playClick();
                                  try {
                                    const res = await fetch("/api/friends/accept", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
                                      },
                                      body: JSON.stringify({ requesterId: reqId })
                                    });
                                    if (res.ok) {
                                      const d = await res.json();
                                      setMe(d.player);
                                      sounds.playSuccess();
                                      alert("تم قبول طلب الصداقة بنجاح!");
                                    }
                                  } catch {
                                    alert("حدث خطأ أثناء معالجة الطلب.");
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2 py-1 rounded"
                              >
                                قبول
                              </button>
                              <button
                                onClick={async () => {
                                  sounds.playClick();
                                  try {
                                    const res = await fetch("/api/friends/decline", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
                                      },
                                      body: JSON.stringify({ requesterId: reqId })
                                    });
                                    if (res.ok) {
                                      const d = await res.json();
                                      setMe(d.player);
                                      alert("تم رفض طلب الصداقة.");
                                    }
                                  } catch {
                                    alert("حدث خطأ أثناء معالجة الطلب.");
                                  }
                                }}
                                className="bg-rose-955 hover:bg-rose-900 text-rose-300 text-[9px] font-bold px-2 py-1 rounded border border-rose-500/20"
                              >
                                رفض
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Friends List Grid */}
                {!me.friends || me.friends.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-4">ليس لديك أي أصدقاء مضافين حتى الآن، أضف الأصدقاء بالضغط على صورهم في المحادثات أو اللوبي!</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                    {me.friends.map((friendId) => {
                      const friend = playersList.find(p => p.id === friendId);
                      if (!friend) return null;
                      return (
                        <div key={friendId} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-900/80 flex items-center justify-between text-xs transition-all hover:border-purple-500/10">
                          <div className="flex items-center space-x-2 space-x-reverse cursor-pointer" onClick={() => setSelectedUserCard(friend)}>
                            <span className="text-xl select-none">{friend.avatar}</span>
                            <div className="text-right">
                              <span className="font-extrabold text-slate-200 block truncate max-w-[80px]">{friend.username}</span>
                              <span className="text-[8.5px] text-slate-500 block">Lvl {friend.level}</span>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              if (!confirm(`هل أنت متأكد من إزالة الصديق ${friend.username}؟`)) return;
                              sounds.playClick();
                              try {
                                const res = await fetch("/api/friends/remove", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
                                  },
                                  body: JSON.stringify({ targetId: friendId })
                                });
                                if (res.ok) {
                                  const d = await res.json();
                                  setMe(d.player);
                                  alert("تمت إزالة الصديق بنجاح.");
                                }
                              } catch {
                                alert("عذراً، فشل حذف الصديق.");
                              }
                            }}
                            className="bg-slate-900 border border-slate-800 hover:border-rose-500/30 p-1 text-[9px] rounded text-slate-400 hover:text-rose-400 font-black transition-all"
                            title="إزالة الصديق"
                          >
                            حذف
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Match history timeline section */}
              <div className="bg-[#100c25] rounded-2xl border border-purple-500/15 p-4 shadow-xl">
                <h4 className="text-xs font-extrabold text-slate-100 flex items-center space-x-1.5 space-x-reverse border-b border-slate-900 pb-2 mb-3">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>تأريخ النزاع والنزالات الأخيرة (سجل المباريات)</span>
                </h4>

                {!me.matchHistory || me.matchHistory.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-6">لم تقم بخوض أي معارك أذكياء بعد، انطلق لأولى تحدياتك!</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {me.matchHistory.map((hist) => (
                      <div key={hist.id} className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-900/60 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                            hist.result === "win" ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300"
                          }`}>
                            {hist.result === "win" ? "نصر" : "خسارة"}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-300">{hist.opponent}</span>
                            <span className="text-[8.5px] text-slate-500 block">{hist.date}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black font-mono ${
                          hist.result === "win" ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {hist.result === "win" ? "+200 ذهب" : "+50 ذهب"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Creator & Developer Signature */}
          <div className="pt-6 pb-2 border-t border-purple-500/10 text-center animate-fade-in" dir="rtl">
            <p className="text-[10px] text-slate-500 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] font-sans">
              👑 صُممت وطُوّرت بكل فخر بواسطة المطور والمبدع <span className="text-amber-400 font-extrabold">أحمد فوكس</span>
            </p>
            <p className="text-[8px] text-purple-400/60 font-mono tracking-widest mt-0.5">
              CREATOR & DEVELOPER: AHMAD FOX • ALL RIGHTS RESERVED © 2026
            </p>
          </div>

        </main>

        {/* BOTTOM GLOBAL MOBILE NAVIGATION BAR */}
        <footer className="sticky bottom-0 z-20 bg-[#0d091e] border-t border-purple-500/10 py-1.5 px-1.5 flex items-center justify-between text-[8.5px] font-bold shadow-[0_-4px_10px_rgba(0,0,0,0.4)] overflow-x-auto">
          {[
            { id: "lobby", icon: "🏠", label: "الرئيسية" },
            { id: "rooms", icon: "🏰", label: "المعارك" },
            { id: "chat", icon: "💬", label: "الدردشة" },
            { id: "shop", icon: "🛒", label: "المتجر" },
            { id: "guilds", icon: "🛡️", label: "النقابات" },
            { id: "leaderboard", icon: "🏆", label: "الترتيب" },
            { id: "achievements", icon: "⭐", label: "المهام" }
          ].map((nav) => (
            <button
              key={nav.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(nav.id as any);
              }}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg flex-1 min-w-[45px] transition-all shrink-0 ${
                activeTab === nav.id
                  ? "text-amber-400 bg-purple-950/40 font-black scale-105"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base mb-0.5">{nav.icon}</span>
              <span className="leading-none text-center block w-full truncate">{nav.label}</span>
            </button>
          ))}
        </footer>

      </div>

      {/* PROFESSIONAL RESULTS MODAL OVERLAY */}
      <AnimatePresence>
        {matchOverReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="w-full max-w-md bg-[#10092c] border-2 border-purple-500/30 rounded-3xl p-6 relative shadow-2xl text-slate-100 text-right font-sans"
              dir="rtl"
            >
              {/* Background celebration circles */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Top Victory or Defeat header */}
              <div className="text-center mb-6 relative">
                {matchOverReport.winnerId === me?.id ? (
                  <div className="inline-block">
                    <span className="text-5xl select-none animate-bounce block">🏆</span>
                    <h2 className="text-2xl font-black text-amber-400 mt-2 tracking-tight">لقد انتصرت بجدارة!</h2>
                    <p className="text-[10px] text-amber-300 font-extrabold uppercase tracking-widest mt-0.5">البطل الصنديد للمباراة</p>
                  </div>
                ) : (
                  <div className="inline-block">
                    <span className="text-5xl select-none block">🤝</span>
                    <h2 className="text-xl font-black text-slate-300 mt-2">تعويض خير في المعركة القادمة!</h2>
                    <p className="text-[10px] text-[#ffbe76] font-extrabold uppercase tracking-widest mt-0.5">{matchOverReport.reason || "انتهت جولات اللغز"}</p>
                  </div>
                )}
              </div>

              {/* Competitors List score board summary */}
              <div className="space-y-3 mb-6 bg-slate-950/50 p-4 rounded-2xl border border-purple-500/10">
                <h4 className="text-xs text-purple-300 font-black mb-2">⭐ نتائج نقاط المتنافسين:</h4>
                <div className="space-y-2">
                  {matchOverReport.players?.map((player) => {
                    const finalScore = matchOverReport.scores[player.id] || 0;
                    const isWinner = player.id === matchOverReport.winnerId;

                    return (
                      <div key={player.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                        isWinner ? "bg-amber-500/10 border-amber-500/20" : "bg-[#110d2c]/40 border-slate-900"
                      }`}>
                        <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
                          <span className="text-xl select-none">{player.avatar || "👤"}</span>
                          <div className="min-w-0">
                            <span 
                              className={`text-xs font-black truncate block ${isWinner ? "text-amber-300" : "text-white"}`}
                              style={{ color: player.nameColor || "inherit" }}
                            >
                              {player.username} {player.id === me?.id && "(أنت)"}
                            </span>
                            <span className="text-[8px] text-slate-400 block">{player.title || "حكيم منافس"}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="font-mono text-sm font-black text-white">{finalScore}</span>
                          <span className="text-[9px] text-[#ffbe76] font-bold">نقطة</span>
                          {isWinner && <span className="text-xs">👑</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Your Personal stats checklist */}
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                <div className="bg-[#120726] p-3 rounded-xl border border-emerald-500/10 text-center">
                  <span className="text-[9px] text-slate-400 font-bold block mb-1">الأسئلة الصحيحة:</span>
                  <p className="text-lg font-black text-emerald-400">{matchOverReport.correctCount || 0}</p>
                </div>
                <div className="bg-[#120726] p-3 rounded-xl border border-rose-500/10 text-center">
                  <span className="text-[9px] text-slate-405 text-slate-400 font-bold block mb-1">الأسئلة الخاطئة:</span>
                  <p className="text-lg font-black text-[#ffbeb3] text-rose-450 text-rose-400">{matchOverReport.wrongCount || 0}</p>
                </div>
                <div className="bg-[#120726] p-3 rounded-xl border border-purple-500/10 text-center col-span-2">
                  <span className="text-[9px] text-slate-400 font-bold block mb-1">إجمالي وقت المعركة المستغرق:</span>
                  <p className="text-xs font-black text-[#7ed6df]">{matchOverReport.timeElapsed || 0} ثوانٍ معدودة</p>
                </div>
              </div>

              {/* Rewards Gained */}
              <div className="bg-gradient-to-r from-purple-950/40 to-slate-900/60 p-4 rounded-2xl border border-purple-500/15 mb-6 text-center">
                <span className="text-[10px] text-[#ffbe76] font-extrabold uppercase tracking-widest block mb-2">🎁 الهدايا والتقديرات الممنوحة:</span>
                <div className="flex justify-center space-x-8 space-x-reverse">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-xl">💰</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-400">+{matchOverReport.winnerId === me?.id ? 200 : 50}</span>
                      <span className="text-[9px] text-slate-400 block leading-none">قطعة ذهبية</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-xl">✨</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-cyan-400">+{matchOverReport.winnerId === me?.id ? 50 : 15}</span>
                      <span className="text-[9px] text-slate-400 block leading-none">خبرة (XP)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button action */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setMatchOverReport(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-[#e056fd] to-[#be2edd] hover:from-[#be2edd] hover:to-[#be2edd] text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg active:scale-[0.98] cursor-pointer"
              >
                العودة إلى اللوبي الرئيسي 🚪
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER MODAL: DETAILED PLAYERS PERSONAL PROFILE CARD */}
      <AnimatePresence>
        {selectedUserCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur px-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-[#110d29] border border-purple-500/30 rounded-2xl p-5 relative shadow-2xl"
            >
              <button
                onClick={() => setSelectedUserCard(null)}
                className="absolute top-3 left-3 p-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center pb-3 border-b border-slate-900">
                <span className="text-3xl block mb-1">{selectedUserCard.avatar}</span>
                <h3 className="text-sm font-black text-white">{selectedUserCard.username}</h3>
                <p className="text-[10px] text-purple-300 italic">{selectedUserCard.title || "حكيم ذكي مستجد"}</p>
              </div>

              <div className="py-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم التعريف ID:</span>
                  <span className="font-mono text-slate-200">{selectedUserCard.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الرتبة والمستوى:</span>
                  <span className="font-bold text-amber-400">مستوى {selectedUserCard.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">نقابات اللاعب:</span>
                  {selectedUserCard.guildId ? (
                    <span 
                      onClick={() => {
                        sounds.playClick();
                        setGuildViewId(selectedUserCard.guildId);
                        setActiveTab("guilds");
                        setSelectedUserCard(null);
                      }}
                      className="text-purple-300 font-bold hover:text-purple-300/80 transition-colors cursor-pointer underline decoration-dotted"
                      title="انقر لزيارة وعرض مواصفات وتفاصيل هذه النقابة مسبقاً"
                    >
                      {selectedUserCard.guildName}
                    </span>
                  ) : (
                    <span className="text-slate-500">مستقل</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">نسبة الفوز:</span>
                  <span className="font-mono text-emerald-400">
                    {selectedUserCard.matchesPlayed > 0 
                      ? `${Math.round((selectedUserCard.wins / selectedUserCard.matchesPlayed) * 100)}%`
                      : "0%"}
                  </span>
                </div>
              </div>

              <div className="flex space-x-1.5 space-x-reverse pt-2 border-t border-slate-900">
                {me && selectedUserCard.id !== me.id ? (
                  (() => {
                    const isFriend = me.friends?.includes(selectedUserCard.id);
                    const sentReq = selectedUserCard.friendRequests?.includes(me.id);
                    const hasIncoming = me.friendRequests?.includes(selectedUserCard.id);

                    if (isFriend) {
                      return (
                        <button
                          disabled
                          className="flex-1 bg-emerald-950/40 text-emerald-300 font-extrabold text-xs py-1.5 rounded-lg text-center border border-emerald-500/10"
                        >
                          🤝 أصدقاء بالفعل
                        </button>
                      );
                    }

                    if (sentReq) {
                      return (
                        <button
                          disabled
                          className="flex-1 bg-slate-900 text-slate-500 font-extrabold text-xs py-1.5 rounded-lg text-center cursor-not-allowed border border-slate-800"
                        >
                          ⏳ تم إرسال الطلب
                        </button>
                      );
                    }

                    if (hasIncoming) {
                      return (
                        <button
                          onClick={async () => {
                            sounds.playClick();
                            try {
                              const res = await fetch("/api/friends/accept", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
                                },
                                body: JSON.stringify({ requesterId: selectedUserCard.id })
                              });
                              if (res.ok) {
                                const d = await res.json();
                                setMe(d.player);
                                sounds.playSuccess();
                                alert("تم قبول طلب الصداقة بنجاح!");
                                setSelectedUserCard(null);
                              }
                            } catch {
                              alert("حدث خطأ أثناء معالجة الطلب.");
                            }
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-1.5 rounded-lg text-center active:scale-95 transition-all animate-pulse"
                        >
                          ✅ قبول الالتماس
                        </button>
                      );
                    }

                    return (
                      <button
                        onClick={async () => {
                          sounds.playClick();
                          try {
                            const res = await fetch("/api/friends/send", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
                              },
                              body: JSON.stringify({ targetId: selectedUserCard.id })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              sounds.playSuccess();
                              setAnnouncement(`تم إرسال طلب صداقة لـ [${selectedUserCard.username}] بنجاح.`);
                              
                              if (me) {
                                selectedUserCard.friendRequests = selectedUserCard.friendRequests || [];
                                selectedUserCard.friendRequests.push(me.id);
                              }
                              setSelectedUserCard(null);
                            } else {
                              alert(data.error || "فشل إرسال طلب الصداقة.");
                            }
                          } catch {
                            alert("حدث خطأ في الشبكة أثناء إرسال طلب الصداقة.");
                          }
                        }}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs py-1.5 rounded-lg text-center"
                      >
                        إضافة صديق ⚔️
                      </button>
                    );
                  })()
                ) : (
                  <button
                    disabled
                    className="flex-1 bg-slate-900 text-slate-500 font-extrabold text-xs py-1.5 rounded-lg text-center cursor-not-allowed"
                  >
                    أنت (ملفك الشخصي)
                  </button>
                )}
                <button
                  onClick={() => {
                    sounds.playClick();
                    handleFileReport(selectedUserCard);
                  }}
                  className="bg-rose-950/40 hover:bg-rose-900 text-rose-300 font-bold border border-rose-500/20 text-xs px-2.5 rounded-lg"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {/* Private messaging quick trigger from profile card */}
              {me && selectedUserCard.id !== me.id && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    setActiveDmPartnerId(selectedUserCard.id);
                    setActiveTab("chat");
                    setActiveChatTab("dm");
                    setSelectedUserCard(null);
                  }}
                  className="w-full mt-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-2 rounded-xl text-center flex items-center justify-center space-x-1.5 space-x-reverse transition-transform active:scale-95 shadow-md shadow-blue-500/10"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>مراسلة خاصة 💬</span>
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* RENDER MODAL: ADMIN DESK PANEL */}
      <AnimatePresence>
        {showAdmin && (
          <AdminPanel
            onClose={() => setShowAdmin(false)}
            playersList={[me, ...playersList]}
            activeRooms={activeRooms}
            reportsList={reportsList}
            banEmailsList={bannedEmailsList}
            onBanPlayer={handleAdminBanPlayer}
            onUnbanPlayer={handleAdminUnbanPlayer}
            onResolveReport={(idx) => {
              setReportsList((prev) => prev.map((r) => (r.id === idx ? { ...r, status: "resolved" } : r)));
            }}
            onInjectQuestion={(compiled) => {
              // Questions logic
            }}
            onMutePlayerToggle={handleMutePlayerToggleAction}
            onDeleteRoom={handleAdminDeleteRoomAction}
          />
        )}
      </AnimatePresence>

      {/* RENDER MODAL: NOTIFICATIONS CENTER PANEL */}
      <AnimatePresence>
        {showNotificationsSystem && me && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-sm bg-[#100c25] border-2 border-purple-500/20 rounded-3xl p-5 relative shadow-2xl text-slate-100 font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3 select-none">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-xl">🔔</span>
                  <div>
                    <h3 className="text-xs font-black text-white">مركز الإشعارات والمناداة</h3>
                    <p className="text-[9px] text-slate-400">تنبيهات فوريّة وعلاقات الأصدقاء والبطولات</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationsSystem(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Actions */}
              {notificationsList.filter(n => !n.isRead).length > 0 && (
                <div className="flex justify-start mb-3 select-none">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      socket?.emit("mark_all_notifications_read", { playerId: me.id });
                    }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-black flex items-center space-x-1 space-x-reverse"
                  >
                    <span>🎯 تعليم كافة الإشعارات كمقروءة</span>
                  </button>
                </div>
              )}

              {/* Scrollable list */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {notificationsList.length === 0 && (me.friendRequests?.length || 0) === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-[10px] select-none">
                    <p className="mb-1">صندوق التنبيهات مريح وفارغ حالياً! 🛋️</p>
                    <p className="text-[8.5px] text-slate-600">لا توجد مناداة، إشارات، أو طلبات معلقة.</p>
                  </div>
                ) : (
                  <>
                    {/* Render friend requests explicitly as part of notifications as requested */}
                    {me.friendRequests && me.friendRequests.map((reqId) => {
                      const requester = playersList.find(p => p.id === reqId);
                      if (!requester) return null;
                      return (
                        <div key={`notif_fr_${reqId}`} className="p-3 rounded-xl bg-slate-950 border border-purple-500/10 flex flex-col justify-between">
                          <div className="flex items-start space-x-2 space-x-reverse mb-2">
                            <span className="text-[18px] shrink-0">📬</span>
                            <div className="flex-1 min-w-0 text-right leading-relaxed">
                              <span className="text-[10px] font-black text-white">{requester.avatar} {requester.username}</span>
                              <p className="text-[9px] text-slate-300">يود التخاطب والمبارزة معك كأحد أصدقائك في المنصة.</p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-1.5 space-x-reverse justify-end">
                            <button
                              onClick={async () => {
                                sounds.playClick();
                                try {
                                  const res = await fetch("/api/friends/accept", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
                                    },
                                    body: JSON.stringify({ requesterId: reqId })
                                  });
                                  if (res.ok) {
                                    const d = await res.json();
                                    setMe(d.player);
                                    sounds.playSuccess();
                                    setAnnouncement("تم قبول طلب الصداقة بنجاح! 🤝");
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9.5px] font-black px-2.5 py-1 rounded-lg"
                            >
                              قبول 🎯
                            </button>
                            <button
                              onClick={async () => {
                                sounds.playClick();
                                try {
                                  const res = await fetch("/api/friends/decline", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "Authorization": `Bearer ${localStorage.getItem("siraa_token") || authToken}`
                                    },
                                    body: JSON.stringify({ requesterId: reqId })
                                  });
                                  if (res.ok) {
                                    const d = await res.json();
                                    setMe(d.player);
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-slate-400 text-[9.5px] font-black px-2.5 py-1 rounded-lg border border-slate-800"
                            >
                              تجاهل
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Render DB notifications */}
                    {notificationsList.map((notif) => {
                      let icon = "🔔";
                      let bgClass = "bg-slate-950 border-slate-900";
                      if (notif.type === "mention") {
                        icon = "💬";
                        bgClass = "bg-[#140e34] border-purple-500/10";
                      } else if (notif.type === "private_message") {
                        icon = "✉️";
                        bgClass = "bg-indigo-950/20 border-indigo-500/10";
                      } else if (notif.type === "room_invite") {
                        icon = "🏰";
                        bgClass = "bg-amber-950/20 border-amber-500/10";
                      } else if (notif.type === "admin_announcement") {
                        icon = "📢";
                        bgClass = "bg-red-950/20 border-red-500/15";
                      } else if (notif.type === "friend_request") {
                        icon = "🤝";
                        bgClass = "bg-slate-950 border-slate-900";
                      }

                      return (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-xl border relative group cursor-pointer hover:bg-slate-900/40 transition-colors ${bgClass} ${
                            !notif.isRead ? "ring-1 ring-amber-500/20" : "opacity-80"
                          }`}
                          onClick={() => {
                            sounds.playClick();
                            socket?.emit("mark_notification_read", { playerId: me.id, notificationId: notif.id });
                            
                            if (notif.type === "private_message" && notif.referenceId) {
                              setActiveDmPartnerId(notif.referenceId);
                              setActiveTab("chat");
                              setActiveChatTab("dm");
                            } else if (notif.type === "mention") {
                              try {
                                const extra = notif.extraData ? JSON.parse(notif.extraData) : null;
                                if (extra && extra.chatType) {
                                  setActiveTab("chat");
                                  setActiveChatTab(extra.chatType);
                                  if (extra.msgId) {
                                    setHighlightedMessageId(extra.msgId);
                                    setTimeout(() => {
                                      setHighlightedMessageId(null);
                                    }, 5000);
                                    setTimeout(() => {
                                      const el = document.getElementById(`msg_bubble_${extra.msgId}`);
                                      if (el) {
                                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                                      }
                                    }, 300);
                                  }
                                }
                              } catch (e) {
                                setActiveTab("chat");
                                setActiveChatTab("general");
                              }
                            } else if (notif.type === "friend_request") {
                              setActiveTab("profile");
                            } else if (notif.type === "room_invite" && notif.referenceId) {
                              handleJoinExistRoom(notif.referenceId);
                            }
                            
                            setShowNotificationsSystem(false);
                          }}
                        >
                          {!notif.isRead && (
                            <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                          )}
                          <div className="flex items-start space-x-2 space-x-reverse">
                            <span className="text-[14px] shrink-0 mt-0.5">{icon}</span>
                            <div className="flex-1 min-w-0 text-right leading-relaxed">
                              <span className="text-[9.5px] font-extrabold text-amber-300 block mb-0.5">{notif.title}</span>
                              <p className="text-[9px] text-slate-300 break-words">{notif.content}</p>
                              <span className="text-[7.5px] text-slate-500 font-mono block mt-1">
                                {new Date(notif.timestamp).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subordinate components
function USERS_ONLINE_DOT() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
    </span>
  );
}
