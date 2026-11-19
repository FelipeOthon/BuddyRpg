import type { WeatherEffect, WeatherPreset } from "@/types/domain";

export const WEATHER_EFFECT_OPTIONS: ReadonlyArray<{
  value: WeatherEffect;
  label: string;
  short: string;
  emoji: string;
}> = [
  { value: "rain", label: "🌧️ Chuva", short: "Chuva", emoji: "🌧️" },
  { value: "snow", label: "❄️ Neve", short: "Neve", emoji: "❄️" },
  { value: "fog_mist", label: "🌫️ Neblina", short: "Neblina", emoji: "🌫️" },
  { value: "embers", label: "🔥 Brasas", short: "Brasas", emoji: "🔥" },
  { value: "ash", label: "🌋 Cinzas", short: "Cinzas", emoji: "🌋" },
  { value: "nightfall", label: "🌙 Anoitecer", short: "Anoitecer", emoji: "🌙" },
];

export const WEATHER_PRESET_OPTIONS: Array<{
  value: WeatherPreset;
  label: string;
}> = [
  { value: "none", label: "☀️ Sem Clima" },
  ...WEATHER_EFFECT_OPTIONS.map((opt) => ({
    value: opt.value as WeatherPreset,
    label: opt.label,
  })),
];

const VALID_EFFECTS = new Set<string>(
  WEATHER_EFFECT_OPTIONS.map((opt) => opt.value)
);

const EFFECT_ORDER = new Map<string, number>(
  WEATHER_EFFECT_OPTIONS.map((opt, idx) => [opt.value, idx])
);

/**
 * Faz parse de um preset único ou composto ("rain,fog_mist,nightfall") em lista ordenada e deduplicada.
 */
export function parseWeatherEffects(
  preset: string | null | undefined
): WeatherEffect[] {
  if (!preset || preset === "none") return [];
  const unique = new Set<WeatherEffect>();
  for (const part of preset.split(",")) {
    const trimmed = part.trim();
    if (trimmed && trimmed !== "none" && VALID_EFFECTS.has(trimmed)) {
      unique.add(trimmed as WeatherEffect);
    }
  }
  return Array.from(unique).sort(
    (a, b) => (EFFECT_ORDER.get(a) ?? 99) - (EFFECT_ORDER.get(b) ?? 99)
  );
}

export function serializeWeatherEffects(
  effects: readonly WeatherEffect[]
): WeatherPreset {
  const unique = new Set<WeatherEffect>();
  for (const eff of effects) {
    if (VALID_EFFECTS.has(eff)) unique.add(eff);
  }
  if (unique.size === 0) return "none";
  return Array.from(unique)
    .sort((a, b) => (EFFECT_ORDER.get(a) ?? 99) - (EFFECT_ORDER.get(b) ?? 99))
    .join(",");
}

export function toggleWeatherEffect(
  currentPreset: string | null | undefined,
  effect: WeatherEffect
): WeatherPreset {
  const active = parseWeatherEffects(currentPreset);
  const next = active.includes(effect)
    ? active.filter((item) => item !== effect)
    : [...active, effect];
  return serializeWeatherEffects(next);
}

/**
 * Valida e normaliza string vinda do usuário/banco ('none' ou CSV de efeitos válidos).
 * Retorna null se houver tokens inválidos.
 */
export function normalizeWeatherPreset(raw: string): WeatherPreset | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "none") return "none";
  const parts = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "none";
  const valid: WeatherEffect[] = [];
  for (const p of parts) {
    if (p === "none") continue;
    if (!VALID_EFFECTS.has(p)) return null;
    valid.push(p as WeatherEffect);
  }
  return serializeWeatherEffects(valid);
}

export function hasActiveWeather(preset: string | null | undefined): boolean {
  return parseWeatherEffects(preset).length > 0;
}

export function formatWeatherBadge(
  preset: string | null | undefined
): string {
  const effects = parseWeatherEffects(preset);
  if (effects.length === 0) return "☀️ Limpo";
  if (effects.length === 1) {
    const found = WEATHER_EFFECT_OPTIONS.find((o) => o.value === effects[0]);
    return found?.label ?? effects[0]!;
  }
  const emojis = effects
    .map((eff) => WEATHER_EFFECT_OPTIONS.find((o) => o.value === eff)?.emoji ?? "")
    .filter(Boolean)
    .join(" ");
  return `${emojis} (${effects.length})`;
}
