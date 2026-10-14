'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, RiggedConfig } from '@/types/lunch';
import { soundEffects } from '@/utils/audio';
import { decideWinner } from '@/utils/storage';
import { Wind, Play, Trophy, Sparkles } from 'lucide-react';

interface FanGameProps {
  menus: MenuItem[];
  riggedConfig: RiggedConfig;
  onFinish: (winner: MenuItem, isDramatic: boolean) => void;
}

interface PaperItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dist: number; // in meters (0 to 20)
  rotZ: number;
  isWinner: boolean;
}

export default function FanGame({ menus, riggedConfig, onFinish }: FanGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fanLevel, setFanLevel] = useState<0 | 1 | 2 | 3>(0);
  const [bladeAngle, setBladeAngle] = useState(0);
  const [papers, setPapers] = useState<PaperItem[]>([]);
  const [statusText, setStatusText] = useState('선풍기를 강풍으로 켜서 종이를 날려보세요!');
  const [isDramaticRace, setIsDramaticRace] = useState(false);
  const [isGustTriggered, setIsGustTriggered] = useState(false);

  const animRef = useRef<number | null>(null);
  const bladeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize paper objects
  useEffect(() => {
    const list: PaperItem[] = menus.map((m) => ({
      id: m.id,
      name: m.name,
      emoji: m.emoji,
      color: m.color,
      dist: 0,
      rotZ: (Math.random() - 0.5) * 8,
      isWinner: false,
    }));
    setPapers(list);
  }, [menus]);

  // Fan blade rotation animation
  useEffect(() => {
    if (fanLevel > 0) {
      bladeTimerRef.current = setInterval(() => {
        setBladeAngle((prev) => (prev + (fanLevel === 3 ? 45 : 20)) % 360);
      }, 30);
    } else {
      if (bladeTimerRef.current) clearInterval(bladeTimerRef.current);
    }
    return () => {
      if (bladeTimerRef.current) clearInterval(bladeTimerRef.current);
    };
  }, [fanLevel]);

  const handleStart = () => {
    if (isPlaying || menus.length === 0) return;

    setIsPlaying(true);
    setFanLevel(3);
    setStatusText('💨 터보 제트풍 가동! 종이들이 날아갑니다!');

    const { targetIndex, isRigged, runnerUpIndex } = decideWinner(menus, riggedConfig);
    const targetItem = menus[targetIndex];
    const runnerUpItem = menus[runnerUpIndex];

    const doDrama = (isRigged && riggedConfig.dramaticNearMiss) || Math.random() < 0.35;
    setIsDramaticRace(doDrama);
    setIsGustTriggered(false);

    // Final distances (meters)
    const winDistance = 18.2 + Math.random() * 1.0;
    const runnerUpDistance = doDrama ? winDistance - 0.2 : winDistance - (1.2 + Math.random() * 1.5);

    const targetDists: { [id: string]: number } = {};
    menus.forEach((m, idx) => {
      if (idx === targetIndex) {
        targetDists[m.id] = winDistance;
      } else if (idx === runnerUpIndex) {
        targetDists[m.id] = runnerUpDistance;
      } else {
        targetDists[m.id] = 5.0 + Math.random() * (runnerUpDistance - 2.0);
      }
    });

    soundEffects.playWind(0.8);
    const soundInterval = setInterval(() => {
      soundEffects.playWind(isGustTriggered ? 1.0 : 0.7);
    }, 240);

    const startTime = performance.now();
    const duration = doDrama ? 5800 : 4500;

    const step = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (doDrama && progress > 0.65 && progress < 0.88) {
        setIsGustTriggered(true);
        setStatusText('⚡ 뒷바람 돌풍 발생! 마지막 종이가 무섭게 날아오릅니다!');
      } else if (progress >= 0.88) {
        setIsGustTriggered(false);
      }

      setPapers((prev) => {
        return prev.map((p) => {
          const finalD = targetDists[p.id] || 10;
          let currentD = 0;

          if (doDrama && p.id === targetItem.id) {
            // Continuous aerodynamic curve: steady acceleration, surging smoothly into lead
            const ease = Math.pow(progress, 1.9) * 0.7 + (1 - Math.pow(1 - progress, 2.2)) * 0.3;
            currentD = finalD * ease;
          } else if (doDrama && p.id === runnerUpItem.id) {
            const ease = 1 - Math.pow(1 - progress, 2.6);
            currentD = finalD * ease;
          } else {
            const ease = 1 - Math.pow(1 - progress, 2.8);
            currentD = finalD * ease;
          }

          const isFlying = progress < 0.96;
          const flutter = isFlying ? Math.sin(progress * 25 + p.dist * 3) * 12 : 0;

          return {
            ...p,
            dist: currentD,
            rotZ: flutter,
          };
        });
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        clearInterval(soundInterval);
        setIsPlaying(false);
        setFanLevel(0);
        setStatusText(`🏆 [${targetItem.name}] ${winDistance.toFixed(1)}m 최고 비거리 당첨!`);

        setPapers((prev) =>
          prev.map((p) => ({ ...p, isWinner: p.id === targetItem.id }))
        );

        setTimeout(() => {
          onFinish(targetItem, doDrama);
        }, 600);
      }
    };

    animRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const sorted = [...papers].sort((a, b) => b.dist - a.dist);
  const leaderId = sorted[0]?.dist > 1 ? sorted[0]?.id : null;

  return (
    <div className="flex flex-col items-center p-2 sm:p-4 w-full max-w-2xl mx-auto">
      {/* Top Banner */}
      <div className="mb-3 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-sky-300 shadow-md">
          <Wind className={`w-4 h-4 ${fanLevel > 0 ? 'animate-spin text-sky-400' : 'text-neutral-400'}`} />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Main Runway Arena Box */}
      <div className="relative w-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-3 sm:p-4 shadow-2xl">
        {/* Top Header Information & Speed */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>🌀 윈드 터널 비거리 챌린지</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-sky-400 font-mono text-[10px]">
              {fanLevel === 3 ? 'TURBO MAX' : '대기중'}
            </span>
          </div>

          {leaderId && (
            <div className="flex items-center gap-1 text-amber-300 text-[11px] font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>1위: {papers.find((p) => p.id === leaderId)?.name}</span>
            </div>
          )}
        </div>

        {/* Measuring Ruler (0m to 20m) */}
        <div className="relative w-full h-5 mb-1.5 flex justify-between text-[10px] text-neutral-400 font-mono pl-14 pr-2 select-none border-b border-neutral-800/60">
          <span>0m</span>
          <span>5m</span>
          <span>10m</span>
          <span>15m</span>
          <span className="text-amber-400 font-bold">🏁 20m 결승</span>
        </div>

        {/* Track Arena: Left Fan Unit + Right Flying Runway */}
        <div className="relative w-full flex items-stretch rounded-2xl bg-neutral-950/80 border border-neutral-800 p-1 sm:p-2">
          {/* 1. Integrated Animated Electric Fan Station on the Left */}
          <div className="w-12 sm:w-14 flex-shrink-0 flex flex-col items-center justify-center border-r border-neutral-800/90 pr-1 py-1 z-20 bg-neutral-950/60 rounded-l-xl">
            {/* Fan Housing */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-700 flex items-center justify-center shadow-lg">
              {/* Outer Circular Guard */}
              <div className="absolute inset-0.5 rounded-full border border-sky-400/50" />
              {/* 3 Spinning Propeller Blades */}
              <div
                className="relative w-7 h-7 flex items-center justify-center transition-transform"
                style={{ transform: `rotate(${bladeAngle}deg)` }}
              >
                <div className="absolute w-2 h-6 bg-gradient-to-t from-neutral-200 to-neutral-400 rounded-full shadow" />
                <div className="absolute w-2 h-6 bg-gradient-to-t from-neutral-200 to-neutral-400 rounded-full shadow rotate-60" />
                <div className="absolute w-2 h-6 bg-gradient-to-t from-neutral-200 to-neutral-400 rounded-full shadow rotate-120" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-neutral-950 z-10" />
              </div>

              {fanLevel > 0 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
              )}
            </div>

            {/* Fan Stand / Base */}
            <div className="w-5 h-2 bg-neutral-800 rounded-b mt-1 border-t border-neutral-700" />
            <span className="text-[9px] font-mono font-bold text-sky-400 mt-1">FAN</span>
          </div>

          {/* 2. Runway Lanes with Flying Papers */}
          <div className="relative flex-1 min-h-[360px] sm:min-h-[380px] flex flex-col justify-between py-1 pl-1">
            {/* Wind Vortex Streams */}
            {fanLevel > 0 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400/80 via-white/40 to-transparent blur-[1px] animate-pulse" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-300/60 to-transparent blur-[1px] animate-pulse delay-75" />
                <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500/80 via-white/30 to-transparent blur-[1px] animate-pulse delay-150" />
                {isGustTriggered && (
                  <div className="absolute inset-0 bg-sky-500/15 backdrop-blur-[0.5px] flex items-center justify-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[11px] animate-bounce shadow-lg">
                      ⚡ TURBO GUST! 역전 돌풍!
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 10 Paper Lanes */}
            {papers.map((p, idx) => {
              const isLeader = p.id === leaderId;
              // Safe percentage: starts at 0% (right after fan), reaches up to 88% so full badge never clips
              const leftPercent = Math.min((p.dist / 20) * 85, 85);

              return (
                <div
                  key={p.id}
                  className="relative h-6 sm:h-7 flex items-center w-full"
                >
                  {/* Subtle runway lane divider */}
                  <div className="absolute inset-x-0 h-px bg-neutral-800/40" />

                  {/* Paper Slip: fully contained inside runway */}
                  <div
                    className="absolute flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold select-none cursor-default shadow-md transition-transform duration-75 max-w-[125px] sm:max-w-[150px]"
                    style={{
                      left: `${leftPercent}%`,
                      transform: `rotate(${p.rotZ}deg) scale(${isLeader ? 1.05 : 0.95})`,
                      backgroundColor: p.color,
                      color: '#FFFFFF',
                      boxShadow: isLeader
                        ? '0 0 12px rgba(245, 158, 11, 0.7), 0 3px 6px rgba(0, 0, 0, 0.5)'
                        : '0 2px 4px rgba(0, 0, 0, 0.4)',
                      border: isLeader ? '1.5px solid #FEF08A' : '1px solid rgba(255,255,255,0.2)',
                      zIndex: isLeader ? 35 : idx + 2,
                    }}
                  >
                    <span className="text-sm select-none">{p.emoji}</span>
                    <span className="truncate text-[10px] sm:text-[11px] font-bold drop-shadow">
                      {p.name}
                    </span>
                    <span className="text-[9px] font-mono opacity-85 ml-auto pl-1">
                      {p.dist.toFixed(1)}m
                    </span>
                    {isLeader && (
                      <Trophy className="w-3 h-3 text-yellow-200 fill-yellow-300 ml-0.5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4 w-full max-w-xs">
        <button
          onClick={handleStart}
          disabled={isPlaying || menus.length === 0}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
            isPlaying
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 hover:from-sky-300 hover:to-emerald-300 text-neutral-950 shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isPlaying ? '종이 날리는 중...' : '선풍기 켜서 날리기!'}</span>
        </button>

        {isDramaticRace && isPlaying && (
          <p className="text-[11px] text-sky-400 text-center mt-2 flex items-center justify-center gap-1 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>0.1m 차이 숨막히는 명승부 진행 중!</span>
          </p>
        )}
      </div>
    </div>
  );
}
