'use client';

import React, { useEffect, useState } from 'react';
import { MenuItem } from '@/types/lunch';
import confetti from 'canvas-confetti';
import { Sparkles, Share2, RotateCcw, Check, X, Flame } from 'lucide-react';
import { soundEffects } from '@/utils/audio';

interface ResultModalProps {
  winner: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  isDramatic?: boolean;
}

export default function ResultModal({
  winner,
  isOpen,
  onClose,
  onRetry,
  isDramatic = false,
}: ResultModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && winner) {
      soundEffects.playFanfare();

      // Confetti burst from both sides
      const duration = 2.5 * 1000;
      const end = Date.now() + duration;

      const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen, winner]);

  if (!isOpen || !winner) return null;

  const handleShare = () => {
    const text = `📢 오늘 우리 점심은 [${winner.emoji} ${winner.name}] 어때요?\n"${winner.description}"\n\n모두 점심 맛있게 드세요! 😋`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden"
        style={{
          boxShadow: `0 20px 60px -15px ${winner.color}40, 0 0 0 1px ${winner.color}30`
        }}
      >
        {/* Top ambient glow */}
        <div 
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: winner.color }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800/60 hover:bg-neutral-800 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Drama / Status badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border bg-neutral-800/80 text-amber-300 border-amber-500/30">
          {isDramatic ? (
            <>
              <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span>아슬아슬 역전 당첨!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>오늘의 운명적인 픽!</span>
            </>
          )}
        </div>

        {/* Large Food Emoji with bounce */}
        <div className="relative my-2 inline-block">
          <div 
            className="w-28 h-28 mx-auto rounded-3xl flex items-center justify-center text-6xl shadow-inner border border-white/10"
            style={{ 
              background: `radial-gradient(circle at 30% 30%, ${winner.color}30, #171717)` 
            }}
          >
            <span className="transform hover:scale-110 transition-transform select-none">
              {winner.emoji}
            </span>
          </div>
          <div className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-neutral-950 text-xs font-black shadow-lg">
            WINNER
          </div>
        </div>

        {/* Menu title */}
        <div className="mt-4">
          <span className="text-xs font-medium text-neutral-400 px-2 py-0.5 rounded-md bg-neutral-800/90">
            {winner.category}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
            {winner.name}
          </h2>
          <p className="text-sm text-neutral-300 mt-2 px-2 leading-relaxed">
            {winner.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-neutral-800">
          <button
            onClick={handleShare}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm transition-all active:scale-95 border border-neutral-700/60"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">복사완료!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-neutral-300" />
                <span>팀원에게 공유</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              onClose();
              onRetry();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-sm shadow-lg shadow-orange-500/25 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>다시 뽑기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
