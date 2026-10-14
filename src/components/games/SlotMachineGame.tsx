'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, RiggedConfig } from '@/types/lunch';
import { soundEffects } from '@/utils/audio';
import { decideWinner } from '@/utils/storage';
import { Sparkles, Trophy, Flame } from 'lucide-react';

interface SlotMachineGameProps {
  menus: MenuItem[];
  riggedConfig: RiggedConfig;
  onFinish: (winner: MenuItem, isDramatic: boolean) => void;
}

// Reel item height in px
const ITEM_HEIGHT = 100;

export default function SlotMachineGame({ menus, riggedConfig, onFinish }: SlotMachineGameProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [leverPulled, setLeverPulled] = useState(false);
  const [statusMessage, setStatusMessage] = useState('레버를 당겨 3개의 릴을 일치시키세요!');
  const [isNudgeActive, setIsNudgeActive] = useState(false);

  // Reel offsets in pixels
  const [offset1, setOffset1] = useState(0);
  const [offset2, setOffset2] = useState(0);
  const [offset3, setOffset3] = useState(0);

  // Locked states
  const [locked1, setLocked1] = useState(false);
  const [locked2, setLocked2] = useState(false);
  const [locked3, setLocked3] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  // Create an extended repeating strip so it can scroll infinitely
  const strip = [...menus, ...menus, ...menus, ...menus, ...menus];
  const stripHeight = menus.length * ITEM_HEIGHT;

  const handlePullLever = () => {
    if (isSpinning || menus.length === 0) return;

    setIsSpinning(true);
    setLeverPulled(true);
    setLocked1(false);
    setLocked2(false);
    setLocked3(false);
    setIsNudgeActive(false);
    setStatusMessage('🎰 릴이 초고속으로 회전합니다!');

    soundEffects.playLever();
    setTimeout(() => setLeverPulled(false), 380);

    const { targetIndex, isRigged, runnerUpIndex } = decideWinner(menus, riggedConfig);
    const targetItem = menus[targetIndex];

    const doDrama = (isRigged && riggedConfig.dramaticNearMiss) || Math.random() < 0.4;

    // Speeds in px per frame
    let speed1 = 28;
    let speed2 = 32;
    let speed3 = 36;

    let curr1 = offset1;
    let curr2 = offset2;
    let curr3 = offset3;

    let stopReel1 = false;
    let stopReel2 = false;
    let stopReel3 = false;

    // Calculate target stop offsets (center on targetIndex)
    // The center view window shows item at: targetIndex * ITEM_HEIGHT
    const targetOffset = targetIndex * ITEM_HEIGHT;
    const runnerUpOffset = runnerUpIndex * ITEM_HEIGHT;

    // Stop Reel 1 at 1.8s
    setTimeout(() => {
      stopReel1 = true;
    }, 1800);

    // Stop Reel 2 at 2.8s
    setTimeout(() => {
      stopReel2 = true;
    }, 2800);

    // Stop Reel 3 at 3.9s
    setTimeout(() => {
      stopReel3 = true;
    }, 3900);

    let lastTickTime = performance.now();

    const loop = () => {
      const now = performance.now();
      if (now - lastTickTime > 90) {
        lastTickTime = now;
        soundEffects.playTick(1.2);
      }

      // Reel 1 motion
      if (!stopReel1) {
        curr1 = (curr1 + speed1) % stripHeight;
        setOffset1(curr1);
      } else {
        const diff1 = (targetOffset - (curr1 % stripHeight) + stripHeight) % stripHeight;
        if (diff1 > 2) {
          curr1 = (curr1 + Math.max(diff1 * 0.16, 2.5)) % stripHeight;
        } else {
          curr1 = targetOffset;
        }
        setOffset1(curr1);
        if (curr1 === targetOffset && !locked1) {
          setLocked1(true);
          soundEffects.playReelStop(0);
          setStatusMessage(`첫 번째 릴: [${targetItem.name}] 적중!`);
        }
      }

      // Reel 2 motion
      if (!stopReel2) {
        curr2 = (curr2 + speed2) % stripHeight;
        setOffset2(curr2);
      } else {
        const diff2 = (targetOffset - (curr2 % stripHeight) + stripHeight) % stripHeight;
        if (diff2 > 2) {
          curr2 = (curr2 + Math.max(diff2 * 0.16, 2.5)) % stripHeight;
        } else {
          curr2 = targetOffset;
        }
        setOffset2(curr2);
        if (curr2 === targetOffset && !locked2) {
          setLocked2(true);
          soundEffects.playReelStop(1);
          setStatusMessage(`두 번째 릴도 [${targetItem.name}] 일치! 마지막 릴은?!`);
        }
      }

      // Reel 3 motion
      if (!stopReel3) {
        curr3 = (curr3 + speed3) % stripHeight;
        setOffset3(curr3);
      } else {
        const destOffset = doDrama ? runnerUpOffset : targetOffset;
        const diff3 = (destOffset - (curr3 % stripHeight) + stripHeight) % stripHeight;
        if (diff3 > 2) {
          curr3 = (curr3 + Math.max(diff3 * 0.16, 2.5)) % stripHeight;
        } else {
          curr3 = destOffset;
        }
        setOffset3(curr3);

        if (curr3 === destOffset && !locked3) {
          setLocked3(true);

          if (doDrama) {
            soundEffects.playNearMiss();
            setStatusMessage('엇... 한 칸 빗나갔나?! 꽝인가...?! 😱');

            // NUDGE Mechanic after 800ms
            setTimeout(() => {
              setIsNudgeActive(true);
              soundEffects.playTick(1.8, true);
              soundEffects.playReelStop(2);
              setOffset3(targetOffset);
              setStatusMessage(`⚡ 기적의 슬롯 넛지(Nudge)! [${targetItem.name}] 트리플 잭팟!`);

              setTimeout(() => {
                setIsSpinning(false);
                onFinish(targetItem, true);
              }, 600);
            }, 850);
          } else {
            soundEffects.playReelStop(2);
            setStatusMessage(`🎉 [${targetItem.name}] 3연속 잭팟 달성!`);

            setTimeout(() => {
              setIsSpinning(false);
              onFinish(targetItem, false);
            }, 600);
          }
          return;
        }
      }

      if (!locked3 || (stopReel3 && Math.abs((doDrama ? runnerUpOffset : targetOffset) - (curr3 % stripHeight)) >= 1)) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-3 sm:p-5 w-full max-w-xl mx-auto">
      {/* Status banner */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-amber-300 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{statusMessage}</span>
        </div>
      </div>

      {/* Luxury Casino Slot Cabinet */}
      <div className="relative w-full bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 border-4 border-amber-500 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden">
        {/* Golden Crown Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-sm sm:text-base font-black text-amber-300 tracking-wider uppercase">
              GOLDEN LUNCH 777 JACKPOT
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping delay-100" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping delay-200" />
          </div>
        </div>

        {/* Reels Frame with Side Lever */}
        <div className="flex items-center gap-3">
          {/* 3-Reel Display Window */}
          <div className="relative flex-1 grid grid-cols-3 gap-2 sm:gap-3 bg-neutral-950 p-2 sm:p-3 rounded-2xl border-2 border-neutral-800 h-[150px] sm:h-[180px] overflow-hidden shadow-inner">
            {/* Top & Bottom Cylinder Shadow Masks (Creates 3D Drum Look) */}
            <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-transparent z-20 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent z-20 pointer-events-none" />

            {/* Red Glowing Center Payline */}
            <div className="absolute top-1/2 inset-x-0 h-0.5 bg-rose-500 z-20 pointer-events-none -translate-y-1/2 shadow-[0_0_12px_#F43F5E]" />

            {/* Reel 1 Column */}
            <div className="relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
              <div
                className="absolute inset-x-0 flex flex-col items-center transition-transform"
                style={{
                  transform: `translateY(${-offset1 + (150 - ITEM_HEIGHT) / 2}px)`,
                }}
              >
                {strip.map((item, idx) => (
                  <div
                    key={`r1-${idx}`}
                    className="h-[100px] flex flex-col items-center justify-center select-none"
                  >
                    <span className="text-3xl sm:text-4xl">{item.emoji}</span>
                    <span className="text-[11px] font-bold text-white mt-1 truncate max-w-[80px]">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reel 2 Column */}
            <div className="relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
              <div
                className="absolute inset-x-0 flex flex-col items-center transition-transform"
                style={{
                  transform: `translateY(${-offset2 + (150 - ITEM_HEIGHT) / 2}px)`,
                }}
              >
                {strip.map((item, idx) => (
                  <div
                    key={`r2-${idx}`}
                    className="h-[100px] flex flex-col items-center justify-center select-none"
                  >
                    <span className="text-3xl sm:text-4xl">{item.emoji}</span>
                    <span className="text-[11px] font-bold text-white mt-1 truncate max-w-[80px]">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reel 3 Column */}
            <div className="relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
              <div
                className="absolute inset-x-0 flex flex-col items-center transition-transform"
                style={{
                  transform: `translateY(${-offset3 + (150 - ITEM_HEIGHT) / 2}px)`,
                }}
              >
                {strip.map((item, idx) => (
                  <div
                    key={`r3-${idx}`}
                    className="h-[100px] flex flex-col items-center justify-center select-none"
                  >
                    <span className="text-3xl sm:text-4xl">{item.emoji}</span>
                    <span className="text-[11px] font-bold text-white mt-1 truncate max-w-[80px]">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3D Casino Mechanical Lever */}
          <button
            onClick={handlePullLever}
            disabled={isSpinning || menus.length === 0}
            className="flex flex-col items-center cursor-pointer disabled:cursor-not-allowed group focus:outline-none"
            aria-label="슬롯 레버 당기기"
          >
            <div className="relative w-8 h-36 flex flex-col items-center justify-start">
              {/* Mechanical Pivot Base */}
              <div className="absolute bottom-0 w-8 h-10 bg-neutral-800 rounded-xl border border-neutral-600 shadow-md" />
              {/* Metallic Shaft */}
              <div
                className={`w-2.5 bg-gradient-to-r from-neutral-200 via-white to-neutral-400 rounded-full transition-all duration-300 shadow-lg ${
                  leverPulled ? 'h-16 translate-y-12 rotate-12' : 'h-28'
                }`}
              />
              {/* Glossy Red Knob */}
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-tr from-rose-700 via-rose-500 to-rose-300 border-2 border-white/80 shadow-xl transition-all duration-300 ${
                  leverPulled ? 'translate-y-12 scale-95' : 'group-hover:scale-110'
                }`}
              />
            </div>
          </button>
        </div>

        {/* Bottom Payout Line */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 font-mono">
          <span>PAYLINE: 100% TODAY LUNCH</span>
          <span className="text-amber-400 font-bold">MATCH 3 TO WIN</span>
        </div>
      </div>

      {/* Main Spin Button */}
      <div className="mt-5 w-full max-w-xs">
        <button
          onClick={handlePullLever}
          disabled={isSpinning || menus.length === 0}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
            isSpinning
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5'
          }`}
        >
          <Sparkles className="w-5 h-5 fill-current" />
          <span>{isSpinning ? '잭팟 회전 중...' : '슬롯 레버 당기기!'}</span>
        </button>

        {isNudgeActive && (
          <p className="text-[11px] text-rose-400 text-center mt-2 flex items-center justify-center gap-1 animate-pulse font-bold">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>기적의 슬롯 넛지(Nudge) 발동!</span>
          </p>
        )}
      </div>
    </div>
  );
}
