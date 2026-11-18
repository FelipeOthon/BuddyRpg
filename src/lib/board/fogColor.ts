const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
const HEX8_RE = /^#[0-9a-fA-F]{8}$/;

/**
 * Extrai a cor hexadecimal (#RRGGBB) e a opacidade normalizada (0.05..1)
 * a partir de `scene.fog_color` (#RRGGBB ou #RRGGBBAA).
 */
export function parseFogColor(raw: string | null | undefined): {
  hex: string;
  opacity: number;
} {
  const value = (raw ?? "#09090b").trim();
  if (HEX8_RE.test(value)) {
    const hex = value.slice(0, 7);
    const alphaByte = Number.parseInt(value.slice(7, 9), 16);
    const opacity = Math.round((alphaByte / 255) * 100) / 100;
    return {
      hex,
      opacity: Math.min(Math.max(opacity, 0.05), 1),
    };
  }
  if (HEX6_RE.test(value)) {
    return { hex: value, opacity: 1 };
  }
  return { hex: "#09090b", opacity: 1 };
}

/**
 * Serializa cor (#RRGGBB) + opacidade (0.05..1) para salvar em `scene.fog_color`.
 * Em 100% retorna #RRGGBB para compatibilidade total.
 */
export function formatFogColor(hex: string, opacity: number): string {
  const trimmed = hex.trim();
  const cleanHex = HEX6_RE.test(trimmed)
    ? trimmed
    : HEX8_RE.test(trimmed)
      ? trimmed.slice(0, 7)
      : "#09090b";
  const clamped = Math.min(Math.max(opacity, 0.05), 1);
  if (clamped >= 0.995) {
    return cleanHex;
  }
  const alphaHex = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  return `${cleanHex}${alphaHex}`;
}
