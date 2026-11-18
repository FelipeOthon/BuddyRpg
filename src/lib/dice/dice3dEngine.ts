import type { RollResult } from "@/types/domain";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PolyhedronMesh {
  vertices: Vec3[];
  faces: number[][];
}

export interface SimulatedDie3D {
  id: string;
  sides: number;
  value: number;
  kept: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  wx: number;
  wy: number;
  wz: number;
  radius: number;
  settled: boolean;
  mesh: PolyhedronMesh;
}

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function createTetrahedron(): PolyhedronMesh {
  const vertices: Vec3[] = [
    { x: 1, y: 1, z: 1 },
    { x: -1, y: -1, z: 1 },
    { x: -1, y: 1, z: -1 },
    { x: 1, y: -1, z: -1 },
  ].map(normalizeVec3);
  const faces = [
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3],
    [1, 3, 2],
  ];
  return { vertices, faces };
}

function createCube(): PolyhedronMesh {
  const s = 1 / Math.sqrt(3);
  const vertices: Vec3[] = [
    { x: -s, y: -s, z: -s },
    { x: s, y: -s, z: -s },
    { x: s, y: s, z: -s },
    { x: -s, y: s, z: -s },
    { x: -s, y: -s, z: s },
    { x: s, y: -s, z: s },
    { x: s, y: s, z: s },
    { x: -s, y: s, z: s },
  ];
  const faces = [
    [0, 1, 2, 3],
    [4, 7, 6, 5],
    [0, 4, 5, 1],
    [2, 6, 7, 3],
    [0, 3, 7, 4],
    [1, 5, 6, 2],
  ];
  return { vertices, faces };
}

function createOctahedron(): PolyhedronMesh {
  const vertices: Vec3[] = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];
  const faces = [
    [4, 0, 2],
    [4, 2, 1],
    [4, 1, 3],
    [4, 3, 0],
    [5, 2, 0],
    [5, 1, 2],
    [5, 3, 1],
    [5, 0, 3],
  ];
  return { vertices, faces };
}

function createIcosahedron(): PolyhedronMesh {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw: Vec3[] = [
    { x: -1, y: t, z: 0 },
    { x: 1, y: t, z: 0 },
    { x: -1, y: -t, z: 0 },
    { x: 1, y: -t, z: 0 },
    { x: 0, y: -1, z: t },
    { x: 0, y: 1, z: t },
    { x: 0, y: -1, z: -t },
    { x: 0, y: 1, z: -t },
    { x: t, y: 0, z: -1 },
    { x: t, y: 0, z: 1 },
    { x: -t, y: 0, z: -1 },
    { x: -t, y: 0, z: 1 },
  ].map(normalizeVec3);

  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  return { vertices: raw, faces };
}

function getMeshForSides(sides: number): PolyhedronMesh {
  if (sides === 4) return createTetrahedron();
  if (sides === 6) return createCube();
  if (sides === 8 || sides === 10 || sides === 100) return createOctahedron();
  return createIcosahedron();
}

export function rotatePoint3D(
  p: Vec3,
  rx: number,
  ry: number,
  rz: number
): Vec3 {
  // Rotação X
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = p.y * cosX - p.z * sinX;
  const z1 = p.y * sinX + p.z * cosX;

  // Rotação Y
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x2 = p.x * cosY + z1 * sinY;
  const z2 = -p.x * sinY + z1 * cosY;

  // Rotação Z
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x2 * cosZ - y1 * sinZ;
  const y3 = x2 * sinZ + y1 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

export function buildDiceSimulation(
  roll: RollResult,
  width: number,
  height: number
): { dice: SimulatedDie3D[]; particles: SparkParticle[] } {
  const dice: SimulatedDie3D[] = [];
  const particles: SparkParticle[] = [];

  const flatDice: Array<{ sides: number; value: number; kept: boolean }> = [];
  for (const term of roll.terms) {
    if (term.type === "dice") {
      for (const r of term.rolls) {
        flatDice.push({
          sides: term.sides,
          value: r.v,
          kept: r.kept,
        });
      }
    }
  }

  const count = Math.min(flatDice.length, 16);
  const centerX = width * 0.5;
  const centerY = height * 0.52;

  for (let i = 0; i < count; i++) {
    const item = flatDice[i]!;
    const angle = (i / Math.max(count, 1)) * Math.PI * 2 + (i % 2) * 0.4;
    const startX = width * 0.18 + (i % 4) * 48;
    const startY = height * 0.82 - Math.floor(i / 4) * 35;

    const targetX =
      centerX + Math.cos(angle) * Math.min(count * 26, width * 0.24);
    const targetY =
      centerY + Math.sin(angle) * Math.min(count * 20, height * 0.18);

    const flightTime = 38 + (i % 3) * 4;

    dice.push({
      id: `d3d-${i}`,
      sides: item.sides,
      value: item.value,
      kept: item.kept,
      x: startX,
      y: startY,
      z: 140 + (i % 3) * 35,
      vx: (targetX - startX) / flightTime,
      vy: (targetY - startY) / flightTime,
      vz: 6.5 + (i % 3) * 1.5,
      rx: i * 1.1,
      ry: i * 1.7,
      rz: i * 0.8,
      wx: (i % 2 === 0 ? 1 : -1) * 0.28,
      wy: 0.32,
      wz: 0.22,
      radius: item.sides === 20 ? 38 : 34,
      settled: false,
      mesh: getMeshForSides(item.sides),
    });
  }

  return { dice, particles };
}

export function stepDiceSimulation(
  dice: SimulatedDie3D[],
  particles: SparkParticle[],
  width: number,
  height: number
): void {
  const gravity = 0.85;
  const margin = 60;

  for (let i = 0; i < dice.length; i++) {
    const d = dice[i]!;
    if (!d.settled) {
      d.x += d.vx;
      d.y += d.vy;
      d.z += d.vz;
      d.vz -= gravity;

      d.rx += d.wx;
      d.ry += d.wy;
      d.rz += d.wz;

      // Colisão com as bordas da tela
      if (d.x < margin) {
        d.x = margin;
        d.vx = Math.abs(d.vx) * 0.7;
      } else if (d.x > width - margin) {
        d.x = width - margin;
        d.vx = -Math.abs(d.vx) * 0.7;
      }

      if (d.y < margin + 50) {
        d.y = margin + 50;
        d.vy = Math.abs(d.vy) * 0.7;
      } else if (d.y > height - margin) {
        d.y = height - margin;
        d.vy = -Math.abs(d.vy) * 0.7;
      }

      // Quique no tabuleiro (z = 0)
      if (d.z <= 0) {
        d.z = 0;
        if (Math.abs(d.vz) > 2.1) {
          d.vz = -d.vz * 0.54;
          d.vx *= 0.78;
          d.vy *= 0.78;
          d.wx *= 0.72;
          d.wy *= 0.72;
          d.wz *= 0.72;
        } else {
          d.vz = 0;
          d.vx *= 0.82;
          d.vy *= 0.82;
          d.wx *= 0.65;
          d.wy *= 0.65;
          d.wz *= 0.65;

          if (
            Math.hypot(d.vx, d.vy) < 0.25 &&
            Math.hypot(d.wx, d.wy, d.wz) < 0.04
          ) {
            d.settled = true;
            d.vx = 0;
            d.vy = 0;
            d.wx = 0;
            d.wy = 0;
            d.wz = 0;

            // Dispara partículas quando d20 crítico ou falha assenta na mesa
            if (d.kept && d.sides === 20 && (d.value === 20 || d.value === 1)) {
              const isCrit = d.value === 20;
              for (let p = 0; p < 24; p++) {
                const ang = (p / 24) * Math.PI * 2;
                const spd = 1.5 + (p % 4) * 1.1;
                particles.push({
                  x: d.x,
                  y: d.y,
                  vx: Math.cos(ang) * spd,
                  vy: Math.sin(ang) * spd,
                  size: 3 + (p % 3),
                  alpha: 1,
                  color: isCrit ? "#fbbf24" : "#f43f5e",
                });
              }
            }
          }
        }
      }
    }
  }

  // Repulsão entre dados para não ficarem empilhados no mesmo ponto
  for (let i = 0; i < dice.length; i++) {
    for (let j = i + 1; j < dice.length; j++) {
      const a = dice[i]!;
      const b = dice[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.radius + b.radius + 10;
      if (dist > 0 && dist < minDist) {
        const push = (minDist - dist) * 0.15;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }

  // Atualiza partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i]!;
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.alpha -= 0.025;
    if (pt.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}
