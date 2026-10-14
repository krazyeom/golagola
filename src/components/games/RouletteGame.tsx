'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MenuItem, RiggedConfig } from '@/types/lunch';
import { soundEffects } from '@/utils/audio';
import { decideWinner } from '@/utils/storage';
import { Play, Sparkles, Volume2 } from 'lucide-react';

interface RouletteGameProps {
  menus: MenuItem[];
  riggedConfig: RiggedConfig;
  onFinish: (winner: MenuItem, isDramatic: boolean) => void;
}

export default function RouletteGame({ menus, riggedConfig, onFinish }: RouletteGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [statusText, setStatusText] = useState('돌림판을 힘차게 돌려보세요!');
  const [isNearMissMode, setIsNearMissMode] = useState(false);
  const [needleAngle, setNeedleAngle] = useState(0); // deflection angle in degrees

  const rotationRef = useRef(0);
  const needleAngleRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lastSliceIndexRef = useRef<number>(-1);

  const numSlices = menus.length || 1;
  const sliceAngle = (2 * Math.PI) / numSlices;

  // High-DPI Canvas Rendering
  const drawWheel = useCallback((rotation: number, pointerDeflection: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support Retina 2x scaling
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const displaySize = 380;
    if (canvas.width !== displaySize * dpr) {
      canvas.width = displaySize * dpr;
      canvas.height = displaySize * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const width = displaySize;
    const height = displaySize;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = width / 2 - 14;
    const wheelRadius = outerRadius - 16;

    ctx.clearRect(0, 0, width, height);

    // 1. Outer Heavy Metal Rim with 3D drop shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    const rimGrad = ctx.createLinearGradient(0, 0, width, height);
    rimGrad.addColorStop(0, '#2b261f');
    rimGrad.addColorStop(0.5, '#453a29');
    rimGrad.addColorStop(1, '#1a1610');
    ctx.fillStyle = rimGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fill();

    // Metallic Brass Ring Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#F59E0B';
    ctx.stroke();

    // 2. Chasing Arcade Light Bulbs along the Rim
    const bulbCount = 24;
    const chaseOffset = (rotation * 2.5) % (2 * Math.PI);
    for (let i = 0; i < bulbCount; i++) {
      const angle = (i * 2 * Math.PI) / bulbCount + chaseOffset;
      const bx = centerX + (outerRadius - 8) * Math.cos(angle);
      const by = centerY + (outerRadius - 8) * Math.sin(angle);
      const isLit = i % 2 === 0;

      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = isLit ? '#FDE047' : '#D97706';
      ctx.shadowColor = isLit ? '#FEF08A' : 'transparent';
      ctx.shadowBlur = isLit ? 8 : 0;
      ctx.fill();
    }
    ctx.restore();

    // 3. Slices with Radial Gradients
    for (let i = 0; i < numSlices; i++) {
      const startAngle = rotation + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const item = menus[i];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, wheelRadius, startAngle, endAngle);
      ctx.closePath();

      // Radial slice gradient for depth
      const sliceGrad = ctx.createRadialGradient(
        centerX, centerY, 30,
        centerX, centerY, wheelRadius
      );
      sliceGrad.addColorStop(0, '#1c1917');
      sliceGrad.addColorStop(0.4, item.color);
      sliceGrad.addColorStop(1, item.color);
      ctx.fillStyle = sliceGrad;
      ctx.fill();

      // Sharp slice divider line
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();

      // 4. Text & Emoji
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);

      // Emoji
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '24px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6;
      ctx.fillText(item.emoji, wheelRadius - 12, 0);

      // Menu Name with crisp shadow
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 4;
      ctx.fillText(item.name, wheelRadius - 44, 0);

      ctx.restore();
      ctx.restore();

      // 5. Slice Boundary Metallic Peg (Pin) on wheel circumference
      const pegAngle = startAngle;
      const px = centerX + (wheelRadius - 2) * Math.cos(pegAngle);
      const py = centerY + (wheelRadius - 2) * Math.sin(pegAngle);

      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#E5E7EB';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#4B5563';
      ctx.stroke();
      ctx.restore();
    }

    // 6. Heavy Metallic Center Wheel Hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(centerX - 4, centerY - 4, 2, centerX, centerY, 30);
    hubGrad.addColorStop(0, '#FBBF24');
    hubGrad.addColorStop(0.7, '#D97706');
    hubGrad.addColorStop(1, '#78350F');
    ctx.fillStyle = hubGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FDE68A';
    ctx.stroke();

    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍱', centerX, centerY);
    ctx.restore();

    // 7. Physical Brass Needle / Ticker (at top 12 o'clock)
    // The needle is drawn at top: (centerX, 12), pointing downward into the wheel.
    // It deflects when a peg passes by, then springs back!
    ctx.save();
    ctx.translate(centerX, 14);
    ctx.rotate((pointerDeflection * Math.PI) / 180);

    // Needle drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Needle Body (sharp triangle pointing down)
    ctx.beginPath();
    ctx.moveTo(0, 36);
    ctx.lineTo(-11, 0);
    ctx.lineTo(11, 0);
    ctx.closePath();

    const needleGrad = ctx.createLinearGradient(-11, 0, 11, 36);
    needleGrad.addColorStop(0, '#EF4444');
    needleGrad.addColorStop(0.5, '#F97316');
    needleGrad.addColorStop(1, '#DC2626');
    ctx.fillStyle = needleGrad;
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Needle Pivot Cap
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#FDE047';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#78350F';
    ctx.stroke();

    ctx.restore();

    ctx.restore(); // restore dpr
  }, [menus, numSlices, sliceAngle]);

  useEffect(() => {
    drawWheel(rotationRef.current, needleAngleRef.current);
  }, [drawWheel]);

  const handleSpin = () => {
    if (isSpinning || menus.length === 0) return;

    setIsSpinning(true);
    setStatusText('돌림판이 신나게 회전합니다!');
    setIsNearMissMode(false);

    const { targetIndex, isRigged } = decideWinner(menus, riggedConfig);
    const targetItem = menus[targetIndex];

    const doDrama = (isRigged && riggedConfig.dramaticNearMiss) || Math.random() < 0.35;
    if (doDrama) setIsNearMissMode(true);

    // Pointer is at 12 o'clock: angle = 3π/2 (270 deg)
    const pointerAngle = 1.5 * Math.PI;

    // 6 to 8 full rotations
    const baseRounds = 6 + Math.floor(Math.random() * 2);
    const fullRotation = baseRounds * 2 * Math.PI;

    // Wedge center angle
    const targetCenter = targetIndex * sliceAngle + sliceAngle / 2;

    // In dramatic mode: make it land right on the boundary peg, then slip in!
    let fineOffset = 0;
    if (doDrama) {
      // Just barely inside the target wedge (near boundary)
      fineOffset = -sliceAngle * 0.42;
    } else {
      fineOffset = (Math.random() - 0.5) * (sliceAngle * 0.3);
    }

    const targetFinalAngle = pointerAngle - targetCenter - fineOffset;
    const startAngle = rotationRef.current;
    let delta = targetFinalAngle - (startAngle % (2 * Math.PI));
    while (delta < 0) delta += 2 * Math.PI;
    const finalAngle = startAngle + fullRotation + delta;

    const duration = doDrama ? 5800 : 4600; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Single continuous, beautiful deceleration curve (Quartic out: 1 - (1-p)^4.2)
      // Strictly monotonically decreasing speed, ZERO secondary kick or restart!
      const ease = 1 - Math.pow(1 - progress, 4.2);

      const current = startAngle + (finalAngle - startAngle) * ease;
      rotationRef.current = current;

      // Pointer deflection & peg tick detection
      const normalizedAngle = (pointerAngle - (current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSlice = Math.floor(normalizedAngle / sliceAngle);

      // Detect peg contact
      if (currentSlice !== lastSliceIndexRef.current) {
        lastSliceIndexRef.current = currentSlice;
        // Kick needle backwards proportional to remaining speed
        const speedFactor = Math.max(1 - progress, 0.08);
        needleAngleRef.current = 14 * Math.min(speedFactor * 1.5, 1);
        soundEffects.playTick(0.8 + speedFactor * 0.6, speedFactor < 0.25);
      } else {
        // Needle spring recovery
        needleAngleRef.current += (0 - needleAngleRef.current) * 0.2;
      }

      setNeedleAngle(needleAngleRef.current);
      drawWheel(current, needleAngleRef.current);

      if (progress > 0.85 && doDrama) {
        setStatusText('어... 경계선에 걸리나...?! 😱');
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        needleAngleRef.current = 0;
        drawWheel(finalAngle, 0);
        setIsSpinning(false);
        setStatusText(`🎉 [${targetItem.name}] 극적 당첨!`);
        setTimeout(() => {
          onFinish(targetItem, doDrama);
        }, 550);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-5 w-full max-w-lg mx-auto">
      {/* Status banner */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-amber-300 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Main Roulette Box */}
      <div className="relative flex items-center justify-center p-2 rounded-full bg-neutral-900/60 border border-neutral-800 shadow-2xl backdrop-blur-sm">
        <canvas
          ref={canvasRef}
          style={{ width: '340px', height: '340px' }}
          className="rounded-full select-none cursor-pointer"
          onClick={handleSpin}
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
          <span>{isSpinning ? '두구두구 회전 중...' : '돌림판 힘차게 돌리기!'}</span>
        </button>

        {isNearMissMode && isSpinning && (
          <p className="text-[11px] text-rose-400 text-center mt-2 flex items-center justify-center gap-1 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>바늘이 경계선 위에서 아슬아슬하게 흔들립니다!</span>
          </p>
        )}
      </div>
    </div>
  );
}
