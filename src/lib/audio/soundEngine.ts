"use client";

import type { MusicPreset, MusicStatePayload } from "@/types/domain";

export type AmbiencePreset = MusicPreset;

export const MUSIC_PRESETS: Array<{
  id: Exclude<MusicPreset, "none">;
  label: string;
  subtitle: string;
  emoji: string;
}> = [
  {
    id: "tavern_bard",
    label: "Taverna do Bardo",
    subtitle: "Alaúde medieval em modo Dórico",
    emoji: "🍺",
  },
  {
    id: "forest_exploration",
    label: "Exploração & Estrada",
    subtitle: "Harpa suave & flauta etérea",
    emoji: "🌿",
  },
  {
    id: "epic_combat",
    label: "Combate Épico",
    subtitle: "Tambores pulsantes & metais",
    emoji: "⚔️",
  },
  {
    id: "dungeon_suspense",
    label: "Masmorra & Tensão",
    subtitle: "Drone profundo & sinos distantes",
    emoji: "🕯️",
  },
  {
    id: "tavern_fire",
    label: "Lareira Aconchegante",
    subtitle: "Brasa quente & estalos de lenha",
    emoji: "🔥",
  },
  {
    id: "sword_coast_rain",
    label: "Chuva & Tempestade",
    subtitle: "Chuva contínua & trovões",
    emoji: "🌧️",
  },
];

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let activeMusicKey = "";
let activeStopFn: (() => void) | null = null;
let activeMasterGain: GainNode | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
let currentEffectiveVolume = 0.65;

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
  return audioCtx;
}

export async function unlockAudioPlayback(): Promise<boolean> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  if (activeHtmlAudio && activeHtmlAudio.paused && activeMusicKey.startsWith("url:")) {
    try {
      await activeHtmlAudio.play();
    } catch {
      return false;
    }
  }
  return true;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (!enabled) {
    stopMusicEngine();
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function stopMusicEngine(): void {
  activeMusicKey = "";
  if (activeStopFn) {
    activeStopFn();
    activeStopFn = null;
  }
  activeMasterGain = null;
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.src = "";
    } catch {
      // ignore
    }
    activeHtmlAudio = null;
  }
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
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }

  const bounces = Math.min(Math.max(params.diceCount * 2 + 3, 4), 10);
  for (let i = 0; i < bounces; i++) {
    const delay = i * 0.085 + (i % 2) * 0.02;
    const pitch = 240 + ((i * 53) % 180);
    const vol = Math.max(0.18 - i * 0.015, 0.03);
    playSingleWoodBounce(ctx, delay, pitch, vol);
  }

  if (params.hasNat20) {
    playToneChord(ctx, 0.72, [523.25, 659.25, 783.99, 1046.5], "sine", 0.9);
  } else if (params.hasNat1) {
    playToneChord(ctx, 0.72, [146.83, 103.83], "sawtooth", 0.75);
  }
}

function schedulePluckNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  durSec: number,
  vol: number,
  wave: OscillatorType = "triangle",
  cutoffHz = 1800
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = wave;
  osc.frequency.setValueAtTime(freq, now);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoffHz, now);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(cutoffHz * 0.3, 180),
    now + durSec
  );

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + durSec);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(now);
  osc.stop(now + durSec + 0.05);
}

function scheduleDrumHit(
  ctx: AudioContext,
  dest: AudioNode,
  startPitch: number,
  endPitch: number,
  durSec: number,
  vol: number
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startPitch, now);
  osc.frequency.exponentialRampToValueAtTime(endPitch, now + durSec);

  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + durSec + 0.03);
}

function createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const size = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < size; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.025 * white) / 1.025;
    out[i] = last * 0.45;
  }
  return buffer;
}

function startProceduralPreset(
  preset: Exclude<MusicPreset, "none">,
  onAutoplayBlocked?: (blocked: boolean) => void
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume().then(
      () => onAutoplayBlocked?.(ctx.state === "suspended"),
      () => onAutoplayBlocked?.(true)
    );
  } else {
    onAutoplayBlocked?.(false);
  }

  const master = ctx.createGain();
  master.gain.value = currentEffectiveVolume;
  master.connect(ctx.destination);
  activeMasterGain = master;

  const cleanups: Array<() => void> = [];
  let timerId: number | null = null;
  let step = 0;

  if (preset === "tavern_bard") {
    // Escala Dórico em Ré (D4, F4, G4, A4, C5, D5)
    const melody = [
      293.66, 349.23, 440.0, 392.0, 349.23, 329.63, 293.66, 261.63,
      293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 293.66,
    ];
    const bass = [146.83, 146.83, 130.81, 130.81, 174.61, 164.81, 146.83, 130.81];

    const tick = () => {
      const n = melody[step % melody.length]!;
      schedulePluckNote(ctx, master, n, 0.72, 0.19, "triangle", 2200);
      if (step % 2 === 0) {
        const b = bass[Math.floor(step / 2) % bass.length]!;
        schedulePluckNote(ctx, master, b, 1.1, 0.16, "sine", 900);
      }
      if (step % 4 === 0) {
        scheduleDrumHit(ctx, master, 110, 48, 0.14, 0.12);
      }
      step++;
    };
    tick();
    timerId = window.setInterval(tick, 340);
  } else if (preset === "forest_exploration") {
    // Arpejos pentatônicos em Lá menor / Dó maior
    const harp = [
      220.0, 261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63,
      196.0, 246.94, 293.66, 392.0, 493.88, 392.0, 293.66, 246.94,
    ];
    const flute = [659.25, 0, 587.33, 523.25, 0, 440.0, 392.0, 0];

    const tick = () => {
      const h = harp[step % harp.length]!;
      schedulePluckNote(ctx, master, h, 1.35, 0.14, "sine", 1600);
      if (step % 4 === 0) {
        const f = flute[Math.floor(step / 4) % flute.length]!;
        if (f > 0) {
          schedulePluckNote(ctx, master, f, 1.9, 0.08, "sine", 1400);
        }
      }
      step++;
    };
    tick();
    timerId = window.setInterval(tick, 440);
  } else if (preset === "epic_combat") {
    // 136 BPM: tambores épicos + ostinato em Ré menor
    const ostinato = [146.83, 146.83, 174.61, 146.83, 164.81, 146.83, 130.81, 146.83];
    const brass = [293.66, 0, 349.23, 0, 329.63, 0, 261.63, 440.0];

    const tick = () => {
      const sub = step % 4;
      if (sub === 0) {
        scheduleDrumHit(ctx, master, 130, 42, 0.24, 0.42);
      } else if (sub === 2) {
        scheduleDrumHit(ctx, master, 95, 45, 0.18, 0.26);
      }
      const bassNote = ostinato[step % ostinato.length]!;
      schedulePluckNote(ctx, master, bassNote, 0.32, 0.2, "sawtooth", 780);

      if (step % 4 === 0) {
        const horn = brass[Math.floor(step / 4) % brass.length]!;
        if (horn > 0) {
          schedulePluckNote(ctx, master, horn, 0.95, 0.14, "sawtooth", 1150);
          schedulePluckNote(ctx, master, horn * 1.5, 0.9, 0.07, "triangle", 1150);
        }
      }
      step++;
    };
    tick();
    timerId = window.setInterval(tick, 220);
  } else if (preset === "dungeon_suspense") {
    // Drone grave contínuo + sinos fantasmagóricos esparsos
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const droneFilter = ctx.createBiquadFilter();
    const droneGain = ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.value = 55; // A1
    osc2.type = "triangle";
    osc2.frequency.value = 82.41; // E2

    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 185;
    droneGain.gain.value = 0.18;

    osc1.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(master);
    osc1.start();
    osc2.start();
    cleanups.push(() => {
      osc1.stop();
      osc2.stop();
    });

    const chimes = [440, 466.16, 329.63, 293.66, 523.25];
    timerId = window.setInterval(() => {
      if (Math.random() < 0.65) {
        const f = chimes[Math.floor(Math.random() * chimes.length)]!;
        schedulePluckNote(ctx, master, f, 2.4, 0.08, "sine", 1300);
      }
    }, 1700);
  } else {
    // Lareira ou Chuva com textura rica + eventos orgânicos
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 4);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    const nGain = ctx.createGain();
    if (preset === "tavern_fire") {
      filter.type = "bandpass";
      filter.frequency.value = 390;
      nGain.gain.value = 0.28;
    } else {
      filter.type = "lowpass";
      filter.frequency.value = 1100;
      nGain.gain.value = 0.24;
    }
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(master);
    noise.start();
    cleanups.push(() => noise.stop());

    timerId = window.setInterval(() => {
      if (preset === "tavern_fire" && Math.random() < 0.55) {
        schedulePluckNote(
          ctx,
          master,
          900 + Math.random() * 1400,
          0.045,
          0.06,
          "triangle",
          2800
        );
      } else if (preset === "sword_coast_rain" && Math.random() < 0.16) {
        scheduleDrumHit(ctx, master, 72, 32, 0.9, 0.24);
      }
    }, 450);
  }

  activeStopFn = () => {
    if (timerId !== null) window.clearInterval(timerId);
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
    try {
      master.disconnect();
    } catch {
      // ignore
    }
  };
}

export function applyMusicPlayback(
  state: MusicStatePayload,
  localVolume: number,
  onAutoplayBlocked?: (blocked: boolean) => void
): void {
  const effective = soundEnabled
    ? Math.min(Math.max(state.volume * localVolume, 0), 1)
    : 0;
  currentEffectiveVolume = effective;

  if (!soundEnabled || !state.playing) {
    stopMusicEngine();
    onAutoplayBlocked?.(false);
    return;
  }

  if (state.kind === "url" && state.trackUrl) {
    const key = `url:${state.trackUrl}`;
    if (activeMusicKey === key && activeHtmlAudio) {
      activeHtmlAudio.volume = effective;
      activeHtmlAudio.loop = state.loop;
      return;
    }

    stopMusicEngine();
    activeMusicKey = key;
    if (typeof window === "undefined") return;

    const audio = new window.Audio(state.trackUrl);
    audio.loop = state.loop;
    audio.volume = effective;
    activeHtmlAudio = audio;

    void audio.play().then(
      () => onAutoplayBlocked?.(false),
      () => onAutoplayBlocked?.(true)
    );
    return;
  }

  const preset = state.preset ?? "none";
  if (preset === "none") {
    stopMusicEngine();
    onAutoplayBlocked?.(false);
    return;
  }

  const key = `preset:${preset}`;
  if (activeMusicKey === key && activeMasterGain && audioCtx) {
    activeMasterGain.gain.setTargetAtTime(effective, audioCtx.currentTime, 0.05);
    return;
  }

  stopMusicEngine();
  activeMusicKey = key;
  startProceduralPreset(preset, onAutoplayBlocked);
}

export function setAmbientSoundscape(preset: AmbiencePreset): void {
  applyMusicPlayback(
    {
      playing: preset !== "none",
      kind: "preset",
      preset,
      volume: 0.7,
      loop: true,
      ts: Date.now(),
    },
    0.7
  );
}
