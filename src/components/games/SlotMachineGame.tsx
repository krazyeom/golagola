'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, RiggedConfig } from '@/types/lunch';
import { soundEffects } from '@/utils/audio';
import { decideWinner } from '@/utils/storage';
import { Sparkles, Trophy } from 'lucide-react';

interface SlotMachineGameProps {
  menus: MenuItem[];
  riggedConfig: RiggedConfig;
  onFinish: (winner: MenuItem, isDramatic: boolean) => void;
}

export default function SlotMachineGame({ menus, riggedConfig, onFinish }: SlotMachineGameProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [leverPulled, setLeverPulled] = useState(false);
  const [reelStops, setReelStops] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [statusMessage, setStatusMessage] = useState('레버를 당겨 3개의 릴을 일치시키세요!');
  const [isNudgeDramatic, setIsNudgeDramatic] = useState(false);

  // Each reel display indices
  const [reel1Index, setReel1Index] = useState(0);
  const [reel2Index, setReel2Index] = useState(1);
  const [reel3Index, setReel3Index] = useState(2);

  const spinIntervals = useRef<[NodeJS.Timeout | null, NodeJS.Timeout | null, NodeJS.Timeout | null]>([null, null, null]);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      spinIntervals.current.forEach((int) => {
        if (int) clearInterval(int);
      });
    };
  }, []);

  const handlePullLever = () => {
    if (isSpinning || menus.length === 0) return;

    setIsSpinning(true);
    setLeverPulled(true);
    setReelStops([false, false, false]);
    setStatusMessage('🎰 릴이 힘차게 회전합니다!');
    setIsNudgeDramatic(false);

    soundEffects.playLever();
    setTimeout(() => setLeverPulled(false), 400);

    const { targetIndex, isRigged, runnerUpIndex } = decideWinner(menus, riggedConfig);
    const targetItem = menus[targetIndex];

    const doDrama = (isRigged && riggedConfig.dramaticNearMiss) || Math.random() < 0.4;
    setIsNudgeDramatic(doDrama);

    // Start spinning all 3 reels with fast random cycling
    spinIntervals.current[0] = setInterval(() => {
      setReel1Index((prev) => (prev + 1) % menus.length);
      soundEffects.playTick(1.0);
    }, 80);

    spinIntervals.current[1] = setInterval(() => {
      setReel2Index((prev) => (prev + 1) % menus.length);
    }, 70);

    spinIntervals.current[2] = setInterval(() => {
      setReel3Index((prev) => (prev + 1) % menus.length);
    }, 60);

    // Stop Reel 1 at 1.8s
    setTimeout(() => {
      if (spinIntervals.current[0]) clearInterval(spinIntervals.current[0]);
      setReel1Index(targetIndex);
      setReelStops((prev) => [true, prev[1], prev[2]]);
      soundEffects.playReelStop(0);
      setStatusMessage(`첫 번째 릴: [${targetItem.name}] 확정!`);
    }, 1800);

    // Stop Reel 2 at 2.8s
    setTimeout(() => {
      if (spinIntervals.current[1]) clearInterval(spinIntervals.current[1]);
      setReel2Index(targetIndex);
      setReelStops((prev) => [true, true, prev[2]]);
      soundEffects.playReelStop(1);
      setStatusMessage(`두 번째 릴도 [${targetItem.name}] 일치! 마지막 릴은?!`);
    }, 2800);

    // Stop Reel 3 at 4.0s
    setTimeout(() => {
      if (spinIntervals.current[2]) clearInterval(spinIntervals.current[2]);

      if (doDrama) {
        // Dramatic near-miss: stop Reel 3 on runnerUp first!
        setReel3Index(runnerUpIndex);
        setReelStops([true, true, true]);
        soundEffects.playNearMiss();
        setStatusMessage('엇... 옆 칸에서 멈췄나?! 아쉽게 빗나가나...?! 😱');

        // After 750ms of breath-holding tension, NUDGE down into targetIndex!
        setTimeout(() => {
          soundEffects.playTick(1.8);
          soundEffects.playReelStop(2);
          setReel3Index(targetIndex);
          setStatusMessage(`⚡ 기적의 슬롯 넛지(Nudge)! [${targetItem.name}] 트리플 잭팟!`);

          setTimeout(() => {
            setIsSpinning(false);
            onFinish(targetItem, true);
          }, 600);
        }, 850);
      } else {
        // Normal direct hit
        setReel3Index(targetIndex);
        setReelStops([true, true, true]);
        soundEffects.playReelStop(2);
        setStatusMessage(`🎉 [${targetItem.name}] 3연속 잭팟 달성!`);

        setTimeout(() => {
          setIsSpinning(false);
          onFinish(targetItem, false);
        }, 600);
      }
    }, 4000);
  };

  const getReelItem = (index: number) => {
    return menus[index % menus.length] || menus[0];
  };

  const item1 = getReelItem(reel1Index);
  const item2 = getReelItem(reel2Index);
  const item3 = getReelItem(reel3Index);

  return (
    <div className="flex flex-col items-center p-3 sm:p-6 w-full max-w-xl mx-auto">
      {/* Status banner */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-amber-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{statusMessage}</span>
        </div>
      </div>

      {/* Casino Slot Machine Cabinet */}
      <div className="relative w-full bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 border-4 border-amber-500/80 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Golden Cabinet Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-black text-amber-300 tracking-wider uppercase">
              골라골라 럭키 슬롯머신
            </span>
          </div>
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping delay-100" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping delay-200" />
          </div>
        </div>

        {/* Center Display with 3 Reels and Side Lever */}
        <div className="flex items-center gap-3">
          {/* Reel Box */}
          <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 bg-neutral-950 p-2 sm:p-3 rounded-2xl border-2 border-neutral-800 shadow-inner relative">
            {/* Payline Red Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-500/60 z-20 pointer-events-none -translate-y-1/2 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />

            {/* Reel 1 */}
            <div className="relative h-28 sm:h-36 bg-neutral-900 rounded-xl border border-neutral-700/80 flex flex-col items-center justify-center p-2 overflow-hidden shadow-lg">
              <span className="text-4xl sm:text-5xl select-none transform transition-transform hover:scale-110">
                {item1.emoji}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white mt-1.5 truncate max-w-full text-center">
                {item1.name}
              </span>
              {reelStops[0] && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>

            {/* Reel 2 */}
            <div className="relative h-28 sm:h-36 bg-neutral-900 rounded-xl border border-neutral-700/80 flex flex-col items-center justify-center p-2 overflow-hidden shadow-lg">
              <span className="text-4xl sm:text-5xl select-none transform transition-transform hover:scale-110">
                {item2.emoji}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white mt-1.5 truncate max-w-full text-center">
                {item2.name}
              </span>
              {reelStops[1] && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>

            {/* Reel 3 */}
            <div className="relative h-28 sm:h-36 bg-neutral-900 rounded-xl border border-neutral-700/80 flex flex-col items-center justify-center p-2 overflow-hidden shadow-lg">
              <span className="text-4xl sm:text-5xl select-none transform transition-transform hover:scale-110">
                {item3.emoji}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white mt-1.5 truncate max-w-full text-center">
                {item3.name}
              </span>
              {reelStops[2] && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>
          </div>

          {/* Casino Lever */}
          <button
            onClick={handlePullLever}
            disabled={isSpinning || menus.length === 0}
            className="flex flex-col items-center group cursor-pointer disabled:cursor-not-allowed focus:outline-none"
            aria-label="슬롯 레버 당기기"
          >
            <div className="relative w-8 h-28 sm:h-36 flex flex-col items-center justify-start">
              {/* Lever Base */}
              <div className="absolute bottom-0 w-8 h-10 bg-neutral-800 rounded-lg border border-neutral-600 shadow-md" />
              {/* Lever Arm */}
              <div
                className={`w-2.5 bg-gradient-to-r from-neutral-300 via-neutral-100 to-neutral-400 rounded-full transition-all duration-300 shadow-md ${
                  leverPulled ? 'h-16 translate-y-12 rotate-12' : 'h-24 sm:h-28'
                }`}
              />
              {/* Lever Knob / Ball */}
              <div
                className={`w-7 h-7 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 border-2 border-white/60 shadow-lg transition-all duration-300 ${
                  leverPulled ? 'translate-y-12' : 'group-hover:scale-110'
                }`}
              />
            </div>
          </button>
        </div>

        {/* Bottom lights strip */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span>777 JACKPOT SYSTEM</span>
          <span className="text-amber-400 font-mono font-bold">RATE: 100% LUNCH</span>
        </div>
      </div>

      {/* Main Spin Button for Mobile / Desktop */}
      <div className="mt-6 w-full max-w-xs">
        <button
          onClick={handlePullLever}
          disabled={isSpinning || menus.length === 0}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
            isSpinning
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5'
          }`}
        >
          <Sparkles className="w-5 h-5 fill-current" />
          <span>{isSpinning ? '잭팟 추첨 중...' : '슬롯 레버 당기기!'}</span>
        </button>

        {isNudgeDramatic && isSpinning && (
          <p className="text-[11px] text-rose-400 text-center mt-2 animate-pulse">
            ⚡ 아슬아슬 슬롯 Nudge 기믹 대기 중!
          </p>
        )}
      </div>
    </div>
  );
}
