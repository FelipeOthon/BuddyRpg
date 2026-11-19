"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { getSmokeTextures } from "@/lib/board/smokeTexture";
import { parseWeatherEffects } from "@/lib/board/weatherPresets";
import { useBoardStore } from "@/stores/boardStore";
import type {
  FxBurstPreset,
  SceneElement,
  SceneElementData,
  WeatherEffect,
  WeatherPreset,
} from "@/types/domain";

const subscribeNoop = () => () => {};
const getDeviceDpr = () => Math.min(window.devicePixelRatio || 1, 2);

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
  depth: number;
  rot: number;
  rotSpeed: number;
  variant: number;
}

interface RainRipple {
  x: number;
  y: number;
  age: number;
  ttl: number;
  maxRadius: number;
}

interface LightningBolt {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }>;
  alpha: number;
}

interface EffectSim {
  effect: WeatherEffect;
  particles: Particle[];
  ripples: RainRipple[];
  lightningAlpha: number;
  nextLightningSec: number;
  bolts: LightningBolt[];
  elapsed: number;
}

interface MultiWeatherSim {
  effects: EffectSim[];
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

const EFFECT_RENDER_ORDER: Record<WeatherEffect, number> = {
  nightfall: 0,
  fog_mist: 1,
  ash: 2,
  rain: 3,
  snow: 4,
  embers: 5,
};

function generateLightningBolt(
  startX: number,
  boundsW: number,
  boundsH: number
): LightningBolt {
  const segments: LightningBolt["segments"] = [];
  let cx = startX;
  let cy = 0;
  const targetY = boundsH * (0.45 + Math.random() * 0.42);
  const steps = 10 + Math.floor(Math.random() * 6);
  const stepY = targetY / steps;

  for (let i = 0; i < steps; i++) {
    const nx = Math.min(
      boundsW,
      Math.max(0, cx + (Math.random() - 0.52) * (boundsW * 0.085))
    );
    const ny = cy + stepY * (0.75 + Math.random() * 0.5);
    const width = Math.max(0.8, 3.2 - (i / steps) * 2.2);
    segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, width });

    if (i > 1 && i < steps - 2 && Math.random() < 0.45) {
      let bx = nx;
      let by = ny;
      const dir = Math.random() < 0.5 ? -1 : 1;
      for (let b = 0; b < 3; b++) {
        const bnx = bx + dir * (12 + Math.random() * 28);
        const bny = by + 16 + Math.random() * 26;
        segments.push({
          x1: bx,
          y1: by,
          x2: bnx,
          y2: bny,
          width: Math.max(0.5, width * 0.48),
        });
        bx = bnx;
        by = bny;
      }
    }

    cx = nx;
    cy = ny;
  }

  return { segments, alpha: 0.95 };
}

function buildEffectSim(
  effect: WeatherEffect,
  intensity: number,
  boundsW: number,
  boundsH: number,
  areaScale: number
): EffectSim {
  const clamped = Math.min(Math.max(intensity, 0.1), 1);
  const baseCount =
    effect === "rain"
      ? 240
      : effect === "snow"
        ? 160
        : effect === "fog_mist"
          ? 22
          : effect === "embers"
            ? 110
            : effect === "ash"
              ? 125
              : effect === "nightfall"
                ? 42
                : 0;

  const count =
    baseCount > 0
      ? Math.max(8, Math.round(baseCount * clamped * areaScale))
      : 0;

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const depth = Math.random();
    const x = Math.random() * boundsW;
    const y = Math.random() * boundsH;
    const speedMult = 0.52 + depth * 0.85;

    particles.push({
      x,
      y,
      prevX: x,
      prevY: y,
      vx:
        effect === "rain"
          ? (-165 - Math.random() * 55) * speedMult
          : effect === "fog_mist"
            ? (16 + Math.random() * 24) * speedMult
            : effect === "snow"
              ? (Math.random() - 0.35) * 32 * speedMult
              : effect === "nightfall"
                ? (Math.random() - 0.5) * 18
                : (Math.random() - 0.5) * 38 * speedMult,
      vy:
        effect === "rain"
          ? (880 + Math.random() * 380) * speedMult
          : effect === "snow"
            ? (36 + Math.random() * 56) * speedMult
            : effect === "embers"
              ? -(58 + Math.random() * 98) * speedMult
              : effect === "ash"
                ? (22 + Math.random() * 34) * speedMult
                : effect === "nightfall"
                  ? (Math.random() - 0.5) * 14
                  : (Math.random() - 0.5) * 7,
      size:
        effect === "fog_mist"
          ? (Math.min(260, Math.max(90, boundsW * 0.3)) + Math.random() * 140) *
            (0.7 + depth * 0.6)
          : effect === "rain"
            ? 14 + depth * 22
            : effect === "snow"
              ? 1.3 + depth * 4.2
              : effect === "embers"
                ? 1.4 + depth * 3.1
                : effect === "nightfall"
                  ? 1.4 + depth * 2.4
                  : 1.6 + depth * 3.4,
      alpha:
        effect === "fog_mist"
          ? 0.08 + Math.random() * 0.14
          : effect === "rain"
            ? 0.2 + depth * 0.45
            : effect === "snow"
              ? 0.25 + depth * 0.68
              : effect === "embers"
                ? 0.55 + depth * 0.45
                : effect === "nightfall"
                  ? 0.25 + depth * 0.55
                  : 0.28 + Math.random() * 0.48,
      phase: Math.random() * Math.PI * 2,
      depth,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3.2,
      variant: Math.random(),
    });
  }

  return {
    effect,
    particles,
    ripples: [],
    lightningAlpha: 0,
    nextLightningSec: 3.5 + Math.random() * 7.5,
    bolts: [],
    elapsed: Math.random() * 20,
  };
}

function buildMultiSimState(
  preset: WeatherPreset,
  intensity: number,
  boundsW: number,
  boundsH: number,
  areaScale = 1
): MultiWeatherSim {
  const active = parseWeatherEffects(preset).sort(
    (a, b) => EFFECT_RENDER_ORDER[a] - EFFECT_RENDER_ORDER[b]
  );
  return {
    effects: active.map((eff) =>
      buildEffectSim(eff, intensity, boundsW, boundsH, areaScale)
    ),
  };
}

function drawNightfall(
  ctx: CanvasRenderingContext2D,
  sim: EffectSim,
  intensity: number,
  boundsW: number,
  boundsH: number,
  dt: number
) {
  const clamped = Math.min(Math.max(intensity, 0.1), 1);

  // Crepúsculo/Anoitecer cinematográfico: azul-meia-noite + vinheta nas bordas
  ctx.save();
  const cx = boundsW * 0.5;
  const cy = boundsH * 0.45;
  const rad = Math.hypot(boundsW, boundsH) * 0.6;
  const vignette = ctx.createRadialGradient(
    cx,
    cy,
    rad * 0.12,
    cx,
    cy,
    rad
  );
  vignette.addColorStop(0, `rgba(12, 22, 58, ${0.18 + clamped * 0.34})`);
  vignette.addColorStop(0.65, `rgba(6, 12, 36, ${0.26 + clamped * 0.42})`);
  vignette.addColorStop(1, `rgba(2, 5, 18, ${0.36 + clamped * 0.48})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, boundsW, boundsH);

  // Feixe oblíquo suave de luar prateado vindo do canto superior esquerdo
  const moonGrad = ctx.createLinearGradient(0, 0, boundsW * 0.72, boundsH * 0.65);
  moonGrad.addColorStop(0, `rgba(148, 179, 240, ${0.06 + clamped * 0.08})`);
  moonGrad.addColorStop(0.5, `rgba(105, 140, 215, ${0.02 + clamped * 0.03})`);
  moonGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = moonGrad;
  ctx.fillRect(0, 0, boundsW, boundsH);

  // Vagalumes bioluminescentes e poeira estelar cintilante
  ctx.globalCompositeOperation = "lighter";
  for (const p of sim.particles) {
    p.phase += dt * (1.2 + p.depth * 1.4);
    if (p.variant < 0.62) {
      // Vagalume noturno flutuando com pulso suave
      p.x += (p.vx + Math.sin(p.phase * 0.9) * 14) * dt;
      p.y += (p.vy + Math.cos(p.phase * 1.1) * 11) * dt;
      if (p.x < -10) p.x = boundsW + 10;
      if (p.x > boundsW + 10) p.x = -10;
      if (p.y < -10) p.y = boundsH + 10;
      if (p.y > boundsH + 10) p.y = -10;

      const pulse = Math.max(0.08, (Math.sin(p.phase * 1.7) + 1) * 0.5);
      const glowR = p.size * (3.2 + pulse * 2.5);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      const isWarm = p.variant < 0.42;
      const coreRgb = isWarm ? "250, 224, 120" : "134, 239, 172";
      const midRgb = isWarm ? "217, 179, 54" : "52, 211, 153";
      g.addColorStop(0, `rgba(${coreRgb}, ${p.alpha * pulse * clamped})`);
      g.addColorStop(0.35, `rgba(${midRgb}, ${p.alpha * pulse * 0.42 * clamped})`);
      g.addColorStop(1, `rgba(${midRgb}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Ponto estelar/poeira lunar cintilante
      const twinkle = 0.25 + 0.75 * Math.pow((Math.sin(p.phase * 2.1) + 1) * 0.5, 2);
      ctx.fillStyle = `rgba(199, 218, 255, ${p.alpha * twinkle * 0.55 * clamped})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFogMist(
  ctx: CanvasRenderingContext2D,
  sim: EffectSim,
  intensity: number,
  boundsW: number,
  boundsH: number,
  dt: number
) {
  const clamped = Math.min(Math.max(intensity, 0.1), 1);
  const textures = getSmokeTextures();

  ctx.save();
  // Véu atmosférico frio
  const wash = ctx.createLinearGradient(0, 0, 0, boundsH);
  wash.addColorStop(0, `rgba(148, 163, 184, ${0.06 * clamped})`);
  wash.addColorStop(0.55, `rgba(186, 200, 218, ${0.13 * clamped})`);
  wash.addColorStop(1, `rgba(148, 163, 184, ${0.18 * clamped})`);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, boundsW, boundsH);

  // Camadas contínuas de nuvem FBM rolando em paralaxe (realismo volumétrico)
  if (textures) {
    const drawTilePass = (
      img: HTMLCanvasElement,
      scale: number,
      speedX: number,
      speedY: number,
      alpha: number
    ) => {
      const pattern = ctx.createPattern(img, "repeat");
      if (!pattern) return;
      ctx.save();
      ctx.globalAlpha = alpha * clamped;
      const offX = (sim.elapsed * speedX) % (256 * scale);
      const offY = (sim.elapsed * speedY) % (256 * scale);
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);
      ctx.fillStyle = pattern;
      ctx.fillRect(
        -offX / scale - 256,
        -offY / scale - 256,
        boundsW / scale + 512,
        boundsH / scale + 512
      );
      ctx.restore();
    };

    drawTilePass(textures.dense, 2.4, 14, 5, 0.24);
    drawTilePass(textures.wisps, 1.9, -21, 9, 0.28);
  }

  // Bancos de bruma suave orgânica em movimento
  for (const p of sim.particles) {
    p.phase += dt * 0.65;
    p.x += p.vx * dt;
    p.y += Math.sin(p.phase) * 9 * dt;
    if (p.x - p.size > boundsW) p.x = -p.size;
    if (p.y < -p.size) p.y = boundsH + p.size;
    if (p.y > boundsH + p.size) p.y = -p.size;

    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    grad.addColorStop(0, `rgba(220, 232, 248, ${p.alpha * clamped})`);
    grad.addColorStop(0.5, `rgba(190, 206, 228, ${p.alpha * 0.48 * clamped})`);
    grad.addColorStop(1, "rgba(180, 198, 220, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(
      p.x,
      p.y,
      p.size * 1.25,
      p.size * 0.72,
      Math.sin(p.phase * 0.3) * 0.15,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawRain(
  ctx: CanvasRenderingContext2D,
  sim: EffectSim,
  intensity: number,
  boundsW: number,
  boundsH: number,
  dt: number
) {
  const clamped = Math.min(Math.max(intensity, 0.1), 1);

  ctx.save();
  // Tonalidade cinza-azul de temporal
  ctx.fillStyle = `rgba(10, 22, 46, ${0.11 * clamped})`;
  ctx.fillRect(0, 0, boundsW, boundsH);

  // Relâmpagos reais com ramificação quando chuva >= 35%
  if (clamped >= 0.35) {
    sim.nextLightningSec -= dt;
    if (sim.nextLightningSec <= 0) {
      sim.lightningAlpha = 0.2 + Math.random() * 0.28 * clamped;
      sim.bolts.push(
        generateLightningBolt(
          boundsW * (0.15 + Math.random() * 0.7),
          boundsW,
          boundsH
        )
      );
      sim.nextLightningSec =
        Math.max(2.2, 8.5 - clamped * 5) + Math.random() * 6.5;
    }
  }

  if (sim.lightningAlpha > 0.004) {
    ctx.fillStyle = `rgba(218, 235, 255, ${sim.lightningAlpha})`;
    ctx.fillRect(0, 0, boundsW, boundsH);
    sim.lightningAlpha *= Math.pow(0.015, dt);
  }

  if (sim.bolts.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    sim.bolts = sim.bolts.filter((bolt) => {
      if (bolt.alpha < 0.04) return false;
      ctx.strokeStyle = `rgba(186, 224, 255, ${bolt.alpha * 0.65})`;
      ctx.shadowColor = "rgba(147, 197, 253, 0.9)";
      ctx.shadowBlur = 12;
      for (const seg of bolt.segments) {
        ctx.lineWidth = seg.width;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }
      bolt.alpha *= Math.pow(0.008, dt);
      return true;
    });
    ctx.restore();
  }

  // Gotas em 3 camadas de profundidade (traços agrupados por camada: 3 desenhos/quadro)
  ctx.lineCap = "round";
  const RAIN_BUCKETS = [
    { maxDepth: 0.34, alpha: 0.22, width: 0.8 },
    { maxDepth: 0.67, alpha: 0.38, width: 1.15 },
    { maxDepth: 1.01, alpha: 0.58, width: 1.7 },
  ] as const;
  const bucketPaths = RAIN_BUCKETS.map(() => new Path2D());

  for (const p of sim.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.y > boundsH + 20) {
      if (Math.random() < 0.34 * clamped && sim.ripples.length < 95) {
        sim.ripples.push({
          x: Math.random() * boundsW,
          y: Math.random() * boundsH,
          age: 0,
          ttl: 0.34 + Math.random() * 0.24,
          maxRadius: 4.5 + Math.random() * 9.5,
        });
      }
      p.y = -25 - Math.random() * 45;
      p.x = Math.random() * (boundsW + 180) - 30;
    } else if (p.x < -40) {
      p.x = boundsW + 25;
    }

    const tailX = p.x - p.vx * 0.026;
    const tailY = p.y - p.vy * 0.026;
    const bucketIdx = RAIN_BUCKETS.findIndex((b) => p.depth < b.maxDepth);
    const path = bucketPaths[bucketIdx < 0 ? 2 : bucketIdx]!;
    path.moveTo(tailX, tailY);
    path.lineTo(p.x, p.y);
  }

  RAIN_BUCKETS.forEach((bucket, idx) => {
    ctx.strokeStyle = `rgba(214, 235, 255, ${bucket.alpha * clamped})`;
    ctx.lineWidth = bucket.width;
    ctx.stroke(bucketPaths[idx]!);
  });

  // Coroas de impacto / respingos na superfície
  sim.ripples = sim.ripples.filter((r) => {
    r.age += dt;
    if (r.age >= r.ttl) return false;
    const t = r.age / r.ttl;
    const rad = r.maxRadius * t;
    const op = (1 - t) * 0.42 * clamped;
    ctx.strokeStyle = `rgba(205, 232, 255, ${op})`;
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, rad * 1.35, rad * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (t < 0.55) {
      const dropH = Math.sin((t / 0.55) * Math.PI) * 5;
      ctx.fillStyle = `rgba(225, 242, 255, ${op * 0.85})`;
      ctx.fillRect(r.x - rad * 0.4, r.y - dropH, 1.3, 1.3);
      ctx.fillRect(r.x + rad * 0.4, r.y - dropH * 0.8, 1.3, 1.3);
    }
    return true;
  });

  ctx.restore();
}

function drawSnow(
  ctx: CanvasRenderingContext2D,
  sim: EffectSim,
  intensity: number,
  boundsW: number,
  boundsH: number,
  dt: number
) {
  const clamped = Math.min(Math.max(intensity, 0.1), 1);

  ctx.save();
  // Halo invernal frio nas bordas
  const frost = ctx.createRadialGradient(
    boundsW * 0.5,
    boundsH * 0.5,
    Math.min(boundsW, boundsH) * 0.25,
    boundsW * 0.5,
    boundsH * 0.5,
    Math.hypot(boundsW, boundsH) * 0.65
  );
  frost.addColorStop(0, "rgba(224, 242, 254, 0)");
  frost.addColorStop(1, `rgba(186, 224, 248, ${0.14 * clamped})`);
  ctx.fillStyle = frost;
  ctx.fillRect(0, 0, boundsW, boundsH);

  const windGust = Math.sin(sim.elapsed * 0.45) * 18 * clamped;
  for (const p of sim.particles) {
    p.phase += dt * (1.2 + p.depth * 1.1);
    const sway = Math.sin(p.phase) * (20 + p.depth * 24);
    p.x += (p.vx + sway + windGust) * dt;
    p.y += p.vy * dt;

    if (p.y > boundsH + 14) {
      p.y = -14;
      p.x = Math.random() * boundsW;
    }
    if (p.x > boundsW + 14) p.x = -14;
    if (p.x < -14) p.x = boundsW + 14;

    if (p.depth > 0.72) {
      // Flocos de primeiro plano suaves estilo bokeh
      const bokeh = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.8);
      bokeh.addColorStop(0, `rgba(248, 252, 255, ${p.alpha * 0.72 * clamped})`);
      bokeh.addColorStop(0.5, `rgba(224, 242, 254, ${p.alpha * 0.3 * clamped})`);
      bokeh.addColorStop(1, "rgba(224, 242, 254, 0)");
      ctx.fillStyle = bokeh;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(245, 250, 255, ${p.alpha * clamped})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawEmbers(
  ctx: CanvasRenderingContext2D,
  sim: EffectSim,
  intensity: number,
  boundsW: number,
  boundsH: number,
  dt: number
) {
  const clamped = Math.min(Math.max(intensity, 0.1), 1);

  ctx.save();
  // Brilho de calor inferior
  const heatGlow = ctx.createLinearGradient(0, boundsH * 0.45, 0, boundsH);
  heatGlow.addColorStop(0, "rgba(234, 88, 12, 0)");
  heatGlow.addColorStop(1, `rgba(194, 65, 12, ${0.15 * clamped})`);
  ctx.fillStyle = heatGlow;
  ctx.fillRect(0, 0, boundsW, boundsH);

  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const p of sim.particles) {
    p.prevX = p.x;
    p.prevY = p.y;
    p.phase += dt * (2.6 + p.depth * 2.2);
    p.x += (p.vx + Math.sin(p.phase) * 34) * dt;
    p.y += p.vy * dt;

    if (p.y < -18) {
      p.y = boundsH + 14;
      p.x = Math.random() * boundsW;
      p.prevX = p.x;
      p.prevY = p.y;
    }
    if (p.x < -14) p.x = boundsW + 14;
    if (p.x > boundsW + 14) p.x = -14;

    const flicker = 0.65 + 0.35 * Math.sin(p.phase * 2.7);
    const op = Math.min(1, p.alpha * flicker * clamped);

    // Cauda luminosa curta
    ctx.strokeStyle =
      p.variant > 0.35
        ? `rgba(251, 146, 60, ${op * 0.5})`
        : `rgba(253, 224, 71, ${op * 0.55})`;
    ctx.lineWidth = p.size * 0.8;
    ctx.beginPath();
    ctx.moveTo(p.prevX, p.prevY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Halo quente + centro incandescente branco-dourado
    const haloR = p.size * 3.4;
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
    halo.addColorStop(0, `rgba(255, 250, 215, ${op})`);
    halo.addColorStop(0.28, `rgba(251, 146, 60, ${op * 0.7})`);
    halo.addColorStop(0.65, `rgba(239, 68, 68, ${op * 0.25})`);
    halo.addColorStop(1, "rgba(239, 68, 68, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAsh(
  ctx: CanvasRenderingContext2D,
  sim: EffectSim,
  intensity: number,
  boundsW: number,
  boundsH: number,
  dt: number
) {
  const clamped = Math.min(Math.max(intensity, 0.1), 1);

  ctx.save();
  ctx.fillStyle = `rgba(38, 32, 30, ${0.14 * clamped})`;
  ctx.fillRect(0, 0, boundsW, boundsH);

  for (const p of sim.particles) {
    p.phase += dt * 1.4;
    p.rot += p.rotSpeed * dt;
    p.x += (p.vx + Math.sin(p.phase) * 26) * dt;
    p.y += p.vy * dt;

    if (p.y > boundsH + 14) {
      p.y = -14;
      p.x = Math.random() * boundsW;
    }
    if (p.x < -14) p.x = boundsW + 14;
    if (p.x > boundsW + 14) p.x = -14;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.variant > 0.88) {
      ctx.fillStyle = `rgba(249, 115, 22, ${p.alpha * 0.8 * clamped})`;
    } else {
      ctx.fillStyle = `rgba(182, 174, 168, ${p.alpha * clamped})`;
    }
    ctx.fillRect(-p.size * 0.65, -p.size * 0.28, p.size * 1.3, p.size * 0.56);
    ctx.restore();
  }
  ctx.restore();
}

function stepAndRenderMultiSim(
  ctx: CanvasRenderingContext2D,
  sim: MultiWeatherSim,
  intensity: number,
  boundsW: number,
  boundsH: number,
  dt: number
) {
  for (const eff of sim.effects) {
    eff.elapsed += dt;
    switch (eff.effect) {
      case "nightfall":
        drawNightfall(ctx, eff, intensity, boundsW, boundsH, dt);
        break;
      case "fog_mist":
        drawFogMist(ctx, eff, intensity, boundsW, boundsH, dt);
        break;
      case "rain":
        drawRain(ctx, eff, intensity, boundsW, boundsH, dt);
        break;
      case "snow":
        drawSnow(ctx, eff, intensity, boundsW, boundsH, dt);
        break;
      case "embers":
        drawEmbers(ctx, eff, intensity, boundsW, boundsH, dt);
        break;
      case "ash":
        drawAsh(ctx, eff, intensity, boundsW, boundsH, dt);
        break;
    }
  }
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
  const dpr = useSyncExternalStore(
    subscribeNoop,
    getDeviceDpr,
    () => 1
  );
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
      if (parseWeatherEffects(d.weatherPreset).length === 0) continue;
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
        preset: d.weatherPreset!,
        intensity: d.weatherIntensity ?? 0.6,
      });
    }
    return list;
  }, [elements, sceneId]);

  const zonesSignature = weatherZones
    .map((z) => `${z.id}:${z.w}x${z.h}:${z.preset}:${z.intensity}`)
    .join("|");

  const hasBursts = fxBursts.some((b) => b.sceneId === sceneId);
  const activeGlobalEffects = parseWeatherEffects(preset);
  const activeGlobalWeather = activeGlobalEffects.length > 0;
  const hasZoneWeather = weatherZones.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!activeGlobalWeather && !hasZoneWeather && !hasBursts) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const globalSim = activeGlobalWeather
      ? buildMultiSimState(preset, intensity, width, height, 1)
      : null;

    const zoneSims = weatherZones.map((zone) => {
      const areaScale = Math.min(
        Math.max((zone.w * zone.h) / (680 * 680), 0.25),
        2.2
      );
      return {
        zone,
        sim: buildMultiSimState(
          zone.preset,
          zone.intensity,
          zone.w,
          zone.h,
          areaScale
        ),
      };
    });

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // 1. Climas Globais da Cena (combinados simultaneamente sobre toda a tela)
      if (globalSim) {
        stepAndRenderMultiSim(ctx, globalSim, intensity, width, height, dt);
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
          stepAndRenderMultiSim(ctx, entry.sim, z.intensity, z.w, z.h, dt);
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
    dpr,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(width * dpr)}
      height={Math.round(height * dpr)}
      style={{ width, height }}
      className="pointer-events-none absolute inset-0 z-10"
    />
  );
}
