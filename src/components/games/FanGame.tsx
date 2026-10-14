'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, RiggedConfig } from '@/types/lunch';
import { soundEffects } from '@/utils/audio';
import { decideWinner } from '@/utils/storage';
import { Wind, Play, Trophy, Sparkles, Flame } from 'lucide-react';

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
  rotX: number; // 3D rotation
  rotZ: number;
  elevation: number; // Y lift in px
  laneY: number; // lane position
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
    const list: PaperItem[] = menus.map((m, idx) => ({
      id: m.id,
      name: m.name,
      emoji: m.emoji,
      color: m.color,
      dist: 0,
      rotX: 0,
      rotZ: (Math.random() - 0.5) * 12,
      elevation: 0,
      laneY: (idx - (menus.length - 1) / 2) * 5.5,
      isWinner: false,
    }));
    setPapers(list);
  }, [menus]);

  // Blade rotation when fan is active
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

    // Final distances
    const winDistance = 17.5 + Math.random() * 1.2;
    const runnerUpDistance = doDrama ? winDistance - 0.25 : winDistance - (1.2 + Math.random() * 1.5);

    const targetDists: { [id: string]: number } = {};
    menus.forEach((m, idx) => {
      if (idx === targetIndex) {
        targetDists[m.id] = winDistance;
      } else if (idx === runnerUpIndex) {
        targetDists[m.id] = runnerUpDistance;
      } else {
        targetDists[m.id] = 6.0 + Math.random() * (runnerUpDistance - 2.0);
      }
    });

    // Sound loop
    soundEffects.playWind(0.8);
    const soundInterval = setInterval(() => {
      soundEffects.playWind(isGustTriggered ? 1.0 : 0.7);
    }, 240);

    const startTime = performance.now();
    const duration = doDrama ? 5800 : 4500;

    const step = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Sudden Gust Event in dramatic mode
      if (doDrama && progress > 0.68 && progress < 0.88) {
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
            // Runner up shoots out early, then glides
            const ease = 1 - Math.pow(1 - progress, 2.6);
            currentD = finalD * ease;
          } else {
            const ease = 1 - Math.pow(1 - progress, 2.8);
            currentD = finalD * ease;
          }

          // Airborne 3D flutter
          const isFlying = progress < 0.96;
          const flutter = isFlying ? Math.sin(progress * 30 + p.dist * 4) * 22 : 0;
          const elevation = isFlying ? Math.abs(Math.sin(progress * 15 + p.laneY)) * 14 : 0;

          return {
            ...p,
            dist: currentD,
            rotX: isFlying ? Math.cos(progress * 20) * 20 : 0,
            rotZ: p.rotZ + flutter * 0.1,
            elevation,
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

  // Leader detection
  const sorted = [...papers].sort((a, b) => b.dist - a.dist);
  const leaderId = sorted[0]?.dist > 1 ? sorted[0]?.id : null;

  return (
    <div className="flex flex-col items-center p-3 sm:p-5 w-full max-w-2xl mx-auto">
      {/* Top Banner */}
      <div className="mb-3 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-sky-300 shadow-md">
          <Wind className={`w-4 h-4 ${fanLevel > 0 ? 'animate-spin text-sky-400' : 'text-neutral-400'}`} />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Main 3D Desk Runway Arena */}
      <div className="relative w-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-4 sm:p-5 overflow-hidden shadow-2xl">
        {/* Fan Wind Gust Particles */}
        {fanLevel > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            <div className="absolute top-1/3 left-16 right-0 h-1 bg-gradient-to-r from-sky-400/80 via-white/40 to-transparent blur-[1px] animate-pulse" />
            <div className="absolute top-1/2 left-16 right-0 h-0.5 bg-gradient-to-r from-cyan-300/60 to-transparent blur-[1px] animate-pulse delay-75" />
            <div className="absolute top-2/3 left-16 right-0 h-1 bg-gradient-to-r from-sky-500/80 via-white/30 to-transparent blur-[1px] animate-pulse delay-150" />
            {isGustTriggered && (
              <div className="absolute inset-0 bg-sky-500/10 backdrop-blur-[0.5px] transition-all flex items-center justify-center">
                <span className="px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs animate-bounce shadow-lg">
                  ⚡ TURBO GUST! 역전 돌풍 발생!
                </span>
              </div>
            )}
          </div>
        )}

        {/* Desk Header with Electric Fan Graphic */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            {/* Illustrated Desk Fan */}
            <div className="relative w-14 h-14 bg-neutral-800 rounded-2xl border-2 border-neutral-700 flex items-center justify-center shadow-inner overflow-hidden">
              {/* Fan Cage Wire */}
              <div className="absolute inset-1 rounded-full border border-sky-400/40" />
              {/* Spinning 3 Blades */}
              <div
                className="relative w-9 h-9 flex items-center justify-center transition-transform"
                style={{ transform: `rotate(${bladeAngle}deg)` }}
              >
                <div className="absolute w-2.5 h-7 bg-gradient-to-t from-neutral-200 to-neutral-400 rounded-full shadow" />
                <div className="absolute w-2.5 h-7 bg-gradient-to-t from-neutral-200 to-neutral-400 rounded-full shadow rotate-60" />
                <div className="absolute w-2.5 h-7 bg-gradient-to-t from-neutral-200 to-neutral-400 rounded-full shadow rotate-120" />
                <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-neutral-900 z-10 shadow" />
              </div>
              {fanLevel > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sky-400 animate-ping" />
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>터보 에어제트 윈드 터널</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-sky-400 font-mono">
                  {fanLevel === 3 ? 'SPEED: TURBO MAX' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                바람을 타고 가장 멀리 날아간 메뉴 쪽지가 최종 승리합니다.
              </p>
            </div>
          </div>

          {/* Leader Badge */}
          {leaderId && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>선두: {papers.find((p) => p.id === leaderId)?.name}</span>
            </div>
          )}
        </div>

        {/* Measuring Runway Scale (0m to 20m) */}
        <div className="relative w-full h-6 mb-2 border-b border-neutral-800 flex justify-between text-[10px] text-neutral-500 font-mono px-2 select-none">
          <span>🚩 0m</span>
          <span>5m</span>
          <span>10m</span>
          <span>15m</span>
          <span className="text-amber-400 font-bold">🏁 20m 결승</span>
        </div>

        {/* Paper Race Tracks Container */}
        <div className="relative w-full min-h-[320px] sm:min-h-[350px] bg-neutral-950/70 rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden border border-neutral-800/80">
          {papers.map((p, idx) => {
            const isLeader = p.id === leaderId;
            const leftPercent = Math.min((p.dist / 20) * 100, 93);

            return (
              <div
                key={p.id}
                className="relative h-7 flex items-center transition-all"
              >
                {/* Subtle lane guide line */}
                <div className="absolute inset-x-0 h-px bg-neutral-800/30" />

                {/* 3D Paper Slip */}
                <div
                  className="absolute flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold select-none cursor-default transition-transform duration-75"
                  style={{
                    left: `${leftPercent}%`,
                    transform: `translateY(${p.laneY - p.elevation}px) rotateZ(${p.rotZ}deg) rotateX(${p.rotX}deg) scale(${isLeader ? 1.08 : 0.95})`,
                    backgroundColor: p.color,
                    color: '#FFFFFF',
                    boxShadow: isLeader
                      ? '0 10px 20px -3px rgba(245, 158, 11, 0.7), 0 4px 6px -2px rgba(0, 0, 0, 0.5)'
                      : '0 4px 8px -1px rgba(0, 0, 0, 0.4)',
                    border: isLeader ? '1.5px solid #FEF08A' : '1px solid rgba(255,255,255,0.2)',
                    zIndex: isLeader ? 35 : idx + 2,
                  }}
                >
                  <span className="text-sm">{p.emoji}</span>
                  <span className="whitespace-nowrap drop-shadow-md text-[11px] sm:text-xs">
                    {p.name}
                  </span>
                  <span className="text-[10px] font-mono opacity-85 ml-1">
                    {p.dist.toFixed(1)}m
                  </span>
                  {isLeader && (
                    <Trophy className="w-3.5 h-3.5 text-yellow-200 fill-yellow-300 ml-0.5 animate-bounce" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-5 w-full max-w-xs">
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
