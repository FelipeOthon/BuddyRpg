/**
 * Gera contornos orgânicos determinísticos em forma de nuvens/neblina
 * para que blocos retangulares ou circulares de Névoa/Escuridão não tenham
 * bordas retas artificiais ("cara de quadrado").
 */

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pseudoRand(seed: number, index: number): number {
  let x = (seed ^ Math.imul(index + 1, 374761393)) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967295;
}

/**
 * Converte um retângulo em um polígono fechado ondulado (estilo cúmulos de nuvem).
 */
export function buildOrganicRectCloudPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  seedId: string,
  swellPx = 18
): number[] {
  const w = Math.max(Math.abs(width), 8);
  const h = Math.max(Math.abs(height), 8);
  const left = width < 0 ? x + width : x;
  const top = height < 0 ? y + height : y;
  const seed = hashString(seedId);
  const swell = Math.min(swellPx, Math.max(8, Math.min(w, h) * 0.28));

  const points: number[] = [];
  let idx = 0;

  const pushEdge = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    nx: number,
    ny: number
  ) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(4, Math.min(28, Math.round(len / 34)));
    const tx = (x1 - x0) / Math.max(len, 1);
    const ty = (y1 - y0) / Math.max(len, 1);

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const r1 = pseudoRand(seed, idx++);
      const r2 = pseudoRand(seed, idx++);
      // Lóbulos suaves + leve variação orgânica ao longo da aresta
      const wave = 0.45 + 0.55 * Math.sin(t * Math.PI * (2 + Math.floor(steps / 3)));
      const bulge = swell * (0.28 + r1 * 0.72 * wave);
      const jitterAlong = (r2 - 0.5) * Math.min(len / steps, 22) * 0.45;
      points.push(
        x0 + (x1 - x0) * t + nx * bulge + tx * jitterAlong,
        y0 + (y1 - y0) * t + ny * bulge + ty * jitterAlong
      );
    }
  };

  pushEdge(left, top, left + w, top, 0, -1); // Topo
  pushEdge(left + w, top, left + w, top + h, 1, 0); // Direita
  pushEdge(left + w, top + h, left, top + h, 0, 1); // Base
  pushEdge(left, top + h, left, top, -1, 0); // Esquerda

  return points;
}

/**
 * Converte um círculo em contorno ondulado de nuvem orgânica.
 */
export function buildOrganicCircleCloudPoints(
  cx: number,
  cy: number,
  radius: number,
  seedId: string,
  swellPx = 16
): number[] {
  const r = Math.max(radius, 6);
  const seed = hashString(seedId);
  const segments = Math.max(16, Math.min(48, Math.round((2 * Math.PI * r) / 30)));
  const swell = Math.min(swellPx, r * 0.25);
  const points: number[] = [];

  for (let i = 0; i < segments; i++) {
    const theta = (Math.PI * 2 * i) / segments;
    const n1 = pseudoRand(seed, i * 2);
    const n2 = pseudoRand(seed, i * 2 + 1);
    const wave = Math.sin(theta * 5 + n1 * 2) * 0.5 + 0.5;
    const radial = r + swell * (0.15 + 0.85 * wave * (0.55 + n2 * 0.45));
    points.push(cx + Math.cos(theta) * radial, cy + Math.sin(theta) * radial);
  }

  return points;
}
