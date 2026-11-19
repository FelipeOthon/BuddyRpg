import type { ExploredSpot } from "@/stores/boardStore";

export const MAX_EXPLORED_SPOTS = 900;
const PRUNE_THRESHOLD = 240;
const STORAGE_VERSION = 1;

/** Verdadeiro se `inner` já está totalmente coberto por `outer`. */
export function isSpotContained(
  inner: ExploredSpot,
  outer: ExploredSpot
): boolean {
  const dist = Math.hypot(inner.x - outer.x, inner.y - outer.y);
  return dist + inner.radiusPx <= outer.radiusPx;
}

/** Decide se vale a pena registrar um novo ponto de exploração. */
export function shouldRecordSpot(
  existing: readonly ExploredSpot[],
  spot: ExploredSpot,
  minStepPx: number
): boolean {
  const minSq = minStepPx * minStepPx;
  for (let i = existing.length - 1; i >= 0; i--) {
    const s = existing[i]!;
    if (isSpotContained(spot, s)) return false;
    const dx = s.x - spot.x;
    const dy = s.y - spot.y;
    if (dx * dx + dy * dy < minSq && Math.abs(s.radiusPx - spot.radiusPx) < 12) {
      return false;
    }
  }
  return true;
}

/** Redundante: coberto por outro ou com centro quase idêntico (≤ 20% do raio). */
function isRedundantSpot(inner: ExploredSpot, outer: ExploredSpot): boolean {
  if (isSpotContained(inner, outer)) return true;
  const dist = Math.hypot(inner.x - outer.x, inner.y - outer.y);
  return (
    outer.radiusPx >= inner.radiusPx * 0.95 && dist <= inner.radiusPx * 0.2
  );
}

/** Remove pontos redundantes e limita o tamanho total. */
export function pruneExploredSpots(
  spots: readonly ExploredSpot[],
  max = MAX_EXPLORED_SPOTS
): ExploredSpot[] {
  if (spots.length <= PRUNE_THRESHOLD) return spots.slice();
  const kept: ExploredSpot[] = [];
  const bySize = spots
    .map((spot, index) => ({ spot, index }))
    .sort((a, b) => b.spot.radiusPx - a.spot.radiusPx || a.index - b.index);
  const keepFlags = new Array<boolean>(spots.length).fill(false);
  const accepted: ExploredSpot[] = [];
  for (const { spot, index } of bySize) {
    if (accepted.some((o) => isRedundantSpot(spot, o))) continue;
    accepted.push(spot);
    keepFlags[index] = true;
  }
  spots.forEach((spot, idx) => {
    if (keepFlags[idx]) kept.push(spot);
  });
  return kept.length > max ? kept.slice(kept.length - max) : kept;
}

export function appendExploredSpot(
  existing: readonly ExploredSpot[],
  spot: ExploredSpot,
  minStepPx: number
): ExploredSpot[] | null {
  if (!shouldRecordSpot(existing, spot, minStepPx)) return null;
  return pruneExploredSpots([...existing, spot]);
}

interface StoredTrail {
  v: number;
  epoch: number;
  spots: ExploredSpot[];
}

export function exploredStorageKey(
  campaignId: string,
  sceneId: string,
  layer: "fog" | "darkness"
): string {
  return `buddyrpg:trail:${campaignId}:${sceneId}:${layer}`;
}

function isValidSpot(value: unknown): value is ExploredSpot {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.x === "number" &&
    typeof s.y === "number" &&
    typeof s.radiusPx === "number" &&
    Number.isFinite(s.x) &&
    Number.isFinite(s.y) &&
    Number.isFinite(s.radiusPx) &&
    (s.poly === undefined ||
      (Array.isArray(s.poly) && s.poly.every((n) => typeof n === "number")))
  );
}

export function serializeTrail(
  spots: readonly ExploredSpot[],
  epoch: number
): string {
  const payload: StoredTrail = {
    v: STORAGE_VERSION,
    epoch,
    spots: spots.slice(-MAX_EXPLORED_SPOTS),
  };
  return JSON.stringify(payload);
}

/** Retorna os pontos salvos se a versão e a "época" de reset coincidirem. */
export function parseTrail(
  raw: string | null,
  expectedEpoch: number
): ExploredSpot[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTrail>;
    if (
      parsed.v !== STORAGE_VERSION ||
      parsed.epoch !== expectedEpoch ||
      !Array.isArray(parsed.spots)
    ) {
      return [];
    }
    return parsed.spots.filter(isValidSpot).slice(-MAX_EXPLORED_SPOTS);
  } catch {
    return [];
  }
}
