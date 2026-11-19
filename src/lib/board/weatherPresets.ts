import type { WeatherPreset } from "@/types/domain";

export const WEATHER_PRESET_OPTIONS: Array<{
  value: WeatherPreset;
  label: string;
  shortLabel: string;
  emoji: string;
}> = [
  { value: "none", label: "Sem Clima", shortLabel: "Sem Clima", emoji: "☁️" },
  { value: "rain", label: "🌧️ Chuva", shortLabel: "Chuva", emoji: "🌧️" },
  { value: "snow", label: "❄️ Neve", shortLabel: "Neve", emoji: "❄️" },
  { value: "fog_mist", label: "🌫️ Neblina", shortLabel: "Neblina", emoji: "🌫️" },
  { value: "embers", label: "🔥 Brasas (Fogo)", shortLabel: "Brasas", emoji: "🔥" },
  { value: "ash", label: "🌋 Cinzas", shortLabel: "Cinzas", emoji: "🌋" },
];

export function formatWeatherBadge(preset: WeatherPreset): string {
  const found = WEATHER_PRESET_OPTIONS.find((o) => o.value === preset);
  return found ? `${found.emoji} ${found.shortLabel}` : preset;
}
