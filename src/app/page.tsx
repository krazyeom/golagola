'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ResultModal from '@/components/ResultModal';
import SettingsModal from '@/components/SettingsModal';
import RouletteGame from '@/components/games/RouletteGame';
import FanGame from '@/components/games/FanGame';
import SlotMachineGame from '@/components/games/SlotMachineGame';
import LadderGame from '@/components/games/LadderGame';
import { GameMode, MenuItem, RiggedConfig, DEFAULT_MENUS } from '@/types/lunch';
import {
  getStoredMenus,
  saveStoredMenus,
  getStoredRiggedConfig,
  saveStoredRiggedConfig,
  getStoredSound,
  saveStoredSound,
} from '@/utils/storage';
import { soundEffects } from '@/utils/audio';
import { Settings, Sparkles, UtensilsCrossed } from 'lucide-react';

export default function Home() {
  const [menus, setMenus] = useState<MenuItem[]>(DEFAULT_MENUS);
  const [currentMode, setCurrentMode] = useState<GameMode>('roulette');
  const [riggedConfig, setRiggedConfig] = useState<RiggedConfig>({
    enabled: false,
    targetMenuId: null,
    dramaticNearMiss: true,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [winner, setWinner] = useState<MenuItem | null>(null);
  const [isDramatic, setIsDramatic] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load from local storage after mount
  useEffect(() => {
    const loadedMenus = getStoredMenus();
    const loadedRigged = getStoredRiggedConfig();
    const loadedSound = getStoredSound();

    setMenus(loadedMenus);
    setRiggedConfig(loadedRigged);
    setSoundEnabled(loadedSound);
    soundEffects.setEnabled(loadedSound);
    setMounted(true);
  }, []);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    saveStoredSound(nextVal);
    soundEffects.setEnabled(nextVal);
  };

  const handleSaveMenus = (newMenus: MenuItem[]) => {
    setMenus(newMenus);
    saveStoredMenus(newMenus);
  };

  const handleSaveRiggedConfig = (newConfig: RiggedConfig) => {
    setRiggedConfig(newConfig);
    saveStoredRiggedConfig(newConfig);
  };

  const handleGameFinish = (wonMenu: MenuItem, dramatic: boolean) => {
    setWinner(wonMenu);
    setIsDramatic(dramatic);
    setResultModalOpen(true);
  };

  const handleRetry = () => {
    setWinner(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">점심 메뉴 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500 selection:text-neutral-950">
      {/* Top Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenSettings={() => setSettingsOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        riggedConfig={riggedConfig}
      />

      {/* Main Content Arena */}
      <main className="flex-1 flex flex-col justify-center py-4 sm:py-8 px-3 sm:px-6">
        <div className="w-full max-w-4xl mx-auto">
          {/* Game Stage Area */}
          <section className="relative">
            {currentMode === 'roulette' && (
              <RouletteGame
                menus={menus}
                riggedConfig={riggedConfig}
                onFinish={handleGameFinish}
              />
            )}
            {currentMode === 'fan' && (
              <FanGame
                menus={menus}
                riggedConfig={riggedConfig}
                onFinish={handleGameFinish}
              />
            )}
            {currentMode === 'slot' && (
              <SlotMachineGame
                menus={menus}
                riggedConfig={riggedConfig}
                onFinish={handleGameFinish}
              />
            )}
            {currentMode === 'ladder' && (
              <LadderGame
                menus={menus}
                riggedConfig={riggedConfig}
                onFinish={handleGameFinish}
              />
            )}
          </section>

          {/* Current 10 Korean favorite menus line-up bar */}
          <section className="mt-8 pt-6 border-t border-neutral-800/80">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  후보 메뉴 목록 ({menus.length}개)
                </h3>
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-xs text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>수정하기</span>
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {menus.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors shadow-sm"
                  style={{ borderLeftColor: item.color, borderLeftWidth: '3.5px' }}
                >
                  <span className="text-lg select-none">{item.emoji}</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white leading-tight">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-neutral-400">{item.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-4 px-4 text-center text-xs text-neutral-500">
        <p>
          골라골라 점심추천 웹앱 &bull; Next.js &bull; Port: 18429
        </p>
      </footer>

      {/* Modals */}
      <ResultModal
        winner={winner}
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        onRetry={handleRetry}
        isDramatic={isDramatic}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        menus={menus}
        onSaveMenus={handleSaveMenus}
        riggedConfig={riggedConfig}
        onSaveRiggedConfig={handleSaveRiggedConfig}
      />
    </div>
  );
}
