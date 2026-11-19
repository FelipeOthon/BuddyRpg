"use client";

import { useEffect, useMemo, useRef } from "react";
import { useBoardStore } from "@/stores/boardStore";
import type {
  FxBurstPreset,
  SceneElement,
  SceneElementData,
  WeatherPreset,
} from "@/types/domain";

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  depth: number; // 0 = fundo distante, 1 = primeiro plano
  rot: number;
  rotSpeed: number;
  emberTint: boolean;
}

interface RainRipple {
  x: number;
  y: number;
  age: number;
  ttl: number;
  maxRadius: number;
}

interface WeatherSimState {
  particles: Particle[];
  ripples: RainRipple[];
  lightningAlpha: number;
  nextLightningSec: number;
}

interface WeatherZone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  preset: WeatherPreset;
  intensity: number;
}

const BURST_COLORS: Record<FxBurstPreset, [string, string]> = {
  fire: ["#fb923c", "#ef4444"],
  ice: ["#7dd3fc", "#38bdf8"],
  arcane: ["#c084fc", "#818cf8"],
  heal: ["#34d399", "#10b981"],
};

function buildSimState(
  preset: WeatherPreset,
  intensity: number,
  boundsW: number,
  boundsH: number,
  areaScale = 1
): WeatherSimState {
  const clamped = Math.min(Math.max(intensity, 0.1), 1);
  const baseCount =
    preset === "rain"
      ? 190
      : preset === "snow"
        ? 135
        : preset === "fog_mist"
          ? 24
          : preset === "embers"
            ? 95
            : preset === "ash"
              ? 110
              : 0;
  const count =
    baseCount > 0
      ? Math.max(8, Math.round(baseCount * clamped * areaScale))
      : 0;

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const depth = Math.random(); // paralaxe contínua
    const x = Math.random() * boundsW;
    const y = Math.random() * boundsH;
    const speedMult = 0.55 + depth * 0.75;

    particles.push({
      x,
      y,
      prevX: x,
      prevY: y,
      vx:
        preset === "rain"
          ? (-145 - Math.random() * 45) * speedMult
          : preset === "fog_mist"
            ? (14 + Math.random() * 20) * speedMult
            : preset === "snow"
              ? (Math.random() - 0.35) * 26 * speedMult
              : (Math.random() - 0.5) * 36 * speedMult,
      vy:
        preset === "rain"
          ? (760 + Math.random() * 340) * speedMult
          : preset === "snow"
            ? (32 + Math.random() * 52) * speedMult
            : preset === "embers"
              ? -(48 + Math.random() * 88) * speedMult
              : preset === "ash"
                ? (22 + Math.random() * 34) * speedMult
                : (Math.random() - 0.5) * 6,
      size:
        preset === "fog_mist"
          ? (Math.min(220, Math.max(70, boundsW * 0.28)) + Math.random() * 110) *
            (0.75 + depth * 0.5)
          : preset === "rain"
            ? (13 + Math.random() * 16) * (0.7 + depth * 0.6)
            : preset === "snow"
              ? 1.8 + depth * 4.4
              : preset === "ash"
                ? 2.2 + depth * 3.8
                : 1.5 + depth * 2.8,
      alpha:
        preset === "fog_mist"
          ? 0.055 + (1 - depth * 0.4) * 0.06
          : 0.32 + depth * 0.58,
      phase: Math.random() * Math.PI * 2,
      depth,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3.2,
      emberTint: preset === "ash" ? Math.random() < 0.16 : false,
    });
  }

  return {
    particles,
    ripples: [],
    lightningAlpha: 0,
    nextLightningSec: 4 + Math.random() * 8,
  };
}

function drawAtmosphericTint(
  ctx: CanvasRenderingContext2D,
  preset: WeatherPreset,
  intensity: number,
  w: number,
  h: number,
  lightningAlpha: number
) {
  const k = Math.min(Math.max(intensity, 0.1), 1);
  if (preset === "rain") {
    ctx.fillStyle = `rgba(10, 20, 38, ${0.12 + k * 0.14})`;
    ctx.fillRect(0, 0, w, h);
    if (lightningAlpha > 0.01) {
      ctx.fillStyle = `rgba(219, 234, 254, ${lightningAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (preset === "snow") {
    ctx.fillStyle = `rgba(186, 230, 253, ${0.04 + k * 0.06})`;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "embers") {
    const glow = ctx.createLinearGradient(0, h, 0, 0);
    glow.addColorStop(0, `rgba(234, 88, 12, ${0.09 + k * 0.11})`);
    glow.addColorStop(0.55, `rgba(124, 45, 18, ${0.03 + k * 0.04})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "ash") {
    ctx.fillStyle = `rgba(24, 24, 27, ${0.11 + k * 0.12})`;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "fog_mist") {
    ctx.fillStyle = `rgba(148, 163, 184, ${0.05 + k * 0.08})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function stepAndRenderWeatherSim(
  ctx: CanvasRenderingContext2D,
  sim: WeatherSimState,
  preset: WeatherPreset,
  intensity: number,
  boundsW: number,
  boundsH: number,
  dt: number
) {
  ctx.save();

  // Relâmpagos sutis e raros em tempestades de chuva intensas
  if (preset === "rain" && intensity >= 0.45) {
    sim.nextLightningSec -= dt;
    if (sim.nextLightningSec <= 0) {
      sim.lightningAlpha = 0.22 + Math.random() * 0.18;
      sim.nextLightningSec = 5 + Math.random() * 11;
    } else if (sim.lightningAlpha > 0) {
      sim.lightningAlpha = Math.max(0, sim.lightningAlpha - dt * 1.45);
    }
  } else {
    sim.lightningAlpha = 0;
  }

  drawAtmosphericTint(ctx, preset, intensity, boundsW, boundsH, sim.lightningAlpha);

  if (preset === "embers") {
    ctx.globalCompositeOperation = "lighter";
  }

  for (const p of sim.particles) {
    p.prevX = p.x;
    p.prevY = p.y;
    p.phase += dt * (1.8 + p.depth * 1.2);
    p.rot += p.rotSpeed * dt;

    const turbulence =
      preset === "snow"
        ? (Math.sin(p.phase) * 24 + Math.cos(p.phase * 0.57) * 14) *
          (0.6 + p.depth * 0.7)
        : preset === "embers"
          ? Math.sin(p.phase * 1.6) * 32 + Math.cos(p.phase * 0.7) * 18
          : preset === "ash"
            ? Math.sin(p.phase * 1.1) * 20
            : 0;

    p.x += (p.vx + turbulence) * dt;
    p.y += p.vy * dt;

    if (p.y > boundsH + 35) {
      p.y = -25;
      p.prevY = p.y;
      p.x = Math.random() * (boundsW + 120);
      p.prevX = p.x;
    } else if (p.y < -35) {
      p.y = boundsH + 20;
      p.prevY = p.y;
      p.x = Math.random() * boundsW;
      p.prevX = p.x;
    }
    if (p.x < -140) {
      p.x = boundsW + 80;
      p.prevX = p.x;
    }
    if (p.x > boundsW + 140) {
      p.x = -80;
      p.prevX = p.x;
    }

    // Impactos de pingos aleatórios gerando anéis na superfície
    if (preset === "rain" && Math.random() < dt * (0.4 + intensity * 0.65) && sim.ripples.length < 36) {
      sim.ripples.push({
        x: Math.random() * boundsW,
        y: Math.random() * boundsH,
        age: 0,
        ttl: 0.35 + Math.random() * 0.25,
        maxRadius: 5 + p.depth * 9,
      });
    }

    if (preset === "rain") {
      const dx = (p.vx / Math.max(p.vy, 1)) * p.size;
      const tailX = p.x - dx;
      const tailY = p.y - p.size;
      const grad = ctx.createLinearGradient(tailX, tailY, p.x, p.y);
      grad.addColorStop(0, "rgba(147, 197, 253, 0)");
      grad.addColorStop(0.65, `rgba(186, 230, 253, ${p.alpha * 0.42})`);
      grad.addColorStop(1, `rgba(224, 242, 254, ${p.alpha * 0.72})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.7 + p.depth * 1.1;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else if (preset === "snow") {
      const rad = p.size * (p.depth > 0.72 ? 1.55 : 1.15);
      const grad = ctx.createRadialGradient(p.x, p.y, 0.2, p.x, p.y, rad);
      grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
      grad.addColorStop(0.55, `rgba(226, 232, 240, ${p.alpha * 0.65})`);
      grad.addColorStop(1, "rgba(226, 232, 240, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
    } else if (preset === "fog_mist") {
      const stretchX = p.size * 1.45;
      const stretchY = p.size * 0.72;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, stretchY / stretchX);
      const grad = ctx.createRadialGradient(0, 0, stretchX * 0.08, 0, 0, stretchX);
      grad.addColorStop(0, `rgba(226, 232, 240, ${p.alpha})`);
      grad.addColorStop(0.55, `rgba(203, 213, 225, ${p.alpha * 0.48})`);
      grad.addColorStop(1, "rgba(203, 213, 225, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, stretchX, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (preset === "embers") {
      const flicker = 0.6 + 0.4 * Math.sin(p.phase * 4.2);
      // Trilha quente em velocidade
      ctx.strokeStyle = `rgba(251, 146, 60, ${p.alpha * 0.55 * flicker})`;
      ctx.lineWidth = Math.max(1, p.size * 0.65);
      ctx.beginPath();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      const bloomR = p.size * 3.2;
      const grad = ctx.createRadialGradient(p.x, p.y, 0.3, p.x, p.y, bloomR);
      grad.addColorStop(0, `rgba(254, 249, 195, ${p.alpha * flicker})`);
      grad.addColorStop(0.35, `rgba(251, 146, 60, ${p.alpha * 0.72 * flicker})`);
      grad.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, bloomR, 0, Math.PI * 2);
      ctx.fill();
    } else if (preset === "ash") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const scaleY = 0.35 + Math.abs(Math.cos(p.phase * 1.4)) * 0.65;
      ctx.scale(1, scaleY);
      if (p.emberTint) {
        const flicker = 0.55 + 0.45 * Math.sin(p.phase * 4);
        ctx.fillStyle = `rgba(249, 115, 22, ${p.alpha * flicker})`;
      } else {
        ctx.fillStyle = `rgba(180, 180, 190, ${p.alpha * 0.65})`;
      }
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size * 0.4);
      ctx.lineTo(p.size * 0.7, -p.size * 0.65);
      ctx.lineTo(p.size, p.size * 0.45);
      ctx.lineTo(-p.size * 0.5, p.size * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Renderizar respingos / anéis de chuva na superfície
  if (sim.ripples.length > 0) {
    sim.ripples = sim.ripples.filter((rp) => {
      rp.age += dt;
      if (rp.age >= rp.ttl) return false;
      const prog = rp.age / rp.ttl;
      const r = 1.5 + rp.maxRadius * prog;
      ctx.strokeStyle = `rgba(186, 230, 253, ${(1 - prog) * 0.36})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, r, r * 0.46, 0, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });
  }

  ctx.restore();
}

export default function WeatherOverlay({
  sceneId,
  preset,
  intensity,
  elements = [],
  width,
  height,
}: {
  sceneId: string;
  preset: WeatherPreset;
  intensity: number;
  elements?: SceneElement[];
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

  const weatherZones = useMemo<WeatherZone[]>(() => {
    const list: WeatherZone[] = [];
    for (const el of elements) {
      if (el.scene_id !== sceneId) continue;
      if (el.kind !== "image" && el.kind !== "rect") continue;
      const d = (el.data ?? {}) as SceneElementData;
      if (!d.weatherPreset || d.weatherPreset === "none") continue;
      const rawW = d.width ?? 280;
      const rawH = d.height ?? 280;
      const x = rawW < 0 ? el.x + rawW : el.x;
      const y = rawH < 0 ? el.y + rawH : el.y;
      const w = Math.max(Math.abs(rawW), 24);
      const h = Math.max(Math.abs(rawH), 24);
      list.push({
        id: el.id,
        x,
        y,
        w,
        h,
        rotation: el.rotation ?? 0,
        preset: d.weatherPreset,
        intensity: d.weatherIntensity ?? 0.6,
      });
    }
    return list;
  }, [elements, sceneId]);

  const zonesSignature = weatherZones
    .map((z) => `${z.id}:${z.w}x${z.h}:${z.preset}:${z.intensity}`)
    .join("|");

  const hasBursts = fxBursts.some((b) => b.sceneId === sceneId);
  const activeGlobalWeather = preset !== "none";
  const hasZoneWeather = weatherZones.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!activeGlobalWeather && !hasZoneWeather && !hasBursts) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const globalSim = activeGlobalWeather
      ? buildSimState(preset, intensity, width, height, 1)
      : null;

    const zoneSims = weatherZones.map((zone) => {
      const areaScale = Math.min(
        Math.max((zone.w * zone.h) / (680 * 680), 0.25),
        2.2
      );
      return {
        zone,
        sim: buildSimState(zone.preset, zone.intensity, zone.w, zone.h, areaScale),
      };
    });

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      // 1. Clima Global da Cena (sobre toda a tela)
      if (globalSim) {
        stepAndRenderWeatherSim(
          ctx,
          globalSim,
          preset,
          intensity,
          width,
          height,
          dt
        );
      }

      // 2. Climas Localizados por Bloco / Mapa Extra (no espaço do mundo)
      const vp = viewportRef.current;
      if (zoneSims.length > 0) {
        ctx.save();
        ctx.translate(vp.x, vp.y);
        ctx.scale(vp.scale, vp.scale);

        for (const entry of zoneSims) {
          const z = entry.zone;
          ctx.save();
          ctx.translate(z.x, z.y);
          if (z.rotation) {
            ctx.rotate((z.rotation * Math.PI) / 180);
          }
          ctx.beginPath();
          ctx.rect(0, 0, z.w, z.h);
          ctx.clip();
          stepAndRenderWeatherSim(
            ctx,
            entry.sim,
            z.preset,
            z.intensity,
            z.w,
            z.h,
            dt
          );
          ctx.restore();
        }

        ctx.restore();
      }

      // 3. Explosões / Efeitos de Magia pontuais (fx:burst) no espaço do mundo
      if (
        shockwavesRef.current.length > 0 ||
        burstParticlesRef.current.length > 0
      ) {
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

      if (
        activeGlobalWeather ||
        hasZoneWeather ||
        shockwavesRef.current.length > 0 ||
        burstParticlesRef.current.length > 0
      ) {
        rafId = requestAnimationFrame(frame);
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeGlobalWeather,
    hasZoneWeather,
    hasBursts,
    preset,
    intensity,
    zonesSignature,
    width,
    height,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 z-10"
    />
  );
}
