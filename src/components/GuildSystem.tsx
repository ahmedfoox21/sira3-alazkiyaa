/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Shield, Sparkles, Plus, Users, Award, Search, LogOut, X, Calendar, Flame, Crown } from "lucide-react";
import { Player, Guild } from "../types";
import { sounds } from "./AudioMocks";

interface GuildSystemProps {
  player: Player;
  onGuildUpdate: (updatedPlayer: Player, updatedGuilds: Guild[]) => void;
  guildsList: Guild[];
  playersList?: Player[];
  onShowAnnouncement: (text: string) => void;
  initialSelectedGuildId?: string;
  onClearInitialSelectedGuild?: () => void;
}

export default function GuildSystem({ 
  player, 
  onGuildUpdate, 
  guildsList, 
  playersList, 
  onShowAnnouncement,
  initialSelectedGuildId,
  onClearInitialSelectedGuild
}: GuildSystemProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [guildName, setGuildName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarEmblem, setAvatarEmblem] = useState("🛡️");
  const [badgeSymbol, setBadgeSymbol] = useState("⚔️");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (initialSelectedGuildId) {
      const match = guildsList.find(g => g.id === initialSelectedGuildId);
      if (match) {
        setSelectedGuild(match);
      }
      if (onClearInitialSelectedGuild) {
        onClearInitialSelectedGuild();
      }
    }
  }, [initialSelectedGuildId, guildsList]);

  const EMBLEMS = ["🛡️", "🧠", "👑", "🦁", "🦅", "🔥", "🔮", "🎭", "🚀"];
  const BADGES = ["⚔️", "🎖️", "⭐", "🔱", "💎", "🎯", "🌀"];

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();

    if (!guildName.trim() || !description.trim()) {
      sounds.playError();
      onShowAnnouncement("الرجاء تعبئة اسم النقابة ووصفها بالكامل!");
      return;
    }

    if (player.coins < 300) {
      sounds.playError();
      onShowAnnouncement("إنشاء نقابة يتطلب 300 عملة ذهبية كرسوم تأسيس.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/guilds/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("siraa_token")}`
        },
        body: JSON.stringify({
          name: guildName.trim(),
          description: description.trim(),
          avatarEmblem,
          badgeSymbol
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "فشل تأسيس النقابة");
      }

      const data = await res.json();
      sounds.playSuccess();
      onGuildUpdate(data.player, data.guilds);
      setIsCreating(false);
      onShowAnnouncement(`مبروك! تم تأسيس نقابة [${guildName.trim()}] الجديدة بنجاح.`);

      // reset forms
      setGuildName("");
      setDescription("");
    } catch (err: any) {
      sounds.playError();
      onShowAnnouncement(err.message || "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGuild = async (target: Guild) => {
    sounds.playClick();
    if (player.guildId) {
      onShowAnnouncement("أنت تنتمي بالفعل لنقابة حالية. غادرها أولاً لتنضم لغيرها.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/guilds/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("siraa_token")}`
        },
        body: JSON.stringify({ guildId: target.id })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "فشل الانضمام");
      }

      const data = await res.json();
      sounds.playSuccess();
      onGuildUpdate(data.player, data.guilds);
      onShowAnnouncement(`أهلاً بك! انضممت بنجاح لنقابة [${target.name}].`);
    } catch (err: any) {
      sounds.playError();
      onShowAnnouncement(err.message || "عذراً، حدث خطأ أثناء الانضمام");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGuild = async () => {
    sounds.playClick();
    const myGuildId = player.guildId;
    if (!myGuildId) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/guilds/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("siraa_token")}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "فشل مغادرة النقابة");
      }

      const data = await res.json();
      sounds.playSuccess();
      onGuildUpdate(data.player, data.guilds);
      onShowAnnouncement("تمت مغادرة النقابة بنجاح ولن تشارك في ترتيبها من الآن.");
    } catch (err: any) {
      sounds.playError();
      onShowAnnouncement(err.message || "حدث خطأ أثناء المغادرة");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter guilds by queries
  const filteredGuilds = guildsList.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#100c25] rounded-2xl border border-purple-500/10 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Shield className="w-6 h-6 text-purple-400 stroke-[2.5]" />
          <div>
            <h2 className="text-md font-extrabold text-white">نظام النقابات والتحالفات</h2>
            <p className="text-[10px] text-slate-400">انضم لنخبة الأذكياء وساهم في صدارة ترتيب نقابتك أسبوعياً</p>
          </div>
        </div>

        {!player.guildId && !isCreating && (
          <button
            onClick={() => {
              sounds.playClick();
              setIsCreating(true);
            }}
            disabled={isLoading}
            className="flex items-center space-x-1 space-x-reverse bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-transform active:scale-95 shadow-lg shadow-purple-600/25 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تأسيس نقابة</span>
          </button>
        )}

        {player.guildId && (
          <button
            onClick={handleLeaveGuild}
            disabled={isLoading}
            className="flex items-center space-x-1 space-x-reverse bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>مغادرة النقابة</span>
          </button>
        )}
      </div>

      {isCreating ? (
        <form onSubmit={handleCreateGuild} className="space-y-3.5 bg-slate-900/40 p-4 rounded-xl border border-purple-500/20">
          <h3 className="text-xs font-bold text-purple-300 flex items-center space-x-1 space-x-reverse">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>تفاصيل النقابة الجديدة (التكلفة: 300 ذهبة)</span>
          </h3>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">اسم التحالف / النقابة</label>
            <input
              type="text"
              required
              disabled={isLoading}
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              placeholder="مثال: فرسان المعرفة، عروق الذهب..."
              maxLength={20}
              className="w-full bg-slate-950/85 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">وصف النقابة وقوانين الانضمام</label>
            <textarea
              required
              disabled={isLoading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للترحيب بالأعضاء ولائحة الشروط..."
              maxLength={120}
              rows={2}
              className="w-full bg-slate-950/85 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Emblem selection grids */}
          <div className="flex space-x-4 space-x-reverse">
            <div className="flex-1">
              <label className="block text-[11px] text-slate-400 mb-1">الأيقونة الرئيسية</label>
              <div className="grid grid-cols-5 gap-1">
                {EMBLEMS.map((emb) => (
                  <button
                    key={emb}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      sounds.playClick();
                      setAvatarEmblem(emb);
                    }}
                    className={`p-1.5 text-md rounded border transition-colors ${
                      avatarEmblem === emb ? "bg-purple-600 border-purple-400" : "bg-slate-950 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    {emb}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[11px] text-slate-400 mb-1">شعار المعارك</label>
              <div className="grid grid-cols-4 gap-1">
                {BADGES.map((bdg) => (
                  <button
                    key={bdg}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      sounds.playClick();
                      setBadgeSymbol(bdg);
                    }}
                    className={`p-1.5 text-md rounded border transition-colors ${
                      badgeSymbol === bdg ? "bg-purple-600 border-purple-400" : "bg-slate-950 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    {bdg}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-2 space-x-reverse pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "جاري التأسيس..." : "تأسيس ودفع الرسوم 金 300"}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                sounds.playClick();
                setIsCreating(false);
              }}
              className="px-4 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs rounded-lg disabled:opacity-50"
            >
              إلغاء التأسيس
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {player.guildId && (
            <div 
              onClick={() => {
                sounds.playClick();
                const current = guildsList.find(g => g.id === player.guildId);
                if (current) setSelectedGuild(current);
              }}
              className="p-3 rounded-xl bg-gradient-to-r from-purple-950/20 to-slate-900 border border-purple-500/20 flex items-center justify-between cursor-pointer hover:border-purple-500/40 transition-all group animate-fade-in"
            >
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-2xl border-2 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)] group-hover:scale-105 transition-transform">
                  {guildsList.find((g) => g.id === player.guildId)?.avatar || "🛡️"}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5 space-x-reverse">
                    <span className="text-xs text-slate-400">نقابتك الحالية:</span>
                    <span className="text-sm font-extrabold text-purple-300 group-hover:text-purple-400 transition-colors underline decoration-dotted">{player.guildName}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 underline line-clamp-1">
                    {guildsList.find((g) => g.id === player.guildId)?.description || "تحالف أذكياء وعباقرة العرب الكبار"}
                  </p>
                </div>
              </div>

              <div className="text-left">
                <div className="text-[10px] text-slate-400">النقاط الكلية</div>
                <div className="text-xs font-extrabold text-amber-400 font-mono">
                  {guildsList.find((g) => g.id === player.guildId)?.totalPoints || 100}
                </div>
              </div>
            </div>
          )}

          {/* Search elements bar */}
          <div className="relative">
            <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث عن نقابة بالاسم أو الكلمة الدالة..."
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Leaders list of available Guilds */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 flex items-center space-x-1 space-x-reverse">
              <Award className="w-4 h-4" />
              <span>ترتيب وصدارة نقابات صراع الأذكياء الحقيقية</span>
            </h3>

            {filteredGuilds.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-5 bg-slate-900/15 rounded-xl border border-slate-900">
                لا توجد نقابات مؤسسة حالياً، كن أول من يؤسس نقابة ويتصدر الترتيب.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                {filteredGuilds.map((g, idx) => (
                  <div
                    key={g.id}
                    className={`p-2.5 rounded-xl transition-all flex items-center justify-between border ${
                      player.guildId === g.id
                        ? "bg-purple-950/25 border-purple-500/40 font-bold"
                        : "bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/60 cursor-pointer hover:border-purple-500/25"
                    }`}
                    onClick={(e) => {
                      // Only open page if they didn't click the Join button directly
                      if ((e.target as HTMLElement).tagName !== "BUTTON") {
                        sounds.playClick();
                        setSelectedGuild(g);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      {/* rank badge indicator */}
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                        idx === 0 ? "bg-amber-400 text-slate-950" :
                        idx === 1 ? "bg-slate-300 text-slate-900" :
                        idx === 2 ? "bg-amber-700 text-slate-100" : "bg-slate-800 text-slate-400"
                      }`}>
                        {idx + 1}
                      </span>

                      <span className="text-xl">{g.avatar}</span>
                      <div>
                        <div className="flex items-center space-x-1.5 space-x-reverse">
                          <span className="text-xs font-extrabold text-white hover:text-purple-300 transition-colors">{g.name}</span>
                          <span className="text-[9px] px-1 bg-slate-950 border border-slate-800 rounded font-mono text-slate-400 flex items-center space-x-0.5 space-x-reverse">
                            <Users className="w-2.5 h-2.5" />
                            <span>{g.membersCount}</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 max-w-[160px] underline decoration-dotted">{g.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="text-left shrink-0">
                        <span className="text-[10px] text-amber-400 font-mono font-bold">{g.totalPoints}</span>
                        <div className="text-[8px] text-slate-500">نقطة</div>
                      </div>

                      {!player.guildId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinGuild(g);
                          }}
                          className="text-[10px] bg-purple-650/40 hover:bg-purple-600 text-purple-300 hover:text-white font-bold px-2.5 py-1 rounded-lg transition-colors border border-purple-500/20"
                        >
                          انضمام
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GUILD DETAILS DIALOG / PROFILE PAGE */}
      {selectedGuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fade-in" dir="rtl">
          <div className="w-full max-w-sm bg-[#10092c] border-2 border-purple-500/30 rounded-3xl p-5 relative shadow-2xl text-slate-100 font-sans max-h-[85vh] overflow-y-auto">
            {/* Top close button */}
            <button
              onClick={() => {
                sounds.playClick();
                setSelectedGuild(null);
              }}
              className="absolute top-4 left-4 w-7 h-7 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors hover:border-purple-500/30"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Header */}
            <div className="text-center mt-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 mx-auto flex items-center justify-center text-3xl border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] mb-2.5">
                {selectedGuild.avatar}
              </div>
              <h3 className="text-md font-extrabold text-white flex items-center justify-center space-x-2 space-x-reverse">
                <span>{selectedGuild.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-900/80 border border-slate-800 text-slate-400 rounded-md font-mono">
                  {selectedGuild.badge}
                </span>
              </h3>
              <p className="text-[10px] text-purple-300 font-medium mt-1">
                تاريخ وتأسيس التحالف: {new Date(selectedGuild.createdAt || Date.now()).toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Description Card */}
            <div className="p-3 bg-slate-950/70 border border-slate-900 rounded-xl mb-4 text-right">
              <span className="text-[9px] text-amber-400 font-bold block mb-1">📜 الميثاق والوصف العام:</span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedGuild.description || "معركة فكرية ملحمية من أجل العلم والمعرفة."}</p>
            </div>

            {/* Grid of Key Info */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-right">
              <div className="p-2 ml-0 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center space-x-2 space-x-reverse">
                <span className="text-lg">🏆</span>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">النقاط الكلية</span>
                  <span className="text-xs font-black text-amber-400 font-mono">{selectedGuild.totalPoints}</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center space-x-2 space-x-reverse">
                <span className="text-lg">🎖️</span>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">الترتيب</span>
                  <span className="text-xs font-black text-purple-300 font-mono">
                    #{(() => {
                      const sorted = [...guildsList].sort((a, b) => b.totalPoints - a.totalPoints);
                      const pos = sorted.findIndex(x => x.id === selectedGuild.id);
                      return pos >= 0 ? pos + 1 : 1;
                    })()}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center space-x-2 space-x-reverse">
                <span className="text-lg">👥</span>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">عدد المنتسبين</span>
                  <span className="text-xs font-black text-blue-300 font-mono">{selectedGuild.membersCount}</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center space-x-2 space-x-reverse">
                <span className="text-lg">👑</span>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">مؤسس التحالف</span>
                  <span className="text-[10px] font-black text-emerald-400 truncate max-w-[85px] block font-sans">
                    {selectedGuild.creatorId === "admin_user" ? "المشرف العام" : (playersList?.find(p => p.id === selectedGuild.creatorId)?.username || "قائد أسطوري")}
                  </span>
                </div>
              </div>
            </div>

            {/* List of Members */}
            <div className="mb-4 text-right">
              <span className="text-[10px] text-slate-400 font-bold flex items-center space-x-1 space-x-reverse mb-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>فرسان وأعضاء التحالف المخلصين:</span>
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1 bg-slate-950/40 p-1.5 rounded-xl border border-slate-900">
                {(() => {
                  const mList = (playersList || []).filter(p => p.guildId === selectedGuild.id);
                  if (mList.length === 0) {
                    return (
                      <p className="text-[10px] text-slate-500 text-center py-2">
                        لا يوجد غير قائد ومؤسس النقابة حالياً.
                      </p>
                    );
                  }
                  return mList.map((m, mIdx) => (
                    <div key={m.id || mIdx} className="p-1 px-2 rounded-lg bg-slate-900/80 flex items-center justify-between text-[11px] border border-slate-800/35">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="text-sm">{m.avatar || "🧠"}</span>
                        <div>
                          <span className={`font-bold ${m.nameColor || "text-slate-200"}`}>{m.username}</span>
                          <span className="text-[8px] text-slate-500 block">مستوى {m.level} • {m.title || "عبقري مشارك"}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {m.id === selectedGuild.creatorId ? "👑 مؤسس" : "🛡️ حليف"}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Achievements Section */}
            <div className="p-3 bg-slate-950/20 rounded-xl border border-dashed border-purple-500/20 mb-4 text-right">
              <span className="text-[9px] text-amber-400 font-bold block mb-1">⭐ أوسمة وإنجازات النقابة:</span>
              <div className="space-y-1 text-[10px] text-right">
                <div className="flex items-center space-x-1 space-x-reverse text-slate-300 justify-start">
                  <span>🏆</span>
                  <span className="font-semibold text-purple-300">درع النخبة الدائم:</span>
                  <span>أول من تحدى حدود المستحيل الكوني.</span>
                </div>
                <div className="flex items-center space-x-1 space-x-reverse text-slate-300 justify-start">
                  <span>⚡</span>
                  <span className="font-semibold text-purple-300">الالتحام السريع:</span>
                  <span>تحقيق انتصارات متتالية بدقة قياسية.</span>
                </div>
              </div>
            </div>

            {/* Control Actions / Interactive Buttons */}
            <div className="flex space-x-2 space-x-reverse pt-2">
              {player.guildId === selectedGuild.id ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    await handleLeaveGuild();
                    setSelectedGuild(null);
                  }}
                  className="flex-1 bg-rose-955 bg-rose-900 hover:bg-rose-800 text-rose-100 font-bold text-xs py-2 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? "جاري الخروج..." : "مغادرة النقابة"}
                </button>
              ) : !player.guildId ? (
                <>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={async () => {
                      await handleJoinGuild(selectedGuild);
                      setSelectedGuild(null);
                    }}
                    className="flex-1 bg-purple-650 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? "جاري الانضمام..." : "انضمام فوري"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onShowAnnouncement("📝 تم إرسال طلب انضمامك إلى قائد التحالف للدراسة والمراجعة بنجاح!");
                    }}
                    className="px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl"
                  >
                    طلب موافقة
                  </button>
                </>
              ) : (
                <p className="text-[10px] text-slate-400 text-center w-full italic">
                  * يجب عليك مغادرة نقابتك الحالية أولاً لتقدر على الانضمام لهذه النقابة.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
