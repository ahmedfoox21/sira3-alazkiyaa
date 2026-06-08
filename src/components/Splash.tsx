/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Crown, HelpCircle } from "lucide-react";
import { sounds } from "./AudioMocks";

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Play a starting welcoming chime
    sounds.playFanfare();

    // Sound pulse ticking
    const t1 = setTimeout(() => {
      setStage(1);
    }, 1000);

    const t2 = setTimeout(() => {
      setStage(2);
    }, 2200);

    const t3 = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0f0926] via-[#0d091a] to-[#070410] text-[#e0def4] overflow-hidden select-none">
      {/* Arabic Geometric Grid Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_65%)]" />
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.div
            key="logo-entrance"
            initial={{ scale: 0.6, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.1, opacity: 0, rotate: 5 }}
            transition={{ type: "spring", damping: 12 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-6">
              {/* Outer Golden Halo */}
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-amber-400 via-purple-600 to-cyan-400 opacity-20 blur-xl animate-pulse" />
              
              <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-slate-900 border-2 border-amber-400 shadow-[0_0_25px_rgba(234,179,8,0.4)]">
                <Brain className="w-14 h-14 text-amber-400 animate-float" />
                <div className="absolute -top-3 -right-2">
                  <Crown className="w-8 h-8 text-amber-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] fill-amber-400 rotate-12" />
                </div>
                <div className="absolute -bottom-1 -left-2">
                  <HelpCircle className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-white drop-shadow-[0_2px_10px_rgba(234,179,8,0.3)] font-sans">
              صِـــــرَاعُ الأَذْكِـــــيَاء
            </h1>
            <p className="mt-2 text-xs text-purple-300 tracking-widest font-mono">
              CLASH OF MINDS
            </p>
          </motion.div>
        )}

        {stage === 1 && (
          <motion.div
            key="tagline"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col items-center text-center px-6"
          >
            <div className="text-amber-400 mb-4 text-lg">✨ فريق التطوير الاحترافي جاهز ✨</div>
            <p className="text-xl md:text-2xl font-bold text-slate-100 max-w-sm">
              أقوى منافسة أسئلة وذكاء مباشرة في العالم العربي
            </p>
            <p className="text-sm text-slate-400 mt-2 max-w-xs">
              مسابقات، شات صوتي حقيقي، نقابات وألقاب أسطورية بانتظارك
            </p>
            <div className="flex space-x-2 space-x-reverse mt-6">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}

        {stage === 2 && (
          <motion.div
            key="ready-load"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-400"
              />
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-widest mt-3 font-mono">
              جاري الاتصال بقنوات اللعب...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
