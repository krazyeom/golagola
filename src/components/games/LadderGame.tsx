'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MenuItem, RiggedConfig } from '@/types/lunch';
import { soundEffects } from '@/utils/audio';
import { decideWinner } from '@/utils/storage';
import { Play, Sparkles, HelpCircle } from 'lucide-react';

interface LadderGameProps {
  menus: MenuItem[];
  riggedConfig: RiggedConfig;
  onFinish: (winner: MenuItem, isDramatic: boolean) => void;
}

interface HorizontalRung {
  col: number; // left column (0 to N-2)
  rowY: number; // relative Y position (0 to 1)
}

export default function LadderGame({ menus, riggedConfig, onFinish }: LadderGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedStartCol, setSelectedStartCol] = useState(0);
  const [currentTracer, setCurrentTracer] = useState<{ x: number; y: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState('원하는 출발 번호를 고르고 사다리를 타보세요!');
  const [isDramaticTurn, setIsDramaticTurn] = useState(false);
  const [revealedCardIndex, setRevealedCardIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  const activeMenus = useMemo(() => menus.slice(0, 10), [menus]);
  const numCols = activeMenus.length;

  const [rungs, setRungs] = useState<HorizontalRung[]>([]);
  const [traveledPath, setTraveledPath] = useState<{ x: number; y: number }[]>([]);

  // High-DPI Canvas Rendering
  const drawLadder = useCallback(
    (
      tracer: { x: number; y: number } | null,
      ladderRungs: HorizontalRung[],
      path: { x: number; y: number }[]
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const displayW = 540;
      const displayH = 260;

      if (canvas.width !== displayW * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const topPad = 20;
      const bottomPad = 24;
      const ladderH = displayH - topPad - bottomPad;
      const colSpacing = displayW / (numCols || 1);

      ctx.clearRect(0, 0, displayW, displayH);

      // 1. Draw Inactive Vertical Poles
      for (let i = 0; i < numCols; i++) {
        const x = colSpacing * i + colSpacing / 2;

        ctx.beginPath();
        ctx.moveTo(x, topPad);
        ctx.lineTo(x, displayH - bottomPad);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        // Top start slot pill
        ctx.beginPath();
        ctx.arc(x, topPad, 9, 0, 2 * Math.PI);
        ctx.fillStyle = i === selectedStartCol ? '#F59E0B' : '#1E293B';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = i === selectedStartCol ? '#FEF08A' : '#475569';
        ctx.stroke();

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = i === selectedStartCol ? '#000000' : '#94A3B8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, x, topPad);
      }

      // 2. Draw Inactive Horizontal Rungs
      ladderRungs.forEach((r) => {
        const x1 = colSpacing * r.col + colSpacing / 2;
        const x2 = colSpacing * (r.col + 1) + colSpacing / 2;
        const y = topPad + r.rowY * ladderH;

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#475569';
        ctx.stroke();
      });

      // 3. Draw Illuminated Glowing Traveled Trail
      if (path.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#F43F5E';
        ctx.shadowColor = '#F43F5E';
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // 4. Draw Active Tracer Laser Head
      if (tracer) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(tracer.x, tracer.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#F43F5E';
        ctx.shadowBlur = 18;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(tracer.x, tracer.y, 13, 0, 2 * Math.PI);
        ctx.strokeStyle = '#F43F5E';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    },
    [numCols, selectedStartCol]
  );

  useEffect(() => {
    drawLadder(currentTracer, rungs, traveledPath);
  }, [drawLadder, currentTracer, rungs, traveledPath]);

  // Guaranteed Path Generator
  const generateLadder = useCallback(
    (targetGoalCol: number, startCol: number) => {
      let attempts = 0;
      let finalRungs: HorizontalRung[] = [];

      while (attempts < 100) {
        attempts++;
        const candidateRungs: HorizontalRung[] = [];
        const levels = 8;

        for (let lvl = 1; lvl < levels; lvl++) {
          const y = lvl / levels;
          for (let c = 0; c < numCols - 1; c++) {
            if (Math.random() < 0.45) {
              const hasNeighbor = candidateRungs.some(
                (r) => Math.abs(r.rowY - y) < 0.04 && Math.abs(r.col - c) <= 1
              );
              if (!hasNeighbor) {
                candidateRungs.push({ col: c, rowY: y });
              }
            }
          }
        }

        let curr = startCol;
        const sorted = [...candidateRungs].sort((a, b) => a.rowY - b.rowY);
        for (const r of sorted) {
          if (r.col === curr) curr = curr + 1;
          else if (r.col === curr - 1) curr = curr - 1;
        }

        if (curr === targetGoalCol) {
          finalRungs = sorted;
          break;
        }

        // Tweak bottom steering rungs if needed
        if (attempts > 80) {
          if (curr < targetGoalCol) {
            for (let c = curr; c < targetGoalCol; c++) {
              candidateRungs.push({ col: c, rowY: 0.88 + (c - curr) * 0.02 });
            }
          } else if (curr > targetGoalCol) {
            for (let c = curr - 1; c >= targetGoalCol; c--) {
              candidateRungs.push({ col: c, rowY: 0.88 + (curr - 1 - c) * 0.02 });
            }
          }
          finalRungs = candidateRungs.sort((a, b) => a.rowY - b.rowY);
          break;
        }
      }

      return finalRungs;
    },
    [numCols]
  );

  const handleStartLadder = () => {
    if (isPlaying || activeMenus.length === 0) return;

    setIsPlaying(true);
    setRevealedCardIndex(null);
    setTraveledPath([]);
    setStatusMessage('레이저가 사다리를 타고 하강합니다!');

    const { targetIndex, isRigged } = decideWinner(activeMenus, riggedConfig);
    const targetItem = activeMenus[targetIndex];

    const doDrama = (isRigged && riggedConfig.dramaticNearMiss) || Math.random() < 0.4;
    setIsDramaticTurn(doDrama);

    const generatedRungs = generateLadder(targetIndex, selectedStartCol);
    setRungs(generatedRungs);

    const displayW = 540;
    const displayH = 260;
    const topPad = 20;
    const bottomPad = 24;
    const ladderH = displayH - topPad - bottomPad;
    const colSpacing = displayW / (numCols || 1);

    // Compute waypoints
    const waypoints: { x: number; y: number }[] = [];
    let col = selectedStartCol;

    waypoints.push({
      x: colSpacing * col + colSpacing / 2,
      y: topPad,
    });

    generatedRungs.forEach((r) => {
      if (r.col === col) {
        const y = topPad + r.rowY * ladderH;
        waypoints.push({ x: colSpacing * col + colSpacing / 2, y });
        col = col + 1;
        waypoints.push({ x: colSpacing * col + colSpacing / 2, y });
      } else if (r.col === col - 1) {
        const y = topPad + r.rowY * ladderH;
        waypoints.push({ x: colSpacing * col + colSpacing / 2, y });
        col = col - 1;
        waypoints.push({ x: colSpacing * col + colSpacing / 2, y });
      }
    });

    waypoints.push({
      x: colSpacing * col + colSpacing / 2,
      y: displayH - bottomPad,
    });

    const totalSegs = waypoints.length - 1;
    const duration = doDrama ? 5400 : 4200;
    const timePerSeg = duration / Math.max(totalSegs, 1);
    const startTime = performance.now();
    let currentSegIdx = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const segIndex = Math.min(Math.floor(elapsed / timePerSeg), totalSegs - 1);
      const segProgress = Math.min((elapsed - segIndex * timePerSeg) / timePerSeg, 1);

      if (segIndex !== currentSegIdx) {
        currentSegIdx = segIndex;
        soundEffects.playLadderStep();
      }

      const p0 = waypoints[segIndex];
      const p1 = waypoints[segIndex + 1] || p0;

      const curX = p0.x + (p1.x - p0.x) * segProgress;
      const curY = p0.y + (p1.y - p0.y) * segProgress;
      const coord = { x: curX, y: curY };

      setCurrentTracer(coord);
      setTraveledPath([...waypoints.slice(0, segIndex + 1), coord]);

      if (elapsed > duration * 0.78 && doDrama) {
        setStatusMessage('옆 메뉴로 빠지나 싶었는데 마지막 가로줄로 극적 턴?! 😱');
      }

      if (elapsed < duration) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setIsPlaying(false);
        setCurrentTracer(null);
        setRevealedCardIndex(targetIndex);
        setStatusMessage(`🎉 [${targetItem.name}] 사다리 완주 당첨!`);
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

  return (
    <div className="flex flex-col items-center p-3 sm:p-5 w-full max-w-2xl mx-auto">
      {/* Top Banner */}
      <div className="mb-3 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-rose-300 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>{statusMessage}</span>
        </div>
      </div>

      {/* Main Ladder Arena */}
      <div className="relative w-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-3 sm:p-5 overflow-hidden shadow-2xl flex flex-col items-center">
        {/* Top Start Slots Selector */}
        <div className="w-full flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-neutral-400">
            출발 번호 선택:
          </span>
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
            {activeMenus.map((_, idx) => (
              <button
                key={`start-${idx}`}
                onClick={() => !isPlaying && setSelectedStartCol(idx)}
                disabled={isPlaying}
                className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                  selectedStartCol === idx
                    ? 'bg-amber-400 text-neutral-950 shadow-md scale-105'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* High-DPI Canvas for Ladder Lines & Laser */}
        <div className="w-full overflow-x-auto no-scrollbar flex justify-center py-1">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', maxWidth: '540px', height: '260px' }}
            className="rounded-2xl bg-neutral-950/80 border border-neutral-800/80 shadow-inner"
          />
        </div>

        {/* Mystery Food Cards at the Bottom */}
        <div className="w-full grid grid-cols-5 sm:grid-cols-10 gap-1.5 mt-3 pt-3 border-t border-neutral-800">
          {activeMenus.map((m, idx) => {
            const isRevealed = revealedCardIndex === idx;

            return (
              <div
                key={m.id}
                className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all duration-300 ${
                  isRevealed
                    ? 'bg-amber-500/20 border-amber-400 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                }`}
                style={{
                  borderBottomColor: m.color,
                  borderBottomWidth: '3.5px',
                }}
              >
                {isRevealed ? (
                  <>
                    <span className="text-lg animate-bounce select-none">{m.emoji}</span>
                    <span className="text-[10px] font-black text-amber-300 mt-0.5 truncate w-full">
                      {m.name}
                    </span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4 text-neutral-500 my-0.5" />
                    <span className="text-[10px] font-bold text-neutral-400 truncate w-full">
                      {idx + 1}번
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-5 w-full max-w-xs">
        <button
          onClick={handleStartLadder}
          disabled={isPlaying || activeMenus.length === 0}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
            isPlaying
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-neutral-950 shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isPlaying ? '사다리 타는 중...' : `${selectedStartCol + 1}번에서 사다리 타기!`}</span>
        </button>

        {isDramaticTurn && isPlaying && (
          <p className="text-[11px] text-rose-400 text-center mt-2 flex items-center justify-center gap-1 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>마지막 꺾임 기믹 활성화 중!</span>
          </p>
        )}
      </div>
    </div>
  );
}
