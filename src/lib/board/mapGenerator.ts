export type MapBiome =
  | "undermountain"
  | "underdark"
  | "cormyr_forest"
  | "waterdeep_tavern"
  | "dragon_lair";

export type TileType =
  | "wall"
  | "floor"
  | "road"
  | "water"
  | "lava"
  | "wood"
  | "grass"
  | "door";

export type MapPropType =
  | "pillar"
  | "torch"
  | "chest"
  | "altar"
  | "tree"
  | "rock"
  | "campfire"
  | "table"
  | "barrel"
  | "mushroom";

export interface MapProp {
  x: number;
  y: number;
  type: MapPropType;
}

export interface GeneratedMapData {
  biome: MapBiome;
  cols: number;
  rows: number;
  seed: string;
  tiles: TileType[][];
  props: MapProp[];
}

export interface MapPreset {
  id: string;
  title: string;
  subtitle: string;
  biome: MapBiome;
  cols: number;
  rows: number;
  seed: string;
}

export const FORGOTTEN_REALMS_PRESETS: MapPreset[] = [
  {
    id: "undermountain_crypt",
    title: "Cripta de Undermountain",
    subtitle: "Masmorra de pedra talhada com salões interligados, pilares e tochas",
    biome: "undermountain",
    cols: 24,
    rows: 18,
    seed: "halaster-undermountain-01",
  },
  {
    id: "phandalin_ambush",
    title: "Trilha de Phandalin (Floresta de Cormyr)",
    subtitle: "Estrada de terra cortando a mata com pedras, árvores e acampamento",
    biome: "cormyr_forest",
    cols: 24,
    rows: 16,
    seed: "phandalin-goblin-trail-02",
  },
  {
    id: "yawning_portal_inn",
    title: "Estalagem do Portal Bocejante (Waterdeep)",
    subtitle: "Salão de taverna em madeira com mesas, balcão, barris e lareira",
    biome: "waterdeep_tavern",
    cols: 22,
    rows: 16,
    seed: "durnan-yawning-portal-03",
  },
  {
    id: "underdark_chasm",
    title: "Santuário Bioluminescente do Underdark",
    subtitle: "Cavernas orgânicas com fungos arcanos e lago subterrâneo",
    biome: "underdark",
    cols: 26,
    rows: 18,
    seed: "menzoberranzan-cavern-04",
  },
  {
    id: "red_dragon_hoard",
    title: "Covil do Dragão Vermelho (Montanha da Espada)",
    subtitle: "Salão vulcânico cercado por rios de magma, pilares de obsidiana e tesouro",
    biome: "dragon_lair",
    cols: 26,
    rows: 18,
    seed: "klauth-red-dragon-lair-05",
  },
];

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRng(seed: string): () => number {
  let a = hashSeed(seed || "faerun");
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGrid(
  cols: number,
  rows: number,
  fill: TileType
): TileType[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => fill)
  );
}

function generateUndermountain(
  cols: number,
  rows: number,
  rng: () => number
): { tiles: TileType[][]; props: MapProp[] } {
  const tiles = createGrid(cols, rows, "wall");
  const props: MapProp[] = [];
  const rooms: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
  }> = [];

  const targetRooms = 7;
  for (let attempt = 0; attempt < 35 && rooms.length < targetRooms; attempt++) {
    const w = 4 + Math.floor(rng() * 5);
    const h = 4 + Math.floor(rng() * 4);
    const x = 2 + Math.floor(rng() * Math.max(cols - w - 4, 1));
    const y = 2 + Math.floor(rng() * Math.max(rows - h - 4, 1));

    const overlaps = rooms.some(
      (r) =>
        x < r.x + r.w + 1 &&
        x + w + 1 > r.x &&
        y < r.y + r.h + 1 &&
        y + h + 1 > r.y
    );
    if (overlaps) continue;

    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        tiles[ry]![rx] = "floor";
      }
    }

    const cx = Math.floor(x + w / 2);
    const cy = Math.floor(y + h / 2);
    rooms.push({ x, y, w, h, cx, cy });
  }

  // Fallback se o mapa for muito pequeno
  if (rooms.length === 0) {
    for (let y = 2; y < rows - 2; y++) {
      for (let x = 2; x < cols - 2; x++) {
        tiles[y]![x] = "floor";
      }
    }
    rooms.push({
      x: 2,
      y: 2,
      w: cols - 4,
      h: rows - 4,
      cx: Math.floor(cols / 2),
      cy: Math.floor(rows / 2),
    });
  }

  // Conecta salas com corredores em L
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1]!;
    const curr = rooms[i]!;

    const xStart = Math.min(prev.cx, curr.cx);
    const xEnd = Math.max(prev.cx, curr.cx);
    for (let x = xStart; x <= xEnd; x++) {
      tiles[prev.cy]![x] = "floor";
    }

    const yStart = Math.min(prev.cy, curr.cy);
    const yEnd = Math.max(prev.cy, curr.cy);
    for (let y = yStart; y <= yEnd; y++) {
      tiles[y]![curr.cx] = "floor";
    }
  }

  // Adiciona pilares, tochas e altar/baú nas salas
  rooms.forEach((r, idx) => {
    props.push({ x: r.x, y: r.y, type: "torch" });
    if (r.w >= 6 && r.h >= 5) {
      props.push({ x: r.x + 1, y: r.y + 1, type: "pillar" });
      props.push({ x: r.x + r.w - 2, y: r.y + 1, type: "pillar" });
      props.push({ x: r.x + 1, y: r.y + r.h - 2, type: "pillar" });
      props.push({ x: r.x + r.w - 2, y: r.y + r.h - 2, type: "pillar" });
    }
    if (idx === rooms.length - 1) {
      props.push({ x: r.cx, y: r.cy, type: "altar" });
    } else if (idx % 2 === 1) {
      props.push({ x: r.cx, y: r.cy, type: "chest" });
    }
  });

  return { tiles, props };
}

function generateUnderdark(
  cols: number,
  rows: number,
  rng: () => number
): { tiles: TileType[][]; props: MapProp[] } {
  let tiles = createGrid(cols, rows, "wall");
  const props: MapProp[] = [];

  for (let y = 2; y < rows - 2; y++) {
    for (let x = 2; x < cols - 2; x++) {
      tiles[y]![x] = rng() < 0.56 ? "floor" : "wall";
    }
  }

  // 3 passos de suavização (Autômato Celular)
  for (let step = 0; step < 3; step++) {
    const next = createGrid(cols, rows, "wall");
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        let wallCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (tiles[y + dy]![x + dx] === "wall") wallCount++;
          }
        }
        next[y]![x] = wallCount >= 5 ? "wall" : "floor";
      }
    }
    tiles = next;
  }

  // Garante salão central aberto e lago/rio subterrâneo
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  for (let y = cy - 3; y <= cy + 3; y++) {
    for (let x = 3; x < cols - 3; x++) {
      if (y >= 1 && y < rows - 1) {
        tiles[y]![x] = "floor";
      }
    }
  }

  // Lago bioluminescente
  for (let y = cy - 2; y <= cy + 1; y++) {
    for (let x = cx - 3; x <= cx + 2; x++) {
      if (y >= 2 && y < rows - 2 && x >= 2 && x < cols - 2) {
        tiles[y]![x] = x === cx ? "wood" : "water"; // ponte no meio
      }
    }
  }

  for (let y = 2; y < rows - 2; y++) {
    for (let x = 2; x < cols - 2; x++) {
      if (tiles[y]![x] === "floor" && rng() < 0.06) {
        props.push({
          x,
          y,
          type: rng() < 0.65 ? "mushroom" : "rock",
        });
      }
    }
  }

  return { tiles, props };
}

function generateCormyrForest(
  cols: number,
  rows: number,
  rng: () => number
): { tiles: TileType[][]; props: MapProp[] } {
  const tiles = createGrid(cols, rows, "grass");
  const props: MapProp[] = [];

  const midY = Math.floor(rows / 2);
  for (let x = 0; x < cols; x++) {
    const wave = Math.round(Math.sin(x * 0.35) * 1.5);
    for (let dy = -1; dy <= 1; dy++) {
      const ry = Math.min(Math.max(midY + wave + dy, 0), rows - 1);
      tiles[ry]![x] = "road";
    }
  }

  // Riacho vertical com ponte de madeira na estrada
  const streamX = Math.floor(cols * 0.65);
  for (let y = 0; y < rows; y++) {
    const cur = tiles[y]![streamX];
    tiles[y]![streamX] = cur === "road" ? "wood" : "water";
    if (streamX + 1 < cols) {
      tiles[y]![streamX + 1] =
        tiles[y]![streamX + 1] === "road" ? "wood" : "water";
    }
  }

  // Fogueira de acampamento
  const campX = Math.max(Math.floor(cols * 0.3), 3);
  const campY = Math.max(midY - 4, 2);
  props.push({ x: campX, y: campY, type: "campfire" });

  // Árvores e rochas nas margens
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (tiles[y]![x] !== "grass") continue;
      if (Math.hypot(x - campX, y - campY) < 2.5) continue;

      const r = rng();
      if (r < 0.12) {
        props.push({ x, y, type: "tree" });
      } else if (r < 0.15) {
        props.push({ x, y, type: "rock" });
      }
    }
  }

  return { tiles, props };
}

function generateWaterdeepTavern(
  cols: number,
  rows: number,
  rng: () => number
): { tiles: TileType[][]; props: MapProp[] } {
  const tiles = createGrid(cols, rows, "grass");
  const props: MapProp[] = [];

  const padX = 2;
  const padY = 2;
  for (let y = padY; y < rows - padY; y++) {
    for (let x = padX; x < cols - padX; x++) {
      const isBorder =
        y === padY ||
        y === rows - padY - 1 ||
        x === padX ||
        x === cols - padX - 1;
      tiles[y]![x] = isBorder ? "wall" : "wood";
    }
  }

  // Porta principal sul
  const doorX = Math.floor(cols / 2);
  tiles[rows - padY - 1]![doorX] = "door";
  tiles[rows - padY - 1]![doorX + 1] = "door";

  // Mesas do salão, barris e tochas
  for (let y = padY + 3; y < rows - padY - 3; y += 3) {
    for (let x = padX + 3; x < cols - padX - 3; x += 4) {
      if (rng() < 0.78) {
        props.push({ x, y, type: "table" });
      }
    }
  }

  props.push({ x: padX + 1, y: padY + 1, type: "torch" });
  props.push({ x: cols - padX - 2, y: padY + 1, type: "torch" });
  props.push({ x: padX + 1, y: rows - padY - 2, type: "torch" });
  props.push({ x: cols - padX - 2, y: rows - padY - 2, type: "torch" });

  props.push({ x: padX + 2, y: padY + 1, type: "barrel" });
  props.push({ x: padX + 3, y: padY + 1, type: "barrel" });
  props.push({ x: doorX, y: padY + 1, type: "campfire" }); // Lareira norte

  return { tiles, props };
}

function generateDragonLair(
  cols: number,
  rows: number,
  rng: () => number
): { tiles: TileType[][]; props: MapProp[] } {
  const tiles = createGrid(cols, rows, "lava");
  const props: MapProp[] = [];

  // Bordas de parede vulcânica
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
        tiles[y]![x] = "wall";
      }
    }
  }

  // Plataforma central do covil + passarela de entrada
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  for (let y = 2; y < rows - 2; y++) {
    for (let x = 2; x < cols - 2; x++) {
      const dist = Math.hypot((x - cx) * 0.8, y - cy);
      if (dist < Math.min(cols, rows) * 0.36 || Math.abs(x - cx) <= 1) {
        tiles[y]![x] = "floor";
      }
    }
  }

  // Tesouro e altar central do Dragão + pilares e braseiros
  props.push({ x: cx, y: cy, type: "altar" });
  props.push({ x: cx - 1, y: cy, type: "chest" });
  props.push({ x: cx + 1, y: cy, type: "chest" });
  props.push({ x: cx, y: cy - 1, type: "chest" });

  props.push({ x: cx - 4, y: cy - 3, type: "pillar" });
  props.push({ x: cx + 4, y: cy - 3, type: "pillar" });
  props.push({ x: cx - 4, y: cy + 3, type: "pillar" });
  props.push({ x: cx + 4, y: cy + 3, type: "pillar" });

  props.push({ x: cx - 3, y: cy - 2, type: "campfire" });
  props.push({ x: cx + 3, y: cy - 2, type: "campfire" });

  for (let y = 2; y < rows - 2; y++) {
    for (let x = 2; x < cols - 2; x++) {
      if (tiles[y]![x] === "floor" && rng() < 0.04) {
        props.push({ x, y, type: "rock" });
      }
    }
  }

  return { tiles, props };
}

export function generateProceduralMap(params: {
  biome: MapBiome;
  cols: number;
  rows: number;
  seed: string;
}): GeneratedMapData {
  const cols = Math.min(Math.max(Math.round(params.cols), 12), 48);
  const rows = Math.min(Math.max(Math.round(params.rows), 10), 36);
  const rng = createSeededRng(params.seed);

  let built: { tiles: TileType[][]; props: MapProp[] };
  if (params.biome === "underdark") {
    built = generateUnderdark(cols, rows, rng);
  } else if (params.biome === "cormyr_forest") {
    built = generateCormyrForest(cols, rows, rng);
  } else if (params.biome === "waterdeep_tavern") {
    built = generateWaterdeepTavern(cols, rows, rng);
  } else if (params.biome === "dragon_lair") {
    built = generateDragonLair(cols, rows, rng);
  } else {
    built = generateUndermountain(cols, rows, rng);
  }

  return {
    biome: params.biome,
    cols,
    rows,
    seed: params.seed,
    tiles: built.tiles,
    props: built.props,
  };
}

export function drawGeneratedMapToCanvas(
  canvas: HTMLCanvasElement,
  map: GeneratedMapData,
  cellSize: number
): void {
  const width = map.cols * cellSize;
  const height = map.rows * cellSize;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Desenha os tiles base
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const tile = map.tiles[y]![x]!;
      const px = x * cellSize;
      const py = y * cellSize;
      const checker = (x + y) % 2 === 0;

      if (tile === "wall") {
        ctx.fillStyle =
          map.biome === "underdark"
            ? checker
              ? "#14111f"
              : "#181426"
            : checker
              ? "#18181b"
              : "#1f1f23";
        ctx.fillRect(px, py, cellSize, cellSize);
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      } else if (tile === "floor") {
        ctx.fillStyle =
          map.biome === "underdark"
            ? checker
              ? "#27213c"
              : "#2d2644"
            : checker
              ? "#2d2a32"
              : "#34303a";
        ctx.fillRect(px, py, cellSize, cellSize);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellSize, cellSize);
      } else if (tile === "wood" || tile === "door") {
        ctx.fillStyle =
          tile === "door"
            ? "#78350f"
            : checker
              ? "#452715"
              : "#4d2c18";
        ctx.fillRect(px, py, cellSize, cellSize);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellSize, cellSize);
      } else if (tile === "grass") {
        ctx.fillStyle = checker ? "#1b3120" : "#1f3724";
        ctx.fillRect(px, py, cellSize, cellSize);
      } else if (tile === "road") {
        ctx.fillStyle = checker ? "#574431" : "#614c37";
        ctx.fillRect(px, py, cellSize, cellSize);
      } else if (tile === "water") {
        ctx.fillStyle = checker ? "#0c4a6e" : "#075985";
        ctx.fillRect(px, py, cellSize, cellSize);
      } else if (tile === "lava") {
        ctx.fillStyle = checker ? "#9a3412" : "#c2410c";
        ctx.fillRect(px, py, cellSize, cellSize);
      }
    }
  }

  // 2. Desenha props e iluminação
  for (const prop of map.props) {
    const cx = (prop.x + 0.5) * cellSize;
    const cy = (prop.y + 0.5) * cellSize;

    if (prop.type === "torch" || prop.type === "campfire") {
      const rad = cellSize * (prop.type === "campfire" ? 2.6 : 1.9);
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      grad.addColorStop(0, "rgba(251, 191, 36, 0.38)");
      grad.addColorStop(0.5, "rgba(234, 88, 12, 0.14)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.type === "mushroom") {
      const rad = cellSize * 1.4;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      grad.addColorStop(0, "rgba(192, 132, 252, 0.35)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#c084fc";
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.type === "pillar") {
      ctx.fillStyle = "#52525b";
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (prop.type === "tree") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.arc(cx + 4, cy + 4, cellSize * 0.44, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#14532d";
      ctx.strokeStyle = "#166534";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (prop.type === "rock") {
      ctx.fillStyle = "#57534e";
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.type === "table") {
      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 2;
      ctx.fillRect(
        cx - cellSize * 0.36,
        cy - cellSize * 0.36,
        cellSize * 0.72,
        cellSize * 0.72
      );
      ctx.strokeRect(
        cx - cellSize * 0.36,
        cy - cellSize * 0.36,
        cellSize * 0.72,
        cellSize * 0.72
      );
    } else if (prop.type === "chest" || prop.type === "altar" || prop.type === "barrel") {
      ctx.fillStyle = prop.type === "altar" ? "#fbbf24" : "#92400e";
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 1.5;
      ctx.fillRect(
        cx - cellSize * 0.26,
        cy - cellSize * 0.2,
        cellSize * 0.52,
        cellSize * 0.4
      );
      ctx.strokeRect(
        cx - cellSize * 0.26,
        cy - cellSize * 0.2,
        cellSize * 0.52,
        cellSize * 0.4
      );
    }
  }
}

export function canvasToMapFile(
  canvas: HTMLCanvasElement,
  filename = "battlemap.png"
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Não foi possível exportar o mapa do canvas."));
        return;
      }
      resolve(new File([blob], filename, { type: "image/png" }));
    }, "image/png");
  });
}

export function buildAiBattlemapUrl(
  prompt: string,
  width = 1400,
  height = 1050,
  seed = "42"
): string {
  const enriched = `${prompt.trim()}, top-down RPG battlemap, Forgotten Realms D&D style, overhead 90 degree orthographic view, high detail tabletop map, no isometric`;
  const seedNum = hashSeed(seed) % 999999;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    enriched
  )}?width=${width}&height=${height}&seed=${seedNum}&nologo=true`;
}
