/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Coins, Gem, ShoppingBag, CheckCircle, Info, Star } from "lucide-react";
import { Player, ShopItem } from "../types";
import { sounds } from "./AudioMocks";

interface ShopCatalogProps {
  player: Player;
  onPurchaseSuccess: (updatedPlayer: Player) => void;
  shopItems: ShopItem[];
  isTabMode?: boolean;
}

export default function ShopCatalog({ player, onPurchaseSuccess, shopItems, isTabMode = true }: ShopCatalogProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const handlePurchase = async (item: ShopItem) => {
    sounds.playClick();
    
    // Balance validations
    if (item.priceType === "coins" && player.coins < item.priceValue) {
      sounds.playError();
      alert("عذراً! ليس لديك ذهب كافٍ لشراء هذا العنصر المميز.");
      return;
    }
    if (item.priceType === "gems" && player.gems < item.priceValue) {
      sounds.playError();
      alert("عذراً! ليس لديك جواهر كافية لشراء هذا العنصر التجميلي.");
      return;
    }

    setIsPurchasing(item.id);
    try {
      const updatedPlayer = { ...player };
      if (item.priceType === "coins") {
        updatedPlayer.coins -= item.priceValue;
      } else {
        updatedPlayer.gems -= item.priceValue;
      }

      // Equip item instantly based on type
      if (item.type === "avatar") {
        updatedPlayer.avatar = item.assetValue;
      } else if (item.type === "border") {
        updatedPlayer.borderId = item.id;
      } else if (item.type === "name_color") {
        updatedPlayer.nameColor = item.assetValue;
      } else if (item.type === "title") {
        updatedPlayer.title = item.assetValue;
      } else if (item.type === "background") {
        updatedPlayer.bgId = item.id;
      } else if (item.type === "effect") {
        updatedPlayer.effectId = item.id;
      }

      // Track item in ownedItems list
      if (!updatedPlayer.ownedItems) {
        updatedPlayer.ownedItems = [];
      }
      if (!updatedPlayer.ownedItems.includes(item.id)) {
        updatedPlayer.ownedItems = [...updatedPlayer.ownedItems, item.id];
      }

      // Send to server to write permanently in database
      const res = await fetch("/api/players/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("siraa_token")}`
        },
        body: JSON.stringify({
          coins: updatedPlayer.coins,
          gems: updatedPlayer.gems,
          avatar: updatedPlayer.avatar,
          borderId: updatedPlayer.borderId,
          nameColor: updatedPlayer.nameColor,
          title: updatedPlayer.title,
          bgId: updatedPlayer.bgId,
          effectId: updatedPlayer.effectId,
          ownedItems: updatedPlayer.ownedItems
        })
      });

      if (!res.ok) {
        throw new Error("فشل المزامنة مع خادم قاعدة البيانات");
      }

      const data = await res.json();
      sounds.playSuccess();
      onPurchaseSuccess(data.player);
      alert(`مبروك! قمت بشراء وتفعيل مظهر [${item.name}] بنجاح.`);
    } catch (err: any) {
      sounds.playError();
      alert(err.message || "حدث خطأ غير متوقع أثناء عملية الدفع");
    } finally {
      setIsPurchasing(null);
    }
  };

  const filteredItems = shopItems;

  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "border-amber-500/40 bg-gradient-to-br from-amber-950/20 to-[#181122]/90 hover:border-amber-400";
      case "epic":
        return "border-purple-500/40 bg-gradient-to-br from-purple-950/25 to-[#110d24]/90 hover:border-purple-400";
      case "rare":
        return "border-cyan-500/40 bg-gradient-to-br from-cyan-950/25 to-[#0e0a20]/90 hover:border-cyan-400";
      default:
        return "border-slate-800 bg-slate-900/60 hover:border-slate-700";
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "bg-amber-400/10 text-amber-400 border border-amber-400/30";
      case "epic":
        return "bg-purple-400/10 text-purple-400 border border-purple-400/30";
      case "rare":
        return "bg-cyan-400/10 text-cyan-400 border border-cyan-400/30";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  return (
    <div className="bg-[#100c25] rounded-2xl border border-purple-500/10 p-4 shadow-xl space-y-4">
      
      {/* PROFESSIONAL TITLE DESIGN (NEON GOLD & PURPLE GRADIENT HERO) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-[#181135] to-amber-950/30 p-5 border border-purple-500/15 flex items-center justify-between">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div>
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
            قسم المظاهر والتحسينات التجميلية
          </span>
          <h2 className="text-md font-black text-white mt-1.5 flex items-center space-x-1 space-x-reverse">
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
            <span className="font-extrabold text-[15px] text-amber-300 font-sans tracking-wide">الكنوز والمقتنيات</span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-1">تداول الذهب والياقوت وحسّن هويتك العربية الفاخرة</p>
        </div>

        {/* Currency balances indicators inside Shop Header */}
        <div className="flex flex-col space-y-1.5 shrink-0">
          <div className="flex items-center space-x-1.5 space-x-reverse bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-mono text-xs font-bold">{player.coins}</span>
          </div>
          <div className="flex items-center space-x-1.5 space-x-reverse bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 px-2.5 py-1 rounded-lg">
            <Gem className="w-4 h-4 text-fuchsia-400" />
            <span className="font-mono text-xs font-bold">{player.gems}</span>
          </div>
        </div>
      </div>



      {/* Live cosmetic preview panel */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 rounded-xl bg-slate-950/90 border border-purple-500/30 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3.5 space-x-reverse">
              <div className="relative">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-slate-900 border-2 ${
                  previewItem.type === "border" ? "border-amber-400 animate-pulse" : "border-purple-500/40"
                } ${previewItem.type === "effect" ? "shadow-[0_0_15px_gold] border-yellow-400" : ""}`}>
                  {previewItem.type === "avatar" ? previewItem.assetValue : player.avatar}
                </div>
                {previewItem.type === "border" && (
                  <div className={`absolute -inset-1 rounded-full border-2 pointer-events-none ${
                    previewItem.id === "border_gold" ? "border-amber-400 shadow-[0_0_8px_gold]" : "border-fuchsia-500"
                  }`} />
                )}
              </div>
              
              <div>
                <div className="text-[10px] text-purple-300 flex items-center space-x-1 space-x-reverse">
                  <Star className="w-3 h-3 text-amber-400 animate-spin" />
                  <span>معاينة المظهر الحية:</span>
                </div>
                <div className={`text-md font-extrabold ${previewItem.type === "name_color" ? previewItem.assetValue : "text-white"}`}>
                  {player.username}
                </div>
                <div className="text-[10px] text-slate-400">
                  {previewItem.type === "title" ? `[${previewItem.assetValue}]` : `[${player.title || "حكيم معاصر"}]`}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setPreviewItem(null);
                sounds.playClick();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 underline font-bold"
            >
              إلغاء المعاينة
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shop items grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-h-[480px] overflow-y-auto pr-0.5">
        {filteredItems.map((item) => {
          const isOwned = 
            (item.type === "avatar" && player.avatar === item.assetValue) ||
            (item.type === "border" && player.borderId === item.id) ||
            (item.type === "name_color" && player.nameColor === item.assetValue) ||
            (item.type === "title" && player.title === item.assetValue) ||
            (item.type === "background" && player.bgId === item.id) ||
            (item.type === "effect" && player.effectId === item.id);

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden ${getRarityClass(
                item.rarity
              )}`}
            >
              {/* Card Body */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  
                  {/* Avatar or Icon Frame with absolute safety (Zero Broken Image) */}
                  <div className="w-11 h-11 rounded-xl bg-slate-950 flex items-center justify-center text-2xl border border-slate-800 shadow-inner shrink-0">
                    {item.type === "avatar" ? item.assetValue : 
                     item.type === "border" ? "🖼️" :
                     item.type === "title" ? "🎖️" : 
                     item.type === "background" ? "🌌" :
                     item.type === "effect" ? "⚡" :
                     item.type === "guild_badge" ? item.assetValue : "🎨"}
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-100 leading-snug">{item.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 max-w-[170px]">{item.description}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-500/10">
                        🎯 {item.type === "guild_badge" ? "خاص بالنقابة والتحالف" : "خاص بالملف والصورة الشخصية"}
                      </span>
                    </div>
                  </div>
                </div>

                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${getRarityBadge(item.rarity)}`}>
                  {item.rarity === "legendary" ? "أسطوري" : 
                   item.rarity === "epic" ? "ملحمي" : 
                   item.rarity === "rare" ? "نادر" : "عام"}
                </span>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setPreviewItem(item);
                  }}
                  className="text-[10px] text-slate-400 hover:text-cyan-400 flex items-center space-x-0.5 space-x-reverse underline font-bold"
                >
                  <Info className="w-3 h-3" />
                  <span>معاينة المظهر</span>
                </button>

                {isOwned ? (
                  <div className="flex items-center space-x-1 space-x-reverse text-emerald-400 text-[10px] font-bold bg-emerald-900/10 px-2 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" />
                    <span>مجهز ومفعل</span>
                  </div>
                ) : (
                  <button
                    disabled={isPurchasing !== null}
                    onClick={() => handlePurchase(item)}
                    className="flex items-center space-x-1 space-x-reverse bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-lg transition-transform active:scale-95 shadow-md shadow-amber-500/10 disabled:opacity-50"
                  >
                    {isPurchasing === item.id ? (
                      <span className="text-[9px]">جاري الشراء...</span>
                    ) : item.priceType === "coins" ? (
                      <>
                        <Coins className="w-3 h-3" />
                        <span>{item.priceValue} ذهبة</span>
                      </>
                    ) : (
                      <>
                        <Gem className="w-3 h-3" />
                        <span>{item.priceValue} جوهرة</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
