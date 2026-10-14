'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MenuItem, RiggedConfig } from '@/types/lunch';
import { soundEffects } from '@/utils/audio';
import { decideWinner } from '@/utils/storage';
import { Play, Sparkles } from 'lucide-react';

interface RouletteGameProps {
  menus: MenuItem[];
  riggedConfig: RiggedConfig;
  onFinish: (winner: MenuItem, isDramatic: boolean) => void;
}

export default function RouletteGame({ menus, riggedConfig, onFinish }: RouletteGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [statusText, setStatusText] = useState('오늘의 메뉴를 돌려보세요!');
  const [isNearMissMode, setIsNearMissMode] = useState(false);

  const rotationRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTickSliceRef = useRef<number>(-1);

  const sliceAngle = (2 * Math.PI) / (menus.length || 1);

  // Draw wheel on canvas
  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 16;

    ctx.clearRect(0, 0, width, height);

    // Outer decorative rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#262626';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 15;
    ctx.fill();

    // Rim border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#F59E0B';
    ctx.stroke();

    // Little bulb dots along rim
    const bulbCount = 24;
    for (let i = 0; i < bulbCount; i++) {
      const angle = (i * 2 * Math.PI) / bulbCount + (rotation * 0.5);
      const bx = centerX + (radius + 5) * Math.cos(angle);
      const by = centerY + (radius + 5) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#FBBF24' : '#FDE68A';
      ctx.fill();
    }
    ctx.restore();

    // Draw Slices
    const numSlices = menus.length;
    for (let i = 0; i < numSlices; i++) {
      const startAngle = rotation + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const item = menus[i];

      // Slice background
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#171717';
      ctx.stroke();

      // Text & Emoji
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);

      // Emoji
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '22px sans-serif';
      ctx.fillText(item.emoji, radius - 14, 0);

      // Name
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(item.name, radius - 44, 0);

      ctx.restore();
    }

    // Center cap
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#171717';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#F59E0B';
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍽️', centerX, centerY);
    ctx.restore();
  }, [menus, sliceAngle]);

  // Initial draw and resize listener
  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  // Spin execution
  const handleSpin = () => {
    if (isSpinning || menus.length === 0) return;

    setIsSpinning(true);
    setStatusText('두구두구... 과연 오늘 점심은?!');
    setIsNearMissMode(false);

    // Pick target winner and check if rigged
    const { targetIndex, isRigged } = decideWinner(menus, riggedConfig);
    const targetItem = menus[targetIndex];

    // Pointer is at the top (angle = 3 * Math.PI / 2 or -Math.PI / 2)
    // Slices are drawn starting from angle `rotation + i * sliceAngle`.
    // When pointer points to slice `i`, then:
    // (pointerAngle - rotation) % (2*PI) falls in [i * sliceAngle, (i + 1) * sliceAngle].
    // Pointer angle at top is 1.5 * PI (270 deg).
    const pointerAngle = 1.5 * Math.PI;

    // Full rotations (5 to 7 rounds)
    const baseRounds = 6 + Math.floor(Math.random() * 2);
    const fullRotation = baseRounds * 2 * Math.PI;

    // Calculate final angle where pointer lands exactly in slice `targetIndex`
    // Target center angle offset:
    const targetCenter = targetIndex * sliceAngle + sliceAngle / 2;

    // In dramatic near-miss mode, land very close to the edge of the adjacent slice!
    let fineOffset = sliceAngle * 0.15 * (Math.random() - 0.5);
    const doDrama = (isRigged && riggedConfig.dramaticNearMiss) || Math.random() < 0.3;

    if (doDrama) {
      setIsNearMissMode(true);
      // Place it just barely inside the target slice (near the boundary of previous slice)
      fineOffset = -sliceAngle * 0.38;
    }

    // Desired final rotation modulo 2*PI:
    // pointerAngle - targetCenter - fineOffset
    const targetFinalAngle = pointerAngle - targetCenter - fineOffset;
    
    // Total change in angle
    const startAngle = rotationRef.current;
    const currentModulo = startAngle % (2 * Math.PI);
    let delta = targetFinalAngle - currentModulo;
    while (delta < 0) {
      delta += 2 * Math.PI;
    }
    const finalAngle = startAngle + fullRotation + delta;

    const duration = doDrama ? 5500 : 4500; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Custom dramatic easing: smooth deceleration + suspense hitch near the end
      let ease: number;
      if (progress < 0.85) {
        // Standard cubic out for the bulk of spinning
        const p = progress / 0.85;
        ease = 0.85 * (1 - Math.pow(1 - p, 3.2));
      } else {
        // Dramatic creep at the very end
        const p = (progress - 0.85) / 0.15;
        const subEase = 1 - Math.pow(1 - p, 2.5);
        ease = 0.85 + 0.15 * subEase;
      }

      const current = startAngle + (finalAngle - startAngle) * ease;
      rotationRef.current = current;
      setCurrentRotation(current);
      drawWheel(current);

      // Calculate current slice under pointer for tick sound
      const normalizedAngle = (pointerAngle - (current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSlice = Math.floor(normalizedAngle / sliceAngle);

      if (currentSlice !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSlice;
        // Pitch changes as it slows down
        const speedFactor = 1 - progress;
        soundEffects.playTick(0.8 + speedFactor * 0.6);
      }

      // Suspense tension message near finish
      if (progress > 0.88 && doDrama) {
        setStatusText('어... 저거 아닌가?! 잠깐만...! 😱');
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setStatusText(`🎉 [${targetItem.name}] 당첨!`);
        setTimeout(() => {
          onFinish(targetItem, doDrama);
        }, 500);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-6 w-full max-w-lg mx-auto">
      {/* Status banner */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-amber-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Roulette container with pointer */}
      <div className="relative flex items-center justify-center">
        {/* Pointer (12 o'clock needle) */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400 filter drop-shadow(0 4px 6px rgba(0,0,0,0.5)) animate-bounce" />
          <div className="w-2.5 h-2.5 bg-neutral-950 rounded-full mx-auto -mt-6 border-2 border-white" />
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full filter drop-shadow-2xl transition-transform"
        />
      </div>

      {/* Spin Button */}
      <div className="mt-6 w-full max-w-xs">
        <button
          onClick={handleSpin}
          disabled={isSpinning || menus.length === 0}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
            isSpinning
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isSpinning ? '신나게 돌아가는 중...' : '돌림판 돌리기!'}</span>
        </button>

        {isNearMissMode && isSpinning && (
          <p className="text-[11px] text-rose-400 text-center mt-2 animate-pulse">
            ⚡ 아슬아슬 숨막히는 초접전 진행 중!
          </p>
        )}
      </div>
    </div>
  );
}
