import type { DistanceRule } from "@/types/domain";

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

export function snapToGrid(
  pos: Point2D,
  gridSize: number,
  snapEnabled: boolean
): Point2D {
  if (!snapEnabled || gridSize <= 0) {
    return {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
    };
  }
  return {
    x: Math.round(pos.x / gridSize) * gridSize,
    y: Math.round(pos.y / gridSize) * gridSize,
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
