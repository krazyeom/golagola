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

interface PaperState {
  id: string;
  name: string;
  emoji: string;
  color: string;
  distance: number; // in meters (e.g. 0 to 20)
  rotation: number; // degrees
  yOffset: number; // slight lane offset
  isAirborne: boolean;
  isLeader: boolean;
}

export default function FanGame({ menus, riggedConfig, onFinish }: FanGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fanSpeed, setFanSpeed] = useState<0 | 1 | 2 | 3>(0);
  const [papers, setPapers] = useState<PaperState[]>([]);
  const [statusMessage, setStatusMessage] = useState('선풍기를 강풍으로 틀어 종이를 가장 멀리 날려보세요!');
  const [isDramaticRace, setIsDramaticRace] = useState(false);
  const [gustActive, setGustActive] = useState(false);

  const animRef = useRef<number | null>(null);

  // Initialize papers
  useEffect(() => {
    const initialPapers: PaperState[] = menus.map((m, idx) => ({
      id: m.id,
      name: m.name,
      emoji: m.emoji,
      color: m.color,
      distance: 0,
      rotation: (Math.random() - 0.5) * 15,
      yOffset: (idx - (menus.length - 1) / 2) * 6,
      isAirborne: false,
      isLeader: false,
    }));
    setPapers(initialPapers);
  }, [menus]);

  const handleStartFan = () => {
    if (isPlaying || menus.length === 0) return;

    setIsPlaying(true);
    setFanSpeed(3);
    setStatusMessage('선풍기 터보 가동! 종이들이 날아갑니다! 💨');

    const { targetIndex, isRigged, runnerUpIndex } = decideWinner(menus, riggedConfig);
    const targetItem = menus[targetIndex];
    const runnerUpItem = menus[runnerUpIndex];

    const doDrama = (isRigged && riggedConfig.dramaticNearMiss) || Math.random() < 0.35;
    setIsDramaticRace(doDrama);

    // Target distances
    // Winning distance between 16m and 18.5m
    const winningDist = 17.0 + Math.random() * 1.5;
    const runnerUpDist = doDrama ? winningDist - 0.25 : winningDist - (1.0 + Math.random() * 2.0);

    // Precalculate target final distances for all
    const finalDistances: { [id: string]: number } = {};
    menus.forEach((m, idx) => {
      if (idx === targetIndex) {
        finalDistances[m.id] = winningDist;
      } else if (idx === runnerUpIndex) {
        finalDistances[m.id] = runnerUpDist;
      } else {
        finalDistances[m.id] = 5.0 + Math.random() * (runnerUpDist - 1.5);
      }
    });

    // Sound effects
    soundEffects.playWind(0.6);
    const windInterval = setInterval(() => {
      soundEffects.playWind(0.8);
    }, 280);

    const startTime = performance.now();
    const duration = doDrama ? 5800 : 4500; // ms

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Check for sudden gust event in dramatic mode
      if (doDrama && progress > 0.65 && progress < 0.88) {
        setGustActive(true);
        setStatusMessage('⚡ 돌풍 발생! 마지막 종이가 무섭게 치고 올라옵니다!');
      } else if (progress >= 0.88) {
        setGustActive(false);
      }

      setPapers((prev) => {
        return prev.map((p) => {
          const finalD = finalDistances[p.id] || 10;
          let currentD: number;

          if (doDrama && p.id === targetItem.id) {
            // Target paper starts slower, lags behind runner-up, then surges at progress 0.65+
            if (progress < 0.65) {
              const pNorm = progress / 0.65;
              currentD = finalD * 0.55 * (1 - Math.pow(1 - pNorm, 2));
            } else {
              const pNorm = (progress - 0.65) / 0.35;
              const surgeEase = Math.pow(pNorm, 2.2);
              const remaining = finalD - finalD * 0.55;
              currentD = finalD * 0.55 + remaining * surgeEase;
            }
          } else if (doDrama && p.id === runnerUpItem.id) {
            // Runner-up flies out fast and early
            const ease = 1 - Math.pow(1 - progress, 2.5);
            currentD = finalD * ease;
          } else {
            // Normal papers
            const ease = 1 - Math.pow(1 - progress, 2.8);
            currentD = finalD * ease;
          }

          const flutter = Math.sin(progress * 25 + p.distance * 3) * 12;
          const isAirborne = progress < 0.95;

          return {
            ...p,
            distance: currentD,
            rotation: flutter + (progress * 20) % 360 * 0.1,
            isAirborne,
          };
        });
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        clearInterval(windInterval);
        setIsPlaying(false);
        setFanSpeed(0);
        setStatusMessage(`🏆 [${targetItem.name}] 가장 멀리 날아가서 당첨!`);
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

  // Sort papers by distance descending for leader badge
  const sorted = [...papers].sort((a, b) => b.distance - a.distance);
  const leaderId = sorted[0]?.distance > 0.5 ? sorted[0]?.id : null;

  return (
    <div className="flex flex-col items-center p-3 sm:p-5 w-full max-w-2xl mx-auto">
      {/* Top Banner */}
      <div className="mb-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-sky-300">
          <Wind className={`w-4 h-4 ${fanSpeed > 0 ? 'animate-spin text-sky-400' : 'text-neutral-400'}`} />
          <span>{statusMessage}</span>
        </div>
      </div>

      {/* Main Fan & Track Arena */}
      <div className="relative w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-4 overflow-hidden shadow-2xl">
        {/* Fan Wind Trails Background Animation */}
        {fanSpeed > 0 && (
          <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
            <div className="absolute top-1/4 left-0 w-full h-0.5 bg-gradient-to-r from-sky-400 to-transparent animate-pulse" />
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-300 to-transparent animate-pulse delay-100" />
            <div className="absolute top-3/4 left-0 w-full h-0.5 bg-gradient-to-r from-sky-500 to-transparent animate-pulse delay-200" />
          </div>
        )}

        {/* Fan Device & Wind Indicator */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800/80">
          <div className="relative w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shadow-lg">
            <span className={`text-2xl select-none ${fanSpeed > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: fanSpeed === 3 ? '0.2s' : '0.6s' }}>
              🌀
            </span>
            {fanSpeed > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sky-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>터보 에어제트 서큘레이터</span>
              {gustActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-bounce">
                  돌풍!
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              바람의 방향과 종이의 무게중심에 따라 가장 멀리 도달한 쪽지가 승리합니다.
            </p>
          </div>
        </div>

        {/* Track Measuring Scale (0m -> 20m) */}
        <div className="relative w-full h-6 mb-2 border-b border-neutral-800 flex justify-between text-[10px] text-neutral-500 font-mono px-1">
          <span>0m (출발선)</span>
          <span>5m</span>
          <span>10m</span>
          <span>15m</span>
          <span className="text-amber-400 font-bold">20m (결승선)</span>
        </div>

        {/* Papers Flying Track Container */}
        <div className="relative w-full min-h-[300px] sm:min-h-[340px] bg-neutral-900/50 rounded-2xl p-2 flex flex-col justify-between overflow-hidden">
          {papers.map((p, idx) => {
            const isLeader = p.id === leaderId;
            // Calculate percentage across the track (0m to 20m)
            const leftPercent = Math.min((p.distance / 20) * 100, 94);

            return (
              <div
                key={p.id}
                className="relative h-7 sm:h-8 flex items-center transition-all"
              >
                {/* Lane line */}
                <div className="absolute inset-x-0 h-px bg-neutral-800/40" />

                {/* Flying Paper Slip */}
                <div
                  className="absolute flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg transition-transform duration-75 select-none"
                  style={{
                    left: `${leftPercent}%`,
                    transform: `translateY(${p.yOffset}px) rotate(${p.rotation}deg) scale(${isLeader ? 1.05 : 0.95})`,
                    backgroundColor: p.color,
                    color: '#FFFFFF',
                    boxShadow: isLeader
                      ? '0 0 15px rgba(245, 158, 11, 0.8), 0 4px 6px rgba(0,0,0,0.4)'
                      : '0 2px 5px rgba(0,0,0,0.3)',
                    zIndex: isLeader ? 30 : idx + 1,
                  }}
                >
                  <span className="text-sm">{p.emoji}</span>
                  <span className="whitespace-nowrap drop-shadow">{p.name}</span>
                  <span className="text-[10px] font-mono opacity-85">
                    {p.distance.toFixed(1)}m
                  </span>
                  {isLeader && (
                    <Trophy className="w-3 h-3 text-amber-200 fill-amber-300 ml-0.5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Button */}
      <div className="mt-5 w-full max-w-xs">
        <button
          onClick={handleStartFan}
          disabled={isPlaying || menus.length === 0}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
            isPlaying
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 hover:from-sky-300 hover:to-emerald-300 text-neutral-950 shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isPlaying ? '강풍으로 날아가는 중...' : '선풍기 켜서 날리기!'}</span>
        </button>

        {isDramaticRace && isPlaying && (
          <p className="text-[11px] text-sky-400 text-center mt-2 flex items-center justify-center gap-1 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>치열한 접전! 0.1m 차이의 승부!</span>
          </p>
        )}
      </div>
    </div>
  );
}
