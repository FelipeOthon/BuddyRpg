"use client";

export type AmbiencePreset =
  | "none"
  | "tavern_fire"
  | "sword_coast_rain"
  | "undermountain_dungeon";

let audioCtx: AudioContext | null = null;
let ambienceStopFn: (() => void) | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (Ctor) {
      audioCtx = new Ctor();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (!enabled && ambienceStopFn) {
    ambienceStopFn();
    ambienceStopFn = null;
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function playSingleWoodBounce(
  ctx: AudioContext,
  delaySec: number,
  pitchHz: number,
  gainAmount: number
) {
  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(pitchHz, start);
  osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.42, start + 0.045);

  gain.gain.setValueAtTime(gainAmount, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + 0.055);
}

function playToneChord(
  ctx: AudioContext,
  delaySec: number,
  frequencies: number[],
  type: OscillatorType,
  durationSec: number
) {
  const start = ctx.currentTime + delaySec;
  frequencies.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start + idx * 0.05);

    gain.gain.setValueAtTime(0.08, start + idx * 0.05);
    gain.gain.exponentialRampToValueAtTime(
      0.0008,
      start + idx * 0.05 + durationSec
    );

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start + idx * 0.05);
    osc.stop(start + idx * 0.05 + durationSec + 0.02);
  });
}

export function playDiceRollSound(params: {
  diceCount: number;
  hasNat20: boolean;
  hasNat1: boolean;
}): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bounces = Math.min(Math.max(params.diceCount * 2 + 3, 4), 10);
  for (let i = 0; i < bounces; i++) {
    const delay = i * 0.085 + (i % 2) * 0.02;
    const pitch = 240 + ((i * 53) % 180);
    const vol = Math.max(0.18 - i * 0.015, 0.03);
    playSingleWoodBounce(ctx, delay, pitch, vol);
  }

  if (params.hasNat20) {
    // Acorde heroico de 20 Natural
    playToneChord(ctx, 0.72, [523.25, 659.25, 783.99, 1046.5], "sine", 0.9);
  } else if (params.hasNat1) {
    // Acorde sombrio de 1 Natural
    playToneChord(ctx, 0.72, [146.83, 103.83], "sawtooth", 0.75);
  }
}

export function setAmbientSoundscape(preset: AmbiencePreset): void {
  if (ambienceStopFn) {
    ambienceStopFn();
    ambienceStopFn = null;
  }

  if (!soundEnabled || preset === "none") return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Cria buffer de ruído filtrado suave para ambiência contínua
  const bufferSize = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = output[i]!;
    output[i]! *= 0.25;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  if (preset === "tavern_fire") {
    filter.type = "bandpass";
    filter.frequency.value = 420;
    gain.gain.value = 0.09;
  } else if (preset === "sword_coast_rain") {
    filter.type = "lowpass";
    filter.frequency.value = 950;
    gain.gain.value = 0.07;
  } else {
    // undermountain_dungeon
    filter.type = "lowpass";
    filter.frequency.value = 160;
    gain.gain.value = 0.14;
  }

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();

  ambienceStopFn = () => {
    try {
      noise.stop();
      noise.disconnect();
    } catch {
      // ignore
    }
  };
}
