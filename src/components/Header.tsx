'use client';

import React from 'react';
import { GameMode, RiggedConfig } from '@/types/lunch';
import { Volume2, VolumeX, Settings, Disc3, Wind, Sparkles, Network } from 'lucide-react';
import { soundEffects } from '@/utils/audio';

interface HeaderProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  riggedConfig: RiggedConfig;
}

export default function Header({
  currentMode,
  onSelectMode,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  riggedConfig,
}: HeaderProps) {
  const modes: { id: GameMode; label: string; icon: React.ReactNode; badge: string }[] = [
    { id: 'roulette', label: '돌림판 룰렛', icon: <Disc3 className="w-4 h-4" />, badge: '인기' },
    { id: 'fan', label: '선풍기 날리기', icon: <Wind className="w-4 h-4" />, badge: '꿀잼' },
    { id: 'slot', label: '카지노 슬롯', icon: <Sparkles className="w-4 h-4" />, badge: '짜릿' },
    { id: 'ladder', label: '사다리 타기', icon: <Network className="w-4 h-4" />, badge: '클래식' },
  ];

  return (
    <header className="w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center text-xl">
                🍱
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                  골라골라 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">점심</span>
                </h1>
                {riggedConfig.enabled && (
                  <span
                    title="아슬아슬 강제 당첨 활성화됨"
                    className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-500/20 animate-pulse"
                  />
                )}
              </div>
              <p className="text-[11px] text-neutral-400 hidden xs:block">
                오늘 뭐 먹지? 4가지 짜릿한 점심 선택기
              </p>
            </div>
          </div>

          {/* Mobile Right Action Buttons */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              onClick={() => {
                onToggleSound();
                soundEffects.playTick(1.2);
              }}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
              aria-label={soundEnabled ? '음소거' : '소리 켜기'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
              aria-label="메뉴 및 주작 설정"
            >
              <Settings className="w-4 h-4 text-neutral-300" />
            </button>
          </div>
        </div>

        {/* Game Mode Selector Buttons */}
        <nav className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-neutral-900/90 border border-neutral-800/90 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {modes.map((mode) => {
            const active = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  onSelectMode(mode.id);
                  soundEffects.playTick(1.5);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-bold shadow-md shadow-orange-500/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Right Utilities */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => {
              onToggleSound();
              soundEffects.playTick(1.2);
            }}
            className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            title={soundEnabled ? '소리 끄기' : '소리 켜기'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-semibold transition-colors"
            title="메뉴 10개 수정 & 당첨 설정"
          >
            <Settings className="w-4 h-4" />
            <span>메뉴 & 설정</span>
          </button>
        </div>
      </div>
    </header>
  );
}
