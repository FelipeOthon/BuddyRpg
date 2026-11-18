import type { Point2D } from "./geometry";

function crossProduct(a: Point2D, b: Point2D, p: Point2D): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function lineSegmentIntersection(
  a: Point2D,
  b: Point2D,
  p1: Point2D,
  p2: Point2D
): Point2D {
  const dx1 = b.x - a.x;
  const dy1 = b.y - a.y;
  const dx2 = p2.x - p1.x;
  const dy2 = p2.y - p1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }
  const t = ((p1.x - a.x) * dy2 - (p1.y - a.y) * dx2) / denom;
  return {
    x: Math.round((a.x + t * dx1) * 100) / 100,
    y: Math.round((a.y + t * dy1) * 100) / 100,
  };
}

function clipHalfPlane(
  poly: Point2D[],
  a: Point2D,
  b: Point2D,
  keepLeft: boolean
): Point2D[] {
  if (poly.length < 3) return [];
  const out: Point2D[] = [];
  const sign = keepLeft ? 1 : -1;

  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i]!;
    const prev = poly[(i - 1 + poly.length) % poly.length]!;
    const curSide = crossProduct(a, b, cur) * sign >= -1e-6;
    const prevSide = crossProduct(a, b, prev) * sign >= -1e-6;

    if (curSide) {
      if (!prevSide) {
        out.push(lineSegmentIntersection(a, b, prev, cur));
      }
      out.push(cur);
    } else if (prevSide) {
      out.push(lineSegmentIntersection(a, b, prev, cur));
    }
  }

  return out;
}

export function flatPointsToPolygon(points: number[]): Point2D[] {
  const poly: Point2D[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    poly.push({ x: points[i]!, y: points[i + 1]! });
  }
  return poly;
}

export function polygonToFlatPoints(poly: Point2D[]): number[] {
  const out: number[] = [];
  for (const p of poly) {
    out.push(Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10);
  }
  return out;
}

export function rectToFlatPolygon(
  x: number,
  y: number,
  width: number,
  height: number
): number[] {
  const x0 = Math.min(x, x + width);
  const y0 = Math.min(y, y + height);
  const w = Math.abs(width);
  const h = Math.abs(height);
  return [x0, y0, x0 + w, y0, x0 + w, y0 + h, x0, y0 + h];
}

export function polygonArea(poly: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i]!;
    const p2 = poly[(i + 1) % poly.length]!;
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2;
}

function segmentsIntersect(
  a: Point2D,
  b: Point2D,
  c: Point2D,
  d: Point2D
): boolean {
  const d1 = crossProduct(c, d, a);
  const d2 = crossProduct(c, d, b);
  const d3 = crossProduct(a, b, c);
  const d4 = crossProduct(a, b, d);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/**
 * Divide um polígono (ou retângulo convertido) em dois usando o segmento de corte (a -> b).
 * Retorna null se o segmento não atravessar o polígono em duas partes válidas.
 */
export function slicePolygonByLine(
  flatPoints: number[],
  a: Point2D,
  b: Point2D
): [number[], number[]] | null {
  const poly = flatPointsToPolygon(flatPoints);
  if (poly.length < 3) return null;

  // Confirma que o segmento de corte cruza pelo menos uma aresta do polígono
  let crosses = false;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i]!;
    const p2 = poly[(i + 1) % poly.length]!;
    if (segmentsIntersect(a, b, p1, p2)) {
      crosses = true;
      break;
    }
  }
  if (!crosses) return null;

  const left = clipHalfPlane(poly, a, b, true);
  const right = clipHalfPlane(poly, a, b, false);

  if (
    left.length < 3 ||
    right.length < 3 ||
    polygonArea(left) < 100 ||
    polygonArea(right) < 100
  ) {
    return null;
  }

  return [polygonToFlatPoints(left), polygonToFlatPoints(right)];
}
