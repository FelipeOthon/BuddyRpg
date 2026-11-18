/**
 * Gerador procedural de fumaça volumétrica sem emendas (tileable)
 * usando Fractal Brownian Motion (FBM) periódico com Domain Warping.
 * Zero dependências externas; calculado 1x em cache de memória (~15ms).
 */

interface SmokeTextureSet {
  dense: HTMLCanvasElement;
  wisps: HTMLCanvasElement;
}

let cachedSet: SmokeTextureSet | null = null;

function hash2D(ix: number, iy: number, seed: number): number {
  let n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967295;
}

function periodicNoise(
  u: number,
  v: number,
  period: number,
  seed: number
): number {
  const x = u * period;
  const y = v * period;
  const ix0 = Math.floor(x);
  const iy0 = Math.floor(y);
  const fx = x - ix0;
  const fy = y - iy0;

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const x0 = ((ix0 % period) + period) % period;
  const y0 = ((iy0 % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function periodicFbm(u: number, v: number, seed: number): number {
  let value = 0;
  let amp = 0.5;
  let period = 4;
  let norm = 0;

  for (let octave = 0; octave < 5; octave++) {
    value += amp * periodicNoise(u, v, period, seed + octave * 31);
    norm += amp;
    amp *= 0.5;
    period *= 2;
  }

  return value / norm;
}

function buildWarpedSmokeCanvas(mode: "dense" | "wisps"): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const seed = mode === "dense" ? 107 : 911;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;

      // Domain warping: distorce as coordenadas com outro FBM para criar redemoinhos orgânicos
      const qx = periodicFbm(u, v, seed + 13);
      const qy = periodicFbm(u + 0.37, v + 0.71, seed + 59);
      const wx = u + (qx - 0.5) * 0.42;
      const wy = v + (qy - 0.5) * 0.42;

      const rx = periodicFbm(wx + 0.19, wy + 0.43, seed + 97);
      const ry = periodicFbm(wx + 0.61, wy + 0.11, seed + 149);
      const f = periodicFbm(u + (rx - 0.5) * 0.36, v + (ry - 0.5) * 0.36, seed);

      const idx = (y * size + x) * 4;
      if (mode === "dense") {
        // Nuvens densas azul-ardósia com profundidade
        const intensity = Math.pow(Math.min(Math.max((f - 0.22) / 0.68, 0), 1), 1.35);
        data[idx] = Math.round(32 + intensity * 115);
        data[idx + 1] = Math.round(41 + intensity * 130);
        data[idx + 2] = Math.round(62 + intensity * 145);
        data[idx + 3] = Math.round(intensity * 215);
      } else {
        // Filamentos claros prateados que criam efeito de movimento volumétrico
        const ridge = 1 - Math.abs(f * 2 - 1);
        const wisp = Math.pow(Math.min(Math.max((ridge - 0.35) / 0.65, 0), 1), 1.7);
        data[idx] = Math.round(165 + wisp * 70);
        data[idx + 1] = Math.round(182 + wisp * 65);
        data[idx + 2] = Math.round(210 + wisp * 45);
        data[idx + 3] = Math.round(wisp * 155);
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function getSmokeTextures(): SmokeTextureSet | null {
  if (typeof document === "undefined") return null;
  if (cachedSet) return cachedSet;

  cachedSet = {
    dense: buildWarpedSmokeCanvas("dense"),
    wisps: buildWarpedSmokeCanvas("wisps"),
  };
  return cachedSet;
}
