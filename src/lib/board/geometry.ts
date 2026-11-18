import type { DistanceRule, GridType } from "@/types/domain";

export interface Point2D {
  x: number;
  y: number;
}

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function screenToWorld(
  screenPoint: Point2D,
  viewport: ViewportTransform
): Point2D {
  return {
    x: (screenPoint.x - viewport.x) / viewport.scale,
    y: (screenPoint.y - viewport.y) / viewport.scale,
  };
}

export function worldToScreen(
  worldPoint: Point2D,
  viewport: ViewportTransform
): Point2D {
  return {
    x: worldPoint.x * viewport.scale + viewport.x,
    y: worldPoint.y * viewport.scale + viewport.y,
  };
}

function cubeRound(qf: number, rf: number): { q: number; r: number } {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);

  const qDiff = Math.abs(q - qf);
  const rDiff = Math.abs(r - rf);
  const sDiff = Math.abs(s - sf);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  }
  return { q, r };
}

export function snapToGrid(
  pos: Point2D,
  gridSize: number,
  snapEnabled: boolean,
  offsetX = 0,
  offsetY = 0,
  gridType: GridType = "square"
): Point2D {
  if (!snapEnabled || gridSize <= 0 || gridType === "none") {
    return {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
    };
  }

  if (gridType === "hex_pointy" || gridType === "hex_flat") {
    const rSize = gridSize / Math.sqrt(3);
    const px = pos.x - offsetX;
    const py = pos.y - offsetY;

    if (gridType === "hex_pointy") {
      const qf = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / rSize;
      const rf = ((2 / 3) * py) / rSize;
      const { q, r } = cubeRound(qf, rf);
      const cx = rSize * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
      const cy = rSize * ((3 / 2) * r);
      return {
        x: Math.round(cx + offsetX - gridSize / 2),
        y: Math.round(cy + offsetY - gridSize / 2),
      };
    } else {
      const qf = ((2 / 3) * px) / rSize;
      const rf = ((-1 / 3) * px + (Math.sqrt(3) / 3) * py) / rSize;
      const { q, r } = cubeRound(qf, rf);
      const cx = rSize * ((3 / 2) * q);
      const cy = rSize * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
      return {
        x: Math.round(cx + offsetX - gridSize / 2),
        y: Math.round(cy + offsetY - gridSize / 2),
      };
    }
  }

  return {
    x: Math.round((pos.x - offsetX) / gridSize) * gridSize + offsetX,
    y: Math.round((pos.y - offsetY) / gridSize) * gridSize + offsetY,
  };
}

export interface DistanceMeasurement {
  cells: number;
  meters: number;
  formatted: string;
}

export function measureDistance(params: {
  start: Point2D;
  end: Point2D;
  gridSize: number;
  metersPerCell: number;
  rule: DistanceRule;
}): DistanceMeasurement {
  const { start, end, gridSize, metersPerCell, rule } = params;
  const safeGrid = gridSize > 0 ? gridSize : 70;
  const dxCells = Math.abs(end.x - start.x) / safeGrid;
  const dyCells = Math.abs(end.y - start.y) / safeGrid;

  let rawCells = 0;
  if (rule === "chebyshev") {
    rawCells = Math.max(dxCells, dyCells);
  } else if (rule === "alternating") {
    const diagonal = Math.min(dxCells, dyCells);
    const straight = Math.abs(dxCells - dyCells);
    rawCells = straight + diagonal * 1.5;
  } else {
    rawCells = Math.hypot(dxCells, dyCells);
  }

  const cells = Math.round(rawCells * 10) / 10;
  const meters = Math.round(cells * metersPerCell * 10) / 10;

  return {
    cells,
    meters,
    formatted: `${cells} q · ${meters} m`,
  };
}
