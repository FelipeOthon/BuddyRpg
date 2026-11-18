/**
 * Gera uma textura procedural sem emendas (tileable) de névoa/fumaça volumétrica
 * em um HTMLCanvasElement 256x256 para uso com fillPatternImage no Konva.
 */
let cachedSmokeCanvas: HTMLCanvasElement | null = null;

export function getSmokePatternCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (cachedSmokeCanvas) return cachedSmokeCanvas;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  // Semente determinística para nuvens suaves e orgânicas sem emendas (wrap 3x3)
  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 64; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 36 + rand() * 58;
    const tone =
      i % 3 === 0
        ? "148, 163, 184"
        : i % 2 === 0
          ? "100, 116, 139"
          : "51, 65, 85";
    const alpha = 0.14 + rand() * 0.2;

    // Desenha nas 9 cópias periódicas para garantir tiling perfeito sem bordas
    for (let ox = -size; ox <= size; ox += size) {
      for (let oy = -size; oy <= size; oy += size) {
        const px = cx + ox;
        const py = cy + oy;
        const grad = ctx.createRadialGradient(px, py, 2, px, py, r);
        grad.addColorStop(0, `rgba(${tone}, ${alpha})`);
        grad.addColorStop(0.55, `rgba(${tone}, ${alpha * 0.45})`);
        grad.addColorStop(1, `rgba(${tone}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  cachedSmokeCanvas = canvas;
  return canvas;
}
