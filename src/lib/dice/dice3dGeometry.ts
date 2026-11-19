import * as THREE from "three";

export type DieTheme = "standard" | "crit" | "fumble" | "dropped";

export interface FaceOrientation {
  normal: THREE.Vector3;
  upTangent: THREE.Vector3;
}

export interface BuiltDieAssets {
  geometry: THREE.BufferGeometry;
  materials: THREE.MeshPhysicalMaterial[];
  faceMap: Map<number, FaceOrientation>;
  restHeight: number;
}

interface RawPolyFace {
  value: number;
  label: string;
  vertices: THREE.Vector3[];
  normal: THREE.Vector3;
  upTangent: THREE.Vector3;
  d4ApexLabels?: [string, string, string];
}

const PHI = (1 + Math.sqrt(5)) / 2;

function getColorPalette(theme: DieTheme) {
  if (theme === "crit") {
    return {
      bgA: "#043927",
      bgB: "#0a6847",
      vein: "rgba(110, 231, 183, 0.24)",
      rim: "#fde68a",
      textA: "#fef9c3",
      textB: "#f59e0b",
      shadow: "rgba(0, 20, 12, 0.9)",
    };
  }
  if (theme === "fumble") {
    return {
      bgA: "#3b0718",
      bgB: "#7f1d1d",
      vein: "rgba(251, 113, 133, 0.24)",
      rim: "#fda4af",
      textA: "#ffe4e6",
      textB: "#fb7185",
      shadow: "rgba(25, 0, 8, 0.92)",
    };
  }
  if (theme === "dropped") {
    return {
      bgA: "#27272a",
      bgB: "#3f3f46",
      vein: "rgba(161, 161, 170, 0.14)",
      rim: "#71717a",
      textA: "#d4d4d8",
      textB: "#a1a1aa",
      shadow: "rgba(0, 0, 0, 0.75)",
    };
  }
  // Obsidian & Gold Leaf (padrão luxuoso)
  return {
    bgA: "#0b1120",
    bgB: "#1e293b",
    vein: "rgba(148, 180, 255, 0.16)",
    rim: "#f59e0b",
    textA: "#fef08a",
    textB: "#d97706",
    shadow: "rgba(2, 6, 23, 0.92)",
  };
}

// Cache por face/tema para evitar recriar texturas a cada rolagem
const faceTextureCache = new Map<
  string,
  { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }
>();

function drawFaceTextures(params: {
  label: string;
  sides: number;
  theme: DieTheme;
  d4ApexLabels?: [string, string, string];
  polyOutline?: Array<[number, number]>;
}): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const cacheKey = `${params.sides}:${params.theme}:${params.label}:${params.d4ApexLabels?.join(",") ?? ""}:${params.polyOutline ? params.polyOutline.map(([u, v]) => `${u.toFixed(2)},${v.toFixed(2)}`).join(";") : ""}`;
  const cached = faceTextureCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext("2d")!;

  const pal = getColorPalette(params.theme);

  // 1. Base marmorizada / resina acrílica profunda
  const grad = ctx.createRadialGradient(
    size * 0.42,
    size * 0.36,
    12,
    size * 0.5,
    size * 0.5,
    size * 0.72
  );
  grad.addColorStop(0, pal.bgB);
  grad.addColorStop(1, pal.bgA);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Fundo neutro para relevo (192 = superfície polida)
  bCtx.fillStyle = "rgb(192,192,192)";
  bCtx.fillRect(0, 0, size, size);

  // Veios sutis determinísticos derivados do texto da face
  let seed = 17;
  for (let i = 0; i < params.label.length; i++) {
    seed = (seed * 31 + params.label.charCodeAt(i)) | 0;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return ((seed >>> 0) % 10000) / 10000;
  };

  ctx.save();
  ctx.strokeStyle = pal.vein;
  for (let v = 0; v < 5; v++) {
    ctx.lineWidth = 1.2 + rand() * 3.5;
    ctx.beginPath();
    let vx = rand() * size;
    let vy = rand() * size;
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 4; s++) {
      vx += (rand() - 0.5) * 95;
      vy += (rand() - 0.5) * 95;
      ctx.quadraticCurveTo(
        vx + (rand() - 0.5) * 35,
        vy + (rand() - 0.5) * 35,
        vx,
        vy
      );
    }
    ctx.stroke();
  }
  ctx.restore();

  // Moldura chanfrada / filigrana na borda do polígono da face
  if (params.polyOutline && params.polyOutline.length >= 3) {
    const drawPoly = (target: CanvasRenderingContext2D, scaleInset: number) => {
      target.beginPath();
      params.polyOutline!.forEach(([u, v], idx) => {
        const px = (0.5 + (u - 0.5) * scaleInset) * size;
        const py = (0.5 - (v - 0.5) * scaleInset) * size;
        if (idx === 0) target.moveTo(px, py);
        else target.lineTo(px, py);
      });
      target.closePath();
    };

    ctx.save();
    drawPoly(ctx, 0.94);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = pal.rim;
    ctx.globalAlpha = 0.55;
    ctx.stroke();

    drawPoly(ctx, 0.87);
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.28;
    ctx.stroke();
    ctx.restore();

    // Chanfro no bump map para pegar brilho nas arestas
    bCtx.save();
    drawPoly(bCtx, 0.96);
    bCtx.lineWidth = 10;
    bCtx.strokeStyle = "rgb(135,135,135)";
    bCtx.stroke();
    bCtx.restore();
  }

  // 2. Desenho dos números gravados em baixo-relevo + douração metálica
  const drawEngravedNumber = (
    text: string,
    x: number,
    y: number,
    fontPx: number,
    angleRad = 0
  ) => {
    const drawOn = (
      target: CanvasRenderingContext2D,
      fill: string | CanvasGradient,
      underline = false,
      shadowBlur = 0
    ) => {
      target.save();
      target.translate(x, y);
      if (angleRad !== 0) target.rotate(angleRad);
      target.font = `900 ${fontPx}px Georgia, "Times New Roman", serif`;
      target.textAlign = "center";
      target.textBaseline = "middle";
      if (shadowBlur > 0) {
        target.shadowColor = pal.shadow;
        target.shadowBlur = shadowBlur;
        target.shadowOffsetX = 0;
        target.shadowOffsetY = 3;
      }
      target.fillStyle = fill;
      target.fillText(text, 0, 0);

      if (underline && (text === "6" || text === "9")) {
        const uw = fontPx * 0.42;
        const uy = fontPx * 0.46;
        target.fillRect(-uw / 2, uy, uw, Math.max(3, fontPx * 0.065));
      }
      target.restore();
    };

    // Entalhe escuro no bump map (número rebaixado na resina)
    drawOn(bCtx, "rgb(42,42,42)", true, 2);

    // Brilho metálico vertical no texto principal
    const textGrad = ctx.createLinearGradient(
      x,
      y - fontPx * 0.5,
      x,
      y + fontPx * 0.5
    );
    textGrad.addColorStop(0, pal.textA);
    textGrad.addColorStop(0.55, pal.rim);
    textGrad.addColorStop(1, pal.textB);

    drawOn(ctx, pal.shadow, true, 5);
    drawOn(ctx, textGrad, true, 0);
  };

  if (params.d4ApexLabels && params.polyOutline && params.polyOutline.length === 3) {
    // No d4 estilo RPG, cada um dos 3 vértices mostra o valor correspondente voltado para fora
    const cx = size * 0.5;
    const cy = size * 0.5;
    for (let i = 0; i < 3; i++) {
      const [u, v] = params.polyOutline[i]!;
      const vx = u * size;
      const vy = (1 - v) * size;
      const px = vx * 0.56 + cx * 0.44;
      const py = vy * 0.56 + cy * 0.44;
      const ang = Math.atan2(vy - cy, vx - cx) + Math.PI / 2;
      drawEngravedNumber(params.d4ApexLabels[i]!, px, py, 44, ang);
    }
  } else {
    const isTwoDigit = params.label.length >= 2;
    const fontPx =
      params.sides === 20
        ? isTwoDigit
          ? 56
          : 64
        : params.sides === 100
          ? 64
          : params.sides === 12
            ? isTwoDigit
              ? 68
              : 78
            : params.sides === 10
              ? 74
              : 94;
    const centerY =
      params.sides === 10 || params.sides === 100 ? size * 0.47 : size * 0.51;
    drawEngravedNumber(params.label, size * 0.5, centerY, fontPx);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = 4;
  bumpMap.needsUpdate = true;

  const pair = { map, bumpMap };
  faceTextureCache.set(cacheKey, pair);
  return pair;
}

function makeBasis(normal: THREE.Vector3, preferredUp?: THREE.Vector3) {
  const n = normal.clone().normalize();
  const ref =
    preferredUp && Math.abs(n.dot(preferredUp)) < 0.96
      ? preferredUp.clone()
      : Math.abs(n.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
  const tangent = new THREE.Vector3().crossVectors(ref, n).normalize();
  const bitangent = new THREE.Vector3().crossVectors(n, tangent).normalize();
  return { n, tangent, bitangent };
}

function buildD4Faces(): RawPolyFace[] {
  const r = 0.86;
  const s = r / Math.sqrt(3);
  // Vértices 1..4 do tetraedro regular
  const verts = [
    new THREE.Vector3(s, s, s),
    new THREE.Vector3(-s, -s, s),
    new THREE.Vector3(-s, s, -s),
    new THREE.Vector3(s, -s, -s),
  ];
  // Cada vértice k corresponde ao valor k+1 quando apontando para cima (+Z)
  // Face oposta ao vértice oppIdx contém os outros 3 vértices (valores)
  const combos: Array<[number, number, number, number]> = [
    [0, 1, 2, 3], // oposto ao vértice 0 (1), contém 2, 3, 4
    [1, 0, 3, 2], // oposto ao vértice 1 (2)
    [2, 0, 1, 3], // oposto ao vértice 2 (3)
    [3, 0, 2, 1], // oposto ao vértice 3 (4)
  ];

  return combos.map(([oppIdx, a, b, c]) => {
    const va = verts[a]!;
    const vb = verts[b]!;
    const vc = verts[c]!;
    const center = new THREE.Vector3()
      .add(va)
      .add(vb)
      .add(vc)
      .divideScalar(3);
    let ordered: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [va, vb, vc];
    let labels: [string, string, string] = [
      String(a + 1),
      String(b + 1),
      String(c + 1),
    ];
    const edge1 = new THREE.Vector3().subVectors(vb, va);
    const edge2 = new THREE.Vector3().subVectors(vc, va);
    const n = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    if (n.dot(center) < 0) {
      ordered = [va, vc, vb];
      labels = [String(a + 1), String(c + 1), String(b + 1)];
      n.negate();
    }
    const { bitangent } = makeBasis(n);
    return {
      value: oppIdx + 1,
      label: String(oppIdx + 1),
      vertices: ordered,
      normal: n,
      upTangent: bitangent,
      d4ApexLabels: labels,
    };
  });
}

function buildD6Faces(): RawPolyFace[] {
  const h = 0.5;
  const defs: Array<{
    value: number;
    n: [number, number, number];
    up: [number, number, number];
    verts: Array<[number, number, number]>;
  }> = [
    {
      value: 1,
      n: [0, 0, 1],
      up: [0, 1, 0],
      verts: [
        [-h, -h, h],
        [h, -h, h],
        [h, h, h],
        [-h, h, h],
      ],
    },
    {
      value: 6,
      n: [0, 0, -1],
      up: [0, 1, 0],
      verts: [
        [h, -h, -h],
        [-h, -h, -h],
        [-h, h, -h],
        [h, h, -h],
      ],
    },
    {
      value: 2,
      n: [0, 1, 0],
      up: [0, 0, -1],
      verts: [
        [-h, h, h],
        [h, h, h],
        [h, h, -h],
        [-h, h, -h],
      ],
    },
    {
      value: 5,
      n: [0, -1, 0],
      up: [0, 0, 1],
      verts: [
        [-h, -h, -h],
        [h, -h, -h],
        [h, -h, h],
        [-h, -h, h],
      ],
    },
    {
      value: 3,
      n: [1, 0, 0],
      up: [0, 1, 0],
      verts: [
        [h, -h, h],
        [h, -h, -h],
        [h, h, -h],
        [h, h, h],
      ],
    },
    {
      value: 4,
      n: [-1, 0, 0],
      up: [0, 1, 0],
      verts: [
        [-h, -h, -h],
        [-h, -h, h],
        [-h, h, h],
        [-h, h, -h],
      ],
    },
  ];

  return defs.map((d) => ({
    value: d.value,
    label: String(d.value),
    vertices: d.verts.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    normal: new THREE.Vector3(...d.n),
    upTangent: new THREE.Vector3(...d.up),
  }));
}

function buildD8Faces(): RawPolyFace[] {
  const r = 0.78;
  const px = new THREE.Vector3(r, 0, 0);
  const nx = new THREE.Vector3(-r, 0, 0);
  const py = new THREE.Vector3(0, r, 0);
  const ny = new THREE.Vector3(0, -r, 0);
  const pz = new THREE.Vector3(0, 0, r);
  const nz = new THREE.Vector3(0, 0, -r);

  const tris: Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3]> = [
    [pz, px, py],
    [pz, py, nx],
    [pz, nx, ny],
    [pz, ny, px],
    [nz, py, px],
    [nz, nx, py],
    [nz, ny, nx],
    [nz, px, ny],
  ];
  const values = [8, 2, 6, 4, 5, 3, 7, 1];

  return tris.map(([a, b, c], idx) => {
    const center = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const n = center.clone().normalize();
    const { bitangent } = makeBasis(n);
    const val = values[idx]!;
    return {
      value: val,
      label: String(val),
      vertices: [a.clone(), b.clone(), c.clone()],
      normal: n,
      upTangent: bitangent,
    };
  });
}

function buildD10Faces(isPercentile: boolean): RawPolyFace[] {
  // Verdadeiro trapezoedro pentagonal coplanar (cristal d10 / d100)
  const radius = 0.76;
  const poleZ = 0.72;
  const cos36 = Math.cos(Math.PI / 5);
  const h = (poleZ * (1 - cos36)) / (1 + cos36);

  const topPole = new THREE.Vector3(0, 0, poleZ);
  const botPole = new THREE.Vector3(0, 0, -poleZ);

  const upper: THREE.Vector3[] = [];
  const lower: THREE.Vector3[] = [];
  for (let k = 0; k < 5; k++) {
    const angU = (k * Math.PI * 2) / 5;
    const angL = ((k + 0.5) * Math.PI * 2) / 5;
    upper.push(
      new THREE.Vector3(Math.cos(angU) * radius, Math.sin(angU) * radius, h)
    );
    lower.push(
      new THREE.Vector3(Math.cos(angL) * radius, Math.sin(angL) * radius, -h)
    );
  }

  const topVals = [10, 2, 4, 6, 8];
  const botVals = [1, 3, 5, 7, 9];
  const faces: RawPolyFace[] = [];

  for (let k = 0; k < 5; k++) {
    const u0 = upper[k]!;
    const l0 = lower[k]!;
    const u1 = upper[(k + 1) % 5]!;
    const centerT = new THREE.Vector3()
      .add(topPole)
      .add(u0)
      .add(l0)
      .add(u1)
      .divideScalar(4);
    const nT = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(u0, topPole),
        new THREE.Vector3().subVectors(l0, topPole)
      )
      .normalize();
    if (nT.dot(centerT) < 0) nT.negate();
    const { bitangent: upT } = makeBasis(nT, topPole.clone().sub(l0));
    const vTop = topVals[k]!;
    const labelTop = isPercentile
      ? vTop === 10
        ? "00"
        : `${vTop * 10}`
      : vTop === 10
        ? "0"
        : String(vTop);

    faces.push({
      value: isPercentile ? (vTop === 10 ? 100 : vTop * 10) : vTop,
      label: labelTop,
      vertices: [topPole.clone(), u0.clone(), l0.clone(), u1.clone()],
      normal: nT,
      upTangent: upT,
    });

    const lNext = lower[(k + 4) % 5]!;
    const centerB = new THREE.Vector3()
      .add(botPole)
      .add(l0)
      .add(u0)
      .add(lNext)
      .divideScalar(4);
    const nB = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(u0, botPole),
        new THREE.Vector3().subVectors(lNext, botPole)
      )
      .normalize();
    if (nB.dot(centerB) < 0) nB.negate();
    const { bitangent: upB } = makeBasis(nB, botPole.clone().sub(u0));
    const vBot = botVals[k]!;
    const labelBot = isPercentile ? `${vBot * 10}` : String(vBot);

    faces.push({
      value: isPercentile ? vBot * 10 : vBot,
      label: labelBot,
      vertices: [botPole.clone(), l0.clone(), u0.clone(), lNext.clone()],
      normal: nB,
      upTangent: upB,
    });
  }

  return faces;
}

function buildD12Faces(): RawPolyFace[] {
  // Os 12 vetores normais das faces do dodecaedro são os vértices normalizados de um icosaedro
  const normalsRaw = [
    [0, 1, PHI],
    [0, -1, PHI],
    [0, 1, -PHI],
    [0, -1, -PHI],
    [1, PHI, 0],
    [-1, PHI, 0],
    [1, -PHI, 0],
    [-1, -PHI, 0],
    [PHI, 0, 1],
    [-PHI, 0, 1],
    [PHI, 0, -1],
    [-PHI, 0, -1],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());

  // Raio da esfera inscrita e raio de cada vértice do pentágono no plano tangente
  const inRadius = 0.56;
  const pentaR = inRadius * 0.6512;

  return normalsRaw.map((n, idx) => {
    const { tangent, bitangent } = makeBasis(n);
    // Ângulo base alinhado com projeção do polo mais próximo (ou outro vetor fixo de simetria do dodecaedro)
    // No dodecaedro, cada face tem um vértice na direção dos 5 vizinhos mais próximos!
    const neighbors = normalsRaw
      .filter((other, j) => j !== idx && other.dot(n) > 0.3)
      .sort((a, b) => {
        const angA = Math.atan2(a.dot(bitangent), a.dot(tangent));
        const angB = Math.atan2(b.dot(bitangent), b.dot(tangent));
        return angA - angB;
      });

    const verts: THREE.Vector3[] = [];
    for (let k = 0; k < 5; k++) {
      const nb1 = neighbors[k]!;
      const nb2 = neighbors[(k + 1) % 5]!;
      const dir = new THREE.Vector3().add(nb1).add(nb2);
      // Projeta no plano da face para obter direção exata do vértice compartilhado
      dir.addScaledVector(n, -dir.dot(n)).normalize();
      verts.push(
        n.clone().multiplyScalar(inRadius).addScaledVector(dir, pentaR)
      );
    }

    const val = idx + 1;
    return {
      value: val,
      label: String(val),
      vertices: verts,
      normal: n,
      upTangent: bitangent,
    };
  });
}

function buildD20Faces(): RawPolyFace[] {
  const scale = 0.42;
  const rawVerts = [
    [-1, PHI, 0],
    [1, PHI, 0],
    [-1, -PHI, 0],
    [1, -PHI, 0],
    [0, -1, PHI],
    [0, 1, PHI],
    [0, -1, -PHI],
    [0, 1, -PHI],
    [PHI, 0, -1],
    [PHI, 0, 1],
    [-PHI, 0, -1],
    [-PHI, 0, 1],
  ].map(([x, y, z]) => new THREE.Vector3(x * scale, y * scale, z * scale));

  const indices: Array<[number, number, number]> = [
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

  // Ordem balanceada estilo dado real (20 vs 1 opostos)
  const values = [
    20, 14, 18, 12, 8, 6, 4, 16, 10, 2, 1, 19, 15, 9, 13, 17, 11, 7, 5, 3,
  ];

  return indices.map(([i0, i1, i2], idx) => {
    const v0 = rawVerts[i0]!.clone();
    const v1 = rawVerts[i1]!.clone();
    const v2 = rawVerts[i2]!.clone();
    const n = new THREE.Vector3()
      .add(v0)
      .add(v1)
      .add(v2)
      .divideScalar(3)
      .normalize();
    const { bitangent } = makeBasis(n);
    const val = values[idx]!;
    return {
      value: val,
      label: String(val),
      vertices: [v0, v1, v2],
      normal: n,
      upTangent: bitangent,
    };
  });
}

function triangulateAndCompile(
  faces: RawPolyFace[],
  sides: number,
  theme: DieTheme
): BuiltDieAssets {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const geometry = new THREE.BufferGeometry();
  const materials: THREE.MeshPhysicalMaterial[] = [];
  const faceMap = new Map<number, FaceOrientation>();

  let maxExtent = 0;

  faces.forEach((face, matIdx) => {
    const n = face.normal.clone().normalize();
    const { tangent, bitangent } = makeBasis(n, face.upTangent);

    const verts = face.vertices;
    const center = new THREE.Vector3();
    verts.forEach((v) => {
      center.add(v);
      maxExtent = Math.max(maxExtent, v.length());
    });
    center.divideScalar(verts.length);

    // Projeta vértices em 2D local e normaliza dentro do canvas [0.06..0.94]
    let maxR = 0.001;
    const local2D = verts.map((v) => {
      const rel = new THREE.Vector3().subVectors(v, center);
      const x = rel.dot(tangent);
      const y = rel.dot(bitangent);
      maxR = Math.max(maxR, Math.hypot(x, y));
      return [x, y] as [number, number];
    });

    const scaleUV = 0.44 / maxR;
    const polyUV: Array<[number, number]> = local2D.map(([x, y]) => [
      0.5 + x * scaleUV,
      0.5 + y * scaleUV,
    ]);

    // Garante winding anti-horário voltado para fora (+n)
    const startVert = positions.length / 3;
    for (let t = 1; t < verts.length - 1; t++) {
      const iA = 0;
      const iB = t;
      const iC = t + 1;

      const vA = verts[iA]!;
      const vB = verts[iB]!;
      const vC = verts[iC]!;
      const triN = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(vB, vA),
        new THREE.Vector3().subVectors(vC, vA)
      );
      const flip = triN.dot(n) < 0;
      const triIdxs = flip ? [iA, iC, iB] : [iA, iB, iC];

      for (const vi of triIdxs) {
        const pt = verts[vi]!;
        const [u, v] = polyUV[vi]!;
        positions.push(pt.x, pt.y, pt.z);
        normals.push(n.x, n.y, n.z);
        uvs.push(u, v);
      }
    }

    const vertCount = positions.length / 3 - startVert;
    geometry.addGroup(startVert, vertCount, matIdx);

    const { map, bumpMap } = drawFaceTextures({
      label: face.label,
      sides,
      theme,
      d4ApexLabels: face.d4ApexLabels,
      polyOutline: polyUV,
    });

    const mat = new THREE.MeshPhysicalMaterial({
      map,
      bumpMap,
      bumpScale: 0.018,
      roughness: 0.16,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.9,
      envMapIntensity: 1.35,
      transparent: theme === "dropped",
      opacity: theme === "dropped" ? 0.45 : 1,
    });
    materials.push(mat);

    faceMap.set(face.value, {
      normal: n,
      upTangent: bitangent,
    });
  });

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

  // Para d4, o valor sorteado fica no topo (+Z), que é a direção do vértice correspondente!
  if (sides === 4) {
    const r = 0.86 / Math.sqrt(3);
    const apexes = [
      new THREE.Vector3(r, r, r).normalize(),
      new THREE.Vector3(-r, -r, r).normalize(),
      new THREE.Vector3(-r, r, -r).normalize(),
      new THREE.Vector3(r, -r, -r).normalize(),
    ];
    apexes.forEach((apex, idx) => {
      const { bitangent } = makeBasis(apex);
      faceMap.set(idx + 1, { normal: apex, upTangent: bitangent });
    });
  }

  return {
    geometry,
    materials,
    faceMap,
    restHeight: Math.max(0.52, maxExtent * 0.72),
  };
}

export function buildDieAssets(sides: number, theme: DieTheme): BuiltDieAssets {
  let faces: RawPolyFace[];
  if (sides === 4) faces = buildD4Faces();
  else if (sides === 6) faces = buildD6Faces();
  else if (sides === 8) faces = buildD8Faces();
  else if (sides === 10) faces = buildD10Faces(false);
  else if (sides === 100) faces = buildD10Faces(true);
  else if (sides === 12) faces = buildD12Faces();
  else faces = buildD20Faces();

  return triangulateAndCompile(faces, sides, theme);
}

/**
 * Calcula o quaternion exato para que o dado pare com a face sorteada
 * apontando para cima (+Z) e o número virado em pé para o usuário (+Y).
 */
export function computeTargetDieQuaternion(
  faceMap: Map<number, FaceOrientation>,
  rolledValue: number,
  yawOffsetRad = 0
): THREE.Quaternion {
  const orientation =
    faceMap.get(rolledValue) ?? Array.from(faceMap.values())[0];
  if (!orientation) return new THREE.Quaternion();

  const localZ = orientation.normal.clone().normalize();
  const localY = orientation.upTangent.clone().normalize();
  const localX = new THREE.Vector3().crossVectors(localY, localZ).normalize();
  // Ortogonaliza Y
  localY.crossVectors(localZ, localX).normalize();

  // Queremos R * local = world, logo R = W * L^T; como L tem colunas ortonormais, R = L^T
  const rotLocalToWorld = new THREE.Matrix4().makeBasis(localX, localY, localZ);
  rotLocalToWorld.transpose();

  const baseQuat = new THREE.Quaternion().setFromRotationMatrix(rotLocalToWorld);
  if (yawOffsetRad !== 0) {
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      yawOffsetRad
    );
    baseQuat.premultiply(yawQuat);
  }
  return baseQuat;
}
