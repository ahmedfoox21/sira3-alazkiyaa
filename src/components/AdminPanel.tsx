/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Eye, Ban, VolumeX, Trash2, Database, Users, HelpCircle, Activity, Play, Plus, Key } from "lucide-react";
import { Player, Room, GameReport, Question, GameMode } from "../types";
import { sounds } from "./AudioMocks";

interface AdminPanelProps {
  onClose: () => void;
  playersList: Player[];
  activeRooms: Room[];
  reportsList: GameReport[];
  banEmailsList: string[];
  onBanPlayer: (email: string) => void;
  onUnbanPlayer: (email: string) => void;
  onResolveReport: (reportId: string) => void;
  onInjectQuestion: (q: Question) => void;
  onMutePlayerToggle: (playerId: string) => void;
  onDeleteRoom: (roomId: string) => void;
}

export default function AdminPanel({
  onClose,
  playersList,
  activeRooms,
  reportsList,
  banEmailsList,
  onBanPlayer,
  onUnbanPlayer,
  onResolveReport,
  onInjectQuestion,
  onMutePlayerToggle,
  onDeleteRoom
}: AdminPanelProps) {
  const [isAdminAuth, setIsAdminAuth] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<"metrics" | "reports" | "players" | "questions">("metrics");

  // Question injector form states
  const [newQCategory, setNewQCategory] = useState("إسلاميات");
  const [newQMode, setNewQMode] = useState<GameMode>(GameMode.Trivia);
  const [newQText, setNewQText] = useState("");
  const [newQOpt1, setNewQOpt1] = useState("");
  const [newQOpt2, setNewQOpt2] = useState("");
  const [newQOpt3, setNewQOpt3] = useState("");
  const [newQOpt4, setNewQOpt4] = useState("");
  const [newQCorrect, setNewQCorrect] = useState("");

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    if (passcode === "AdminSiraa2026") {
      setIsAdminAuth(true);
      sounds.playSuccess();
    } else {
      sounds.playError();
      setAuthError("الرمز السري المسؤول غير صحيح! تفقد دليل التثبيت .env");
    }
  };

  const handleCreateQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();

    if (!newQText.trim() || !newQCorrect.trim()) {
      alert("الرجاء إدخال نص السؤال والجواب الصحيح.");
      return;
    }

    const compiled: Question = {
      id: "admin_q_" + Math.random().toString(36).substring(2, 11),
      category: newQCategory,
      mode: newQMode,
      questionText: newQText,
      options: newQMode === GameMode.Trivia ? [newQOpt1, newQOpt2, newQOpt3, newQOpt4] : undefined,
      correctAnswer: newQCorrect
    };

    onInjectQuestion(compiled);
    sounds.playSuccess();
    alert("تم حقن السؤال الجديد بنجاح في مخزن الأسئلة النشط!");

    // Clear form
    setNewQText("");
    setNewQOpt1("");
    setNewQOpt2("");
    setNewQOpt3("");
    setNewQOpt4("");
    setNewQCorrect("");
  };

  if (!isAdminAuth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d091e]/95 backdrop-blur text-white px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm bg-[#110d29] border border-amber-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(234,179,8,0.15)] text-center"
        >
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center mx-auto mb-4 animate-glow">
            <Key className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-lg font-extrabold text-amber-400">تسجيل الدخول للوحة الإدارة</h2>
          <p className="text-xs text-slate-400 mt-1.5">اللوحة مخصصة للتحكم باللاعبين، البلاغات والأسئلة</p>

          <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
            <input
              type="password"
              placeholder="أدخل رمز الإدارة السري (افتراضي: AdminSiraa2026)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-center text-white focus:outline-none focus:border-amber-400"
            />
            {authError && <p className="text-[11px] text-rose-400 leading-tight">{authError}</p>}

            <div className="flex space-x-2 space-x-reverse">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs py-2 rounded-lg transition-transform active:scale-95 shadow-md shadow-amber-500/25"
              >
                مصادقة الخادم
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
              >
                العودة
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070512] text-[#e0def4]">
      {/* Admin header */}
      <div className="sticky top-0 z-10 bg-[#0d091e] border-b border-amber-500/20 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Shield className="w-6 h-6 text-amber-400 animate-pulse" />
          <div>
            <span className="text-xs text-amber-400 uppercase tracking-widest font-mono font-bold">لوحة الإدارة والمشرفين</span>
            <div className="text-[10px] text-slate-400">إدارة خوادم وطاولات لـ صراع الأذكياء</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold px-3 py-1.5 rounded-lg border border-slate-700"
        >
          خروج من الإدارة
        </button>
      </div>

      {/* Tabs navigation list */}
      <div className="flex border-b border-slate-900 bg-[#0a0718] text-xs font-bold font-sans">
        {[
          { tab: "metrics", icon: <Activity className="w-3.5 h-3.5" />, label: "الإحصائيات والغرف" },
          { tab: "reports", icon: <Eye className="w-3.5 h-3.5" />, label: `البلاغات (${reportsList.filter((r) => r.status === "pending").length})` },
          { tab: "players", icon: <Users className="w-3.5 h-3.5" />, label: "المستخدمين والمحظورين" },
          { tab: "questions", icon: <HelpCircle className="w-3.5 h-3.5" />, label: "إضافة وحقن أسئلة" }
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => {
              sounds.playClick();
              setActiveTab(item.tab as any);
            }}
            className={`flex-1 py-3 flex items-center justify-center space-x-1 space-x-reverse border-b-2 transition-colors ${
              activeTab === item.tab
                ? "border-amber-400 text-amber-300 bg-amber-950/15"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Primary tab display container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "metrics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block mb-1">اللاعبين المسجلين</span>
                <span className="text-xl font-bold text-white font-mono">{playersList.length}</span>
              </div>
              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block mb-1">الغرف النشطة</span>
                <span className="text-xl font-bold text-amber-400 font-mono">{activeRooms.length}</span>
              </div>
              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block mb-1">بلاغات معلقة</span>
                <span className="text-xl font-bold text-rose-400 font-mono">
                  {reportsList.filter((r) => r.status === "pending").length}
                </span>
              </div>
              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block mb-1">عناوين البريد المحظورة</span>
                <span className="text-xl font-bold text-slate-400 font-mono">{banEmailsList.length}</span>
              </div>
            </div>

            {/* List and manage active game rooms */}
            <div className="bg-[#120e26] p-4 rounded-xl border border-slate-800">
              <h3 className="text-xs font-bold text-amber-400 mb-3 flex items-center space-x-1.5 space-x-reverse">
                <Database className="w-4 h-4" />
                <span>مراقبة وإدارة الغرف السوكيت النشطة</span>
              </h3>

              {activeRooms.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">لا توجد غرف نشطة حالياً في خادم اللعبة</div>
              ) : (
                <div className="space-y-2">
                  {activeRooms.map((rm) => (
                    <div key={rm.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="text-xs font-bold text-white">{rm.name}</span>
                          <span className="text-[9px] px-1 bg-slate-900 rounded font-mono text-cyan-400">
                            {rm.type} | {rm.mode === GameMode.Trivia ? "مسابقات" : "إيموجي"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          معرّف الغرفة: <span className="font-mono">{rm.id}</span> • اللاعبين المتواجدين: {rm.players.length} / {rm.maxPlayers}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          sounds.playClick();
                          onDeleteRoom(rm.id);
                        }}
                        className="text-xs bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 px-3 py-1.5 rounded-lg flex items-center space-x-1 space-x-reverse"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>مسح وفصل</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-rose-400">سجل بلاغات اللاعبين المعلقة والمشحونة</h3>

            {reportsList.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">لا توجد بلاغات مرفوعة من قبل المنافسين</div>
            ) : (
              <div className="space-y-2">
                {reportsList.map((rp) => (
                  <div key={rp.id} className="p-3 bg-slate-900/40 rounded-xl border border-rose-500/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">السبب: {rp.reason}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        rp.status === "pending" ? "bg-amber-950 text-amber-400" : "bg-emerald-950 text-emerald-400"
                      }`}>
                        {rp.status === "pending" ? "جاري التدقيق" : "تم الحل"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                      {rp.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>المبلِغ: {rp.reporterId} • المشكو به: {rp.reportedId}</span>
                      
                      {rp.status === "pending" && (
                        <div className="flex space-x-1.5 space-x-reverse">
                          <button
                            onClick={() => {
                              sounds.playClick();
                              onResolveReport(rp.id);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded"
                          >
                            اعتماد وتصفية
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "players" && (
          <div className="space-y-4">
            {/* Quick Ban Form */}
            <div className="bg-[#120e26] p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-rose-400">حظر مستخدم سريع بواسطة البريد</h3>
              <div className="flex space-x-2 space-x-reverse">
                <input
                  type="email"
                  id="ban_input_email"
                  placeholder="أدخل بريده الإلكتروني بدقة..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={() => {
                    const inp = document.getElementById("ban_input_email") as HTMLInputElement;
                    if (inp && inp.value.trim()) {
                      onBanPlayer(inp.value.trim());
                      inp.value = "";
                      alert("تم تطبيق الحظر الفوري على الحساب.");
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  تطبيق الحظر
                </button>
              </div>
            </div>

            {/* List players count */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white">ترتيب اللاعبين وسجلاتهم الإدارية</h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {playersList.map((pl) => (
                  <div key={pl.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5 space-x-reverse">
                      <span className="text-lg">{pl.avatar}</span>
                      <div>
                        <div className="font-bold text-white flex items-center space-x-1.5 space-x-reverse">
                          <span>{pl.username}</span>
                          {pl.isBanned && <span className="bg-rose-950 border border-rose-500/20 text-rose-400 text-[9px] px-1 rounded">محظور</span>}
                          {pl.isMuted && <span className="bg-slate-950 text-slate-400 text-[9px] px-1 rounded border border-slate-800">صامت</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{pl.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        onClick={() => {
                          sounds.playClick();
                          onMutePlayerToggle(pl.id);
                        }}
                        className={`p-1.5 rounded ${pl.isMuted ? "bg-yellow-600 text-white" : "bg-slate-850 text-slate-400 hover:text-white"}`}
                        title="كتم مؤقت عن المحادثة العامة"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                      </button>

                      {pl.isBanned ? (
                        <button
                          onClick={() => {
                            sounds.playClick();
                            onUnbanPlayer(pl.email);
                          }}
                          className="bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/20 text-emerald-300 px-3 py-1 rounded"
                        >
                          فك الحظر
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            sounds.playClick();
                            onBanPlayer(pl.email);
                          }}
                          className="bg-rose-950/40 hover:bg-rose-900 border border-rose-500/20 text-rose-300 px-3 py-1 rounded"
                        >
                          حظر كامل
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "questions" && (
          <form onSubmit={handleCreateQuestionSubmit} className="space-y-3 p-4 bg-slate-900/40 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-amber-400">حقن سؤال مخصص ومثقفي لقاعدة البيانات</h3>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">القسم والتصنيف</label>
              <select
                value={newQCategory}
                onChange={(e) => setNewQCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none"
              >
                <option value="ثقافة عامة">ثقافة عامة</option>
                <option value="إسلاميات">إسلاميات (فقه وسيرة)</option>
                <option value="تاريخ">تاريخ عربي وعالمي</option>
                <option value="أنمي">أنمي وألعاب</option>
                <option value="رياضة">رياضة وكور</option>
                <option value="علوم وتكنولوجيا">علوم وتكنولوجيا</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">طريقة اللعب</label>
              <div className="flex space-x-2 space-x-reverse">
                <button
                  type="button"
                  onClick={() => setNewQMode(GameMode.Trivia)}
                  className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                    newQMode === GameMode.Trivia ? "bg-purple-600 text-white" : "bg-slate-950 text-slate-400"
                  }`}
                >
                  مسابقة خيارات
                </button>
                <button
                  type="button"
                  onClick={() => setNewQMode(GameMode.Emoji)}
                  className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                    newQMode === GameMode.Emoji ? "bg-purple-600 text-white" : "bg-slate-950 text-slate-400"
                  }`}
                >
                  تخمين الإيموجي (Emoji Guess)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">نص السؤال أو الإيموجي المطلوب</label>
              <input
                type="text"
                required
                value={newQText}
                onChange={(e) => setNewQText(e.target.value)}
                placeholder={newQMode === GameMode.Emoji ? "مثال: 🦁👑" : "مثال: من هو كاتب كتاب مقدمة ابن خلدون؟"}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            {newQMode === GameMode.Trivia && (
              <div className="space-y-2">
                <label className="block text-[11px] text-slate-400">الخيارات الأربعة البديلة</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newQOpt1}
                    onChange={(e) => setNewQOpt1(e.target.value)}
                    placeholder="الخيار الأول"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    value={newQOpt2}
                    onChange={(e) => setNewQOpt2(e.target.value)}
                    placeholder="الخيار الثاني"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    value={newQOpt3}
                    onChange={(e) => setNewQOpt3(e.target.value)}
                    placeholder="الخيار الثالث"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    value={newQOpt4}
                    onChange={(e) => setNewQOpt4(e.target.value)}
                    placeholder="الخيار الرابع"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">الجواب الصحيح بدقة حرفية</label>
              <input
                type="text"
                required
                value={newQCorrect}
                onChange={(e) => setNewQCorrect(e.target.value)}
                placeholder="يجب مطابقة أحد الخيارات المكتوبة أعلاه تماماً"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-2 rounded-lg transition-transform active:scale-95"
            >
              حقن وتأكيد السؤال 🔌
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
