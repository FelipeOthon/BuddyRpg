import type { Point2D } from "./geometry";

export interface BlockingWallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function raySegmentDistance(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  seg: BlockingWallSegment
): number | null {
  const sx = seg.x2 - seg.x1;
  const sy = seg.y2 - seg.y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return null;

  const qpx = seg.x1 - ox;
  const qpy = seg.y1 - oy;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * dy - qpy * dx) / denom;

  if (t >= 0 && u >= -1e-6 && u <= 1 + 1e-6) {
    return t;
  }
  return null;
}

/**
 * Calcula o polígono de visibilidade 2D (array plano [x0, y0, x1, y1, ...])
 * a partir de uma origem e raio máximo em pixels, considerando paredes bloqueadoras.
 */
export function computeVisibilityPolygon(
  origin: Point2D,
  radiusPx: number,
  walls: BlockingWallSegment[]
): number[] {
  const safeRadius = Math.max(radiusPx, 10);
  const angles: number[] = [];

  // 48 raios uniformes ao redor do círculo limite para bordas suaves
  const circleSteps = 48;
  for (let i = 0; i < circleSteps; i++) {
    angles.push(-Math.PI + (2 * Math.PI * i) / circleSteps);
  }

  // Filtra paredes que estão perto do raio de visão/luz
  const maxDistSq = (safeRadius * 1.45) ** 2;
  const nearbyWalls = walls.filter((w) => {
    const d1 = (w.x1 - origin.x) ** 2 + (w.y1 - origin.y) ** 2;
    const d2 = (w.x2 - origin.x) ** 2 + (w.y2 - origin.y) ** 2;
    const midX = (w.x1 + w.x2) / 2;
    const midY = (w.y1 + w.y2) / 2;
    const dm = (midX - origin.x) ** 2 + (midY - origin.y) ** 2;
    return d1 <= maxDistSq || d2 <= maxDistSq || dm <= maxDistSq;
  });

  // Lança raios nos vértices das paredes (+/- epsilon) para capturar sombras precisas nas quinas
  for (const w of nearbyWalls) {
    const endpoints: [number, number][] = [
      [w.x1, w.y1],
      [w.x2, w.y2],
    ];
    for (const [vx, vy] of endpoints) {
      const a = Math.atan2(vy - origin.y, vx - origin.x);
      angles.push(a - 0.00025, a, a + 0.00025);
    }
  }

  // Normaliza e ordena por ângulo [-PI, PI]
  const sorted = angles
    .map((a) => {
      let norm = a;
      while (norm <= -Math.PI) norm += Math.PI * 2;
      while (norm > Math.PI) norm -= Math.PI * 2;
      return norm;
    })
    .sort((a, b) => a - b);

  const points: number[] = [];
  let prevAngle = -999;

  for (const angle of sorted) {
    if (angle - prevAngle < 1e-5) continue;
    prevAngle = angle;

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let minDist = safeRadius;

    for (const w of nearbyWalls) {
      const dist = raySegmentDistance(origin.x, origin.y, dx, dy, w);
      if (dist !== null && dist < minDist) {
        minDist = dist;
      }
    }

    points.push(
      Math.round((origin.x + dx * minDist) * 10) / 10,
      Math.round((origin.y + dy * minDist) * 10) / 10
    );
  }

  return points;
}
