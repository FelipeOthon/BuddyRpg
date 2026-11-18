"use client";

import { useEffect, useRef } from "react";
import { useBoardStore } from "@/stores/boardStore";
import type { FxBurstPreset, WeatherPreset } from "@/types/domain";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  life: number;
  maxLife: number;
}

const BURST_COLORS: Record<FxBurstPreset, [string, string]> = {
  fire: ["#fb923c", "#ef4444"],
  ice: ["#7dd3fc", "#38bdf8"],
  arcane: ["#c084fc", "#818cf8"],
  heal: ["#34d399", "#10b981"],
};

export default function WeatherOverlay({
  sceneId,
  preset,
  intensity,
  width,
  height,
}: {
  sceneId: string;
  preset: WeatherPreset;
  intensity: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderedBurstsRef = useRef<Set<string>>(new Set());
  const burstParticlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      born: number;
      ttl: number;
    }>
  >([]);
  const shockwavesRef = useRef<
    Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      born: number;
      ttl: number;
    }>
  >([]);

  const { viewport, fxBursts, pruneFxBursts } = useBoardStore();
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Converte novos fxBursts em partículas e ondas expansivas
  useEffect(() => {
    const now = performance.now();
    for (const b of fxBursts) {
      if (b.sceneId !== sceneId || renderedBurstsRef.current.has(b.id)) continue;
      renderedBurstsRef.current.add(b.id);
      const [c1, c2] = BURST_COLORS[b.preset] ?? BURST_COLORS.fire;

      shockwavesRef.current.push({
        x: b.x,
        y: b.y,
        radius: b.radius,
        color: c1,
        born: now,
        ttl: 700,
      });

      for (let i = 0; i < 42; i++) {
        const angle = (Math.PI * 2 * i) / 42 + (Math.random() - 0.5) * 0.25;
        const speed = (b.radius / 0.65) * (0.45 + Math.random() * 0.75);
        burstParticlesRef.current.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.5 + Math.random() * 4.5,
          color: i % 2 === 0 ? c1 : c2,
          born: now,
          ttl: 550 + Math.random() * 450,
        });
      }
    }
    if (fxBursts.length > 0) {
      const timer = setTimeout(() => pruneFxBursts(Date.now()), 2300);
      return () => clearTimeout(timer);
    }
  }, [fxBursts, sceneId, pruneFxBursts]);

  const hasBursts = fxBursts.some((b) => b.sceneId === sceneId);
  const activeWeather = preset !== "none";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!activeWeather && !hasBursts) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const clampedIntensity = Math.min(Math.max(intensity, 0.1), 1);
    const targetCount =
      preset === "rain"
        ? Math.round(140 * clampedIntensity)
        : preset === "snow"
          ? Math.round(100 * clampedIntensity)
          : preset === "fog_mist"
            ? Math.round(16 * clampedIntensity)
            : preset === "embers" || preset === "ash"
              ? Math.round(75 * clampedIntensity)
              : 0;

    const pool: Particle[] = [];
    for (let i = 0; i < targetCount; i++) {
      pool.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx:
          preset === "rain"
            ? -140
            : preset === "fog_mist"
              ? 18 + Math.random() * 22
              : (Math.random() - 0.5) * 28,
        vy:
          preset === "rain"
            ? 780 + Math.random() * 260
            : preset === "snow"
              ? 38 + Math.random() * 45
              : preset === "embers"
                ? -(36 + Math.random() * 64)
                : preset === "ash"
                  ? 18 + Math.random() * 26
                  : (Math.random() - 0.5) * 8,
        size:
          preset === "fog_mist"
            ? 140 + Math.random() * 180
            : preset === "rain"
              ? 14 + Math.random() * 12
              : 1.8 + Math.random() * 3.2,
        alpha:
          preset === "fog_mist"
            ? 0.06 + Math.random() * 0.08
            : 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        life: Math.random(),
        maxLife: 1,
      });
    }

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      // 1. Clima / Atmosfera
      if (activeWeather) {
        ctx.save();
        if (preset === "embers") {
          ctx.globalCompositeOperation = "lighter";
        }

        for (const p of pool) {
          p.phase += dt * 2.2;
          p.x += (p.vx + (preset === "snow" || preset === "embers" ? Math.sin(p.phase) * 22 : 0)) * dt;
          p.y += p.vy * dt;

          if (p.y > height + 40) {
            p.y = -30;
            p.x = Math.random() * (width + 120);
          } else if (p.y < -40) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
          if (p.x < -200) p.x = width + 120;
          if (p.x > width + 200) p.x = -120;

          if (preset === "rain") {
            ctx.strokeStyle = `rgba(147, 197, 253, ${p.alpha * 0.55})`;
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - 4, p.y + p.size);
            ctx.stroke();
          } else if (preset === "snow") {
            ctx.fillStyle = `rgba(241, 245, 249, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (preset === "fog_mist") {
            const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, p.size);
            grad.addColorStop(0, `rgba(203, 213, 225, ${p.alpha})`);
            grad.addColorStop(1, "rgba(203, 213, 225, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (preset === "embers") {
            const flicker = 0.65 + 0.35 * Math.sin(p.phase * 3);
            const grad = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, p.size * 2.5);
            grad.addColorStop(0, `rgba(254, 240, 138, ${p.alpha * flicker})`);
            grad.addColorStop(0.5, `rgba(249, 115, 22, ${p.alpha * 0.6 * flicker})`);
            grad.addColorStop(1, "rgba(249, 115, 22, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (preset === "ash") {
            ctx.fillStyle = `rgba(161, 161, 170, ${p.alpha * 0.65})`;
            ctx.fillRect(p.x, p.y, p.size, p.size * 0.7);
          }
        }
        ctx.restore();
      }

      // 2. Explosões / Efeitos de Magia pontuais (fx:burst) no espaço do mundo
      const vp = viewportRef.current;
      if (shockwavesRef.current.length > 0 || burstParticlesRef.current.length > 0) {
        ctx.save();
        ctx.translate(vp.x, vp.y);
        ctx.scale(vp.scale, vp.scale);
        ctx.globalCompositeOperation = "lighter";

        shockwavesRef.current = shockwavesRef.current.filter((sw) => {
          const age = now - sw.born;
          if (age >= sw.ttl) return false;
          const progress = age / sw.ttl;
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = 1 - progress;
          ctx.lineWidth = 6 * (1 - progress * 0.7);
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * progress, 0, Math.PI * 2);
          ctx.stroke();
          return true;
        });

        burstParticlesRef.current = burstParticlesRef.current.filter((bp) => {
          const age = now - bp.born;
          if (age >= bp.ttl) return false;
          const progress = age / bp.ttl;
          bp.x += bp.vx * dt;
          bp.y += bp.vy * dt;
          bp.vx *= 0.94;
          bp.vy *= 0.94;
          ctx.fillStyle = bp.color;
          ctx.globalAlpha = 1 - progress;
          ctx.beginPath();
          ctx.arc(bp.x, bp.y, bp.size * (1 - progress * 0.5), 0, Math.PI * 2);
          ctx.fill();
          return true;
        });

        ctx.restore();
      }

      if (activeWeather || shockwavesRef.current.length > 0 || burstParticlesRef.current.length > 0) {
        rafId = requestAnimationFrame(frame);
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [activeWeather, hasBursts, preset, intensity, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 z-10"
    />
  );
}
