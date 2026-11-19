import { describe, expect, it } from "vitest";
import {
  formatWeatherBadge,
  hasActiveWeather,
  normalizeWeatherPreset,
  parseWeatherEffects,
  serializeWeatherEffects,
  toggleWeatherEffect,
} from "./weatherPresets";

describe("weatherPresets", () => {
  it("parses and serializes single, multiple, and none presets in canonical order", () => {
    expect(parseWeatherEffects(null)).toEqual([]);
    expect(parseWeatherEffects("none")).toEqual([]);
    expect(parseWeatherEffects("nightfall,rain,fog_mist,rain")).toEqual([
      "rain",
      "fog_mist",
      "nightfall",
    ]);
    expect(serializeWeatherEffects(["nightfall", "rain"])).toBe(
      "rain,nightfall"
    );
    expect(serializeWeatherEffects([])).toBe("none");
  });

  it("toggles individual weather effects smoothly", () => {
    let cur = toggleWeatherEffect("none", "rain");
    expect(cur).toBe("rain");
    cur = toggleWeatherEffect(cur, "fog_mist");
    expect(cur).toBe("rain,fog_mist");
    cur = toggleWeatherEffect(cur, "nightfall");
    expect(cur).toBe("rain,fog_mist,nightfall");
    cur = toggleWeatherEffect(cur, "fog_mist");
    expect(cur).toBe("rain,nightfall");
    cur = toggleWeatherEffect(cur, "rain");
    cur = toggleWeatherEffect(cur, "nightfall");
    expect(cur).toBe("none");
  });

  it("validates and formats combined badges", () => {
    expect(normalizeWeatherPreset(" rain , nightfall ")).toBe("rain,nightfall");
    expect(normalizeWeatherPreset("invalid_weather")).toBeNull();
    expect(hasActiveWeather("none")).toBe(false);
    expect(hasActiveWeather("nightfall")).toBe(true);
    expect(formatWeatherBadge("nightfall")).toBe("🌙 Anoitecer");
    expect(formatWeatherBadge("rain,fog_mist,nightfall")).toBe("🌧️ 🌫️ 🌙 (3)");
  });
});
