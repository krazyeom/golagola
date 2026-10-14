'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MenuItem, RiggedConfig } from '@/types/lunch';
import { soundEffects } from '@/utils/audio';
import { decideWinner } from '@/utils/storage';
import { Play, Sparkles } from 'lucide-react';

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
  const [startCol, setStartCol] = useState(0);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState('사다리를 타고 오늘의 운명 점심을 찾아갑니다!');
  const [isDramaticClimb, setIsDramaticClimb] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Take up to 10 menus (or menus count)
  const activeMenus = useMemo(() => menus.slice(0, 10), [menus]);
  const numCols = activeMenus.length;

  // Generate rungs or compute path to target
  const generateLadder = useCallback(
    (targetGoalCol: number, chosenStartCol: number, doDrama: boolean) => {
      // Build random rungs, then simulate path from chosenStartCol
      // If result does not match targetGoalCol, tweak rungs or retry
      let attempts = 0;
      let finalRungs: HorizontalRung[] = [];

      while (attempts < 100) {
        attempts++;
        const rungs: HorizontalRung[] = [];
        const levels = 8; // Number of horizontal levels

        for (let lvl = 1; lvl < levels; lvl++) {
          const y = lvl / levels;
          for (let c = 0; c < numCols - 1; c++) {
            // Chance to place rung
            if (Math.random() < 0.45) {
              // Ensure no overlapping rungs at the exact same level & adjacent col
              const hasAdjacent = rungs.some((r) => Math.abs(r.rowY - y) < 0.04 && Math.abs(r.col - c) <= 1);
              if (!hasAdjacent) {
                rungs.push({ col: c, rowY: y });
              }
            }
          }
        }

        // Trace from chosenStartCol to see where it lands
        let currentCol = chosenStartCol;
        // Sort rungs by Y
        const sortedRungs = [...rungs].sort((a, b) => a.rowY - b.rowY);
        for (const rung of sortedRungs) {
          if (rung.col === currentCol) {
            currentCol = currentCol + 1;
          } else if (rung.col === currentCol - 1) {
            currentCol = currentCol - 1;
          }
        }

        // If it lands on targetGoalCol, we got a valid ladder!
        if (currentCol === targetGoalCol) {
          finalRungs = sortedRungs;
          break;
        }

        // If at last few attempts, add a steering rung near bottom
        if (attempts > 85) {
          if (currentCol < targetGoalCol) {
            // Add rungs to move right
            for (let c = currentCol; c < targetGoalCol; c++) {
              rungs.push({ col: c, rowY: 0.88 + (c - currentCol) * 0.02 });
            }
          } else if (currentCol > targetGoalCol) {
            // Add rungs to move left
            for (let c = currentCol - 1; c >= targetGoalCol; c--) {
              rungs.push({ col: c, rowY: 0.88 + (currentCol - 1 - c) * 0.02 });
            }
          }
          finalRungs = rungs.sort((a, b) => a.rowY - b.rowY);
          break;
        }
      }

      return finalRungs;
    },
    [numCols]
  );

  const [rungs, setRungs] = useState<HorizontalRung[]>([]);

  // Draw ladder on canvas
  const drawLadder = useCallback(
    (currentCoord: { x: number; y: number } | null, ladderRungs: HorizontalRung[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const topPadding = 24;
      const bottomPadding = 36;
      const ladderH = h - topPadding - bottomPadding;

      ctx.clearRect(0, 0, w, h);

      const colSpacing = w / (numCols || 1);

      // Draw vertical lines
      for (let i = 0; i < numCols; i++) {
        const x = colSpacing * i + colSpacing / 2;
        ctx.beginPath();
        ctx.moveTo(x, topPadding);
        ctx.lineTo(x, h - bottomPadding);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#404040';
        ctx.stroke();

        // Top start marker
        ctx.beginPath();
        ctx.arc(x, topPadding, 8, 0, 2 * Math.PI);
        ctx.fillStyle = i === startCol ? '#F59E0B' : '#525252';
        ctx.fill();
        ctx.strokeStyle = '#171717';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, x, topPadding);
      }

      // Draw horizontal rungs
      ladderRungs.forEach((r) => {
        const x1 = colSpacing * r.col + colSpacing / 2;
        const x2 = colSpacing * (r.col + 1) + colSpacing / 2;
        const y = topPadding + r.rowY * ladderH;

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#F59E0B';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw active player glowing tracer
      if (currentCoord) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(currentCoord.x, currentCoord.y, 11, 0, 2 * Math.PI);
        ctx.fillStyle = '#F43F5E';
        ctx.shadowColor = '#F43F5E';
        ctx.shadowBlur = 18;
        ctx.fill();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏃', currentCoord.x, currentCoord.y);
        ctx.restore();
      }
    },
    [numCols, startCol]
  );

  // Redraw when rungs change
  useEffect(() => {
    drawLadder(currentPos, rungs);
  }, [drawLadder, currentPos, rungs]);

  const handleStartLadder = () => {
    if (isPlaying || activeMenus.length === 0) return;

    setIsPlaying(true);
    setStatusMessage('사다리를 타고 내려가는 중...');

    const chosenStart = Math.floor(Math.random() * numCols);
    setStartCol(chosenStart);

    const { targetIndex, isRigged } = decideWinner(activeMenus, riggedConfig);
    const targetItem = activeMenus[targetIndex];

    const doDrama = (isRigged && riggedConfig.dramaticNearMiss) || Math.random() < 0.4;
    setIsDramaticClimb(doDrama);

    // Generate rungs that guarantee landing on targetIndex
    const ladderRungs = generateLadder(targetIndex, chosenStart, doDrama);
    setRungs(ladderRungs);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const topPadding = 24;
    const bottomPadding = 36;
    const ladderH = h - topPadding - bottomPadding;
    const colSpacing = w / (numCols || 1);

    // Compute waypoints for animation:
    // [{x, y}, {x, y}, ...]
    const waypoints: { x: number; y: number }[] = [];
    let col = chosenStart;
    let currYRatio = 0;

    waypoints.push({
      x: colSpacing * col + colSpacing / 2,
      y: topPadding,
    });

    ladderRungs.forEach((r) => {
      if (r.col === col) {
        // Move down to rung
        const y = topPadding + r.rowY * ladderH;
        waypoints.push({ x: colSpacing * col + colSpacing / 2, y });
        // Move right across rung
        col = col + 1;
        waypoints.push({ x: colSpacing * col + colSpacing / 2, y });
      } else if (r.col === col - 1) {
        // Move down to rung
        const y = topPadding + r.rowY * ladderH;
        waypoints.push({ x: colSpacing * col + colSpacing / 2, y });
        // Move left across rung
        col = col - 1;
        waypoints.push({ x: colSpacing * col + colSpacing / 2, y });
      }
    });

    // Final move to bottom
    waypoints.push({
      x: colSpacing * col + colSpacing / 2,
      y: h - bottomPadding,
    });

    // Animate along waypoints
    let currentWaypointIdx = 0;
    const totalSegments = waypoints.length - 1;
    const duration = doDrama ? 5200 : 4200; // ms
    const timePerSegment = duration / Math.max(totalSegments, 1);
    const startTime = performance.now();

    const step = (time: number) => {
      const elapsed = time - startTime;
      const segIndex = Math.min(Math.floor(elapsed / timePerSegment), totalSegments - 1);
      const segProgress = Math.min((elapsed - segIndex * timePerSegment) / timePerSegment, 1);

      if (segIndex !== currentWaypointIdx) {
        currentWaypointIdx = segIndex;
        soundEffects.playLadderStep();
      }

      const p0 = waypoints[segIndex];
      const p1 = waypoints[segIndex + 1] || p0;

      const currentX = p0.x + (p1.x - p0.x) * segProgress;
      const currentY = p0.y + (p1.y - p0.y) * segProgress;

      const coord = { x: currentX, y: currentY };
      setCurrentPos(coord);
      drawLadder(coord, ladderRungs);

      // Tension message near finish
      if (elapsed > duration * 0.75 && doDrama) {
        setStatusMessage('옆 메뉴로 가나 싶었는데 마지막 가로줄로 극적 턴?! 😱');
      }

      if (elapsed < duration) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setIsPlaying(false);
        setCurrentPos(null);
        drawLadder(null, ladderRungs);
        setStatusMessage(`🎉 [${targetItem.name}] 사다리 완주 당첨!`);
        setTimeout(() => {
          onFinish(targetItem, doDrama);
        }, 500);
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
      {/* Status banner */}
      <div className="mb-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs sm:text-sm font-semibold text-rose-300">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>{statusMessage}</span>
        </div>
      </div>

      {/* Main Ladder Arena */}
      <div className="relative w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-3 sm:p-4 overflow-hidden shadow-2xl flex flex-col items-center">
        {/* Top Start Slots */}
        <div className="w-full flex justify-between px-1 mb-1 text-[11px] text-neutral-400 font-bold">
          <span>출발 지점 번호 (랜덤 배치)</span>
        </div>

        {/* Canvas for Ladder and Paths */}
        <div className="w-full overflow-x-auto no-scrollbar flex justify-center">
          <canvas
            ref={canvasRef}
            width={580}
            height={280}
            className="w-full max-w-[580px] h-[280px] rounded-xl bg-neutral-900/60"
          />
        </div>

        {/* Bottom Menus List */}
        <div className="w-full grid grid-cols-5 sm:grid-cols-10 gap-1 mt-3 pt-3 border-t border-neutral-800">
          {activeMenus.map((m, idx) => (
            <div
              key={m.id}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-center"
              style={{ borderBottomColor: m.color, borderBottomWidth: '3px' }}
            >
              <span className="text-base select-none">{m.emoji}</span>
              <span className="text-[10px] font-bold text-white mt-0.5 truncate w-full">
                {m.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <div className="mt-5 w-full max-w-xs">
        <button
          onClick={handleStartLadder}
          disabled={isPlaying || activeMenus.length === 0}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
            isPlaying
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-neutral-950 shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isPlaying ? '사다리 타는 중...' : '사다리 타기 시작!'}</span>
        </button>

        {isDramaticClimb && isPlaying && (
          <p className="text-[11px] text-rose-400 text-center mt-2 animate-pulse">
            ⚡ 아슬아슬 마지막 꺾임 기믹 작동 중!
          </p>
        )}
      </div>
    </div>
  );
}
