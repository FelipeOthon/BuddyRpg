"use client";

import { useEffect, useRef } from "react";
import { Dices, Skull, Sparkles } from "lucide-react";
import {
  buildDiceSimulation,
  rotatePoint3D,
  stepDiceSimulation,
  type SimulatedDie3D,
} from "@/lib/dice/dice3dEngine";
import { playDiceRollSound } from "@/lib/audio/soundEngine";
import { useBoardStore } from "@/stores/boardStore";

function drawSingleDie3D(ctx: CanvasRenderingContext2D, d: SimulatedDie3D) {
  const scale = 1 + d.z * 0.0025;
  const r = d.radius * scale;
  const screenX = d.x;
  const screenY = d.y - d.z * 0.55;

  // Sombra projetada no tabuleiro
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    d.x + d.z * 0.18,
    d.y + d.z * 0.12 + 8,
    d.radius * 0.85,
    d.radius * 0.52,
    0,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.45 - d.z * 0.0015, 0.12)})`;
  ctx.fill();
  ctx.restore();

  // Transforma vértices 3D
  const transformed = d.mesh.vertices.map((v) => {
    const rot = rotatePoint3D(v, d.rx, d.ry, d.rz);
    return {
      x: screenX + rot.x * r,
      y: screenY + rot.y * r,
      z: rot.z,
    };
  });

  // Ordena faces por profundidade (Painter's Algorithm)
  const sortedFaces = d.mesh.faces
    .map((faceIndices) => {
      const pts = faceIndices.map((idx) => transformed[idx]!);
      const avgZ = pts.reduce((acc, p) => acc + p.z, 0) / pts.length;
      return { pts, avgZ };
    })
    .sort((a, b) => a.avgZ - b.avgZ);

  const isCrit = d.kept && d.sides === 20 && d.value === 20;
  const isFumble = d.kept && d.sides === 20 && d.value === 1;

  ctx.save();
  if (!d.kept) {
    ctx.globalAlpha = 0.42;
  }

  for (const face of sortedFaces) {
    if (face.avgZ < -0.25) continue;

    ctx.beginPath();
    face.pts.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();

    const light = Math.max(0.25, Math.min(1, (face.avgZ + 1) * 0.55));
    if (isCrit) {
      ctx.fillStyle = `rgba(${Math.round(16 * light)}, ${Math.round(
        145 * light
      )}, ${Math.round(105 * light)}, 0.96)`;
      ctx.strokeStyle = "#fde047";
    } else if (isFumble) {
      ctx.fillStyle = `rgba(${Math.round(165 * light)}, ${Math.round(
        24 * light
      )}, ${Math.round(45 * light)}, 0.96)`;
      ctx.strokeStyle = "#fda4af";
    } else {
      ctx.fillStyle = `rgba(${Math.round(38 * light)}, ${Math.round(
        28 * light
      )}, ${Math.round(52 * light)}, 0.96)`;
      ctx.strokeStyle = "#f59e0b";
    }

    ctx.lineWidth = 1.6;
    ctx.fill();
    ctx.stroke();
  }

  // Número do resultado no centro do poliedro + etiqueta do tipo de dado (d20, d6...)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Brilho atrás do número quando o dado assenta
  if (d.settled) {
    ctx.beginPath();
    ctx.arc(screenX, screenY, r * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = isCrit
      ? "rgba(6, 78, 59, 0.88)"
      : isFumble
        ? "rgba(136, 19, 55, 0.88)"
        : "rgba(9, 9, 11, 0.82)";
    ctx.fill();
    ctx.strokeStyle = isCrit
      ? "#34d399"
      : isFumble
        ? "#fb7185"
        : "rgba(251, 191, 36, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.font = `900 ${Math.round(r * 0.55)}px ui-monospace, monospace`;
  ctx.fillStyle = isCrit ? "#fef08a" : isFumble ? "#fecdd3" : "#fef3c7";
  ctx.fillText(String(d.value), screenX, screenY - 2);

  ctx.font = `700 ${Math.max(Math.round(r * 0.24), 9)}px ui-sans-serif, sans-serif`;
  ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
  ctx.fillText(`d${d.sides}`, screenX, screenY + r * 0.36);

  ctx.restore();
}

export default function Dice3DOverlay() {
  const { dice3dEnabled, activeDice3dRoll, triggerDice3dRoll } =
    useBoardStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!dice3dEnabled || !activeDice3dRoll) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 960;
    const height = canvas.parentElement?.clientHeight || 640;
    canvas.width = width;
    canvas.height = height;

    const { dice, particles } = buildDiceSimulation(
      activeDice3dRoll.roll,
      width,
      height
    );

    let soundNat20 = false;
    let soundNat1 = false;
    for (const t of activeDice3dRoll.roll.terms) {
      if (t.type === "dice" && t.sides === 20) {
        for (const r of t.rolls) {
          if (r.kept && r.v === 20) soundNat20 = true;
          if (r.kept && r.v === 1) soundNat1 = true;
        }
      }
    }
    playDiceRollSound({
      diceCount: dice.length,
      hasNat20: soundNat20,
      hasNat1: soundNat1,
    });

    let rafId = 0;
    const startTime = performance.now();
    const totalDuration = 3900;

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed >= totalDuration) {
        ctx.clearRect(0, 0, width, height);
        triggerDice3dRoll(null);
        return;
      }

      const fadeAlpha =
        elapsed > totalDuration - 650
          ? Math.max((totalDuration - elapsed) / 650, 0)
          : 1;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = fadeAlpha;

      stepDiceSimulation(dice, particles, width, height);

      // Desenha partículas de crítico / falha
      for (const pt of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(pt.alpha * fadeAlpha, 0);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Desenha os dados 3D
      for (const d of dice) {
        drawSingleDie3D(ctx, d);
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [dice3dEnabled, activeDice3dRoll, triggerDice3dRoll]);

  if (!dice3dEnabled || !activeDice3dRoll) {
    return null;
  }

  const { roll, author } = activeDice3dRoll;
  let hasNat20 = false;
  let hasNat1 = false;
  for (const t of roll.terms) {
    if (t.type === "dice" && t.sides === 20) {
      for (const r of t.rolls) {
        if (r.kept && r.v === 20) hasNat20 = true;
        if (r.kept && r.v === 1) hasNat1 = true;
      }
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-25 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />

      {/* Banner Arcano Superior do Resultado */}
      <div className="absolute top-16 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-500/50 bg-zinc-950/95 px-5 py-2.5 shadow-[0_0_35px_rgba(245,158,11,0.35)] backdrop-blur">
        <Dices className="h-5 w-5 text-amber-400" />
        <div className="text-xs">
          <span className="font-bold text-amber-200">{author}</span>{" "}
          <span className="text-zinc-400">rolou</span>{" "}
          <code className="font-mono font-bold text-amber-300">
            {roll.expression}
          </code>
          {roll.label && (
            <span className="ml-1.5 rounded bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-200">
              {roll.label}
            </span>
          )}
        </div>
        <div className="h-5 w-px bg-amber-500/30" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Total
          </span>
          <span className="font-display text-xl font-extrabold text-amber-300">
            {roll.total}
          </span>
        </div>
        {hasNat20 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            20 Natural!
          </span>
        )}
        {!hasNat20 && hasNat1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
            <Skull className="h-3.5 w-3.5" />
            Falha Crítica!
          </span>
        )}
      </div>
    </div>
  );
}
