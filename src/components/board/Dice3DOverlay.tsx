"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Dices, Skull, Sparkles } from "lucide-react";
import { playDiceRollSound } from "@/lib/audio/soundEngine";
import {
  buildDieAssets,
  computeTargetDieQuaternion,
  type DieTheme,
} from "@/lib/dice/dice3dGeometry";
import { useBoardStore } from "@/stores/boardStore";

interface DiePhysicsBody {
  group: THREE.Group;
  contactShadow: THREE.Mesh;
  auraDisc: THREE.Mesh | null;
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
  restZ: number;
  vx: number;
  vy: number;
  vz: number;
  wx: number;
  wy: number;
  wz: number;
  targetQuat: THREE.Quaternion;
  settleBlend: number;
  bounces: number;
  settled: boolean;
  isCrit: boolean;
  isFumble: boolean;
}

let cachedShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTex) return cachedShadowTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  g.addColorStop(0, "rgba(0, 0, 0, 0.58)");
  g.addColorStop(0.55, "rgba(0, 0, 0, 0.24)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  cachedShadowTex = new THREE.CanvasTexture(c);
  return cachedShadowTex;
}

function createAuraTexture(kind: "crit" | "fumble"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  if (kind === "crit") {
    g.addColorStop(0, "rgba(52, 211, 153, 0.55)");
    g.addColorStop(0.48, "rgba(16, 185, 129, 0.35)");
    g.addColorStop(1, "rgba(16, 185, 129, 0)");
  } else {
    g.addColorStop(0, "rgba(251, 113, 133, 0.55)");
    g.addColorStop(0.48, "rgba(225, 29, 72, 0.35)");
    g.addColorStop(1, "rgba(225, 29, 72, 0)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export default function Dice3DOverlay() {
  const { dice3dEnabled, activeDice3dRoll, triggerDice3dRoll } =
    useBoardStore();
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dice3dEnabled || !activeDice3dRoll) return;
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 640;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Ambiente IBL de estúdio para reflexos realistas na resina e ouro gravado
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, -4.6, 11.4);
    camera.lookAt(0, 0.15, 0);

    // Iluminação principal quente + contra-luz fria
    const hemi = new THREE.HemisphereLight(0xfef3c7, 0x1e293b, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffe4b5, 2.2);
    keyLight.position.set(4.5, -3.5, 11.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    const dCam = 8.5;
    keyLight.shadow.camera.left = -dCam;
    keyLight.shadow.camera.right = dCam;
    keyLight.shadow.camera.top = dCam;
    keyLight.shadow.camera.bottom = -dCam;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.95);
    fillLight.position.set(-6, 5, 7);
    scene.add(fillLight);

    // Plano invisível receptor de sombra real
    const floorGeo = new THREE.PlaneGeometry(34, 24);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.42 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    floor.position.z = 0;
    scene.add(floor);

    // Expande dados (d100 vira par d% + d10 quando couber na mesa)
    const rawDice: Array<{ sides: number; value: number; kept: boolean }> = [];
    for (const term of activeDice3dRoll.roll.terms) {
      if (term.type === "dice") {
        for (const r of term.rolls) {
          rawDice.push({
            sides: term.sides,
            value: r.v,
            kept: r.kept,
          });
        }
      }
    }

    const flatDice: Array<{
      sides: number;
      value: number;
      kept: boolean;
      isCrit: boolean;
      isFumble: boolean;
    }> = [];

    for (const item of rawDice) {
      const isCrit = item.kept && item.sides === 20 && item.value === 20;
      const isFumble = item.kept && item.sides === 20 && item.value === 1;
      if (item.sides === 100 && rawDice.length <= 8) {
        const tensBucket = Math.floor((item.value % 100) / 10) * 10;
        const tensVal = tensBucket === 0 ? 100 : tensBucket;
        const onesVal = item.value % 10 === 0 ? 10 : item.value % 10;
        flatDice.push({
          sides: 100,
          value: tensVal,
          kept: item.kept,
          isCrit: false,
          isFumble: false,
        });
        flatDice.push({
          sides: 10,
          value: onesVal,
          kept: item.kept,
          isCrit: false,
          isFumble: false,
        });
      } else {
        const normalizedVal =
          item.sides === 100
            ? Math.floor((item.value % 100) / 10) * 10 || 100
            : item.value;
        flatDice.push({
          sides: item.sides,
          value: normalizedVal,
          kept: item.kept,
          isCrit,
          isFumble,
        });
      }
    }

    const bodies: DiePhysicsBody[] = [];
    const diceCount = Math.min(flatDice.length, 16);
    const dieScale = diceCount > 8 ? 1.08 : 1.24;

    const shadowTex = getContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(2.1, 2.1);
    const auraPlaneGeo = new THREE.PlaneGeometry(2.7, 2.7);
    const disposableTextures: THREE.Texture[] = [];

    let soundNat20 = false;
    let soundNat1 = false;

    const cols = Math.max(1, Math.min(diceCount, 5));
    const rows = Math.max(1, Math.ceil(diceCount / cols));

    for (let i = 0; i < diceCount; i++) {
      const item = flatDice[i]!;
      if (item.isCrit) soundNat20 = true;
      if (item.isFumble) soundNat1 = true;

      const theme: DieTheme = item.isCrit
        ? "crit"
        : item.isFumble
          ? "fumble"
          : item.kept
            ? "standard"
            : "dropped";

      const built = buildDieAssets(item.sides, theme);
      const mesh = new THREE.Mesh(built.geometry, built.materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const group = new THREE.Group();
      group.scale.setScalar(dieScale);
      group.add(mesh);

      const startX = -4.2 + (i % 4) * 1.25;
      const startY = -3.4 + Math.floor(i / 4) * 0.9;
      group.position.set(startX, startY, 3.8 + (i % 3) * 0.65);
      group.rotation.set(i * 1.1, i * 1.7, i * 0.8);
      scene.add(group);

      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
      const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowMat);
      contactShadow.position.set(startX, startY, 0.015);
      scene.add(contactShadow);

      let auraDisc: THREE.Mesh | null = null;
      if (item.isCrit || item.isFumble) {
        const auraTex = createAuraTexture(item.isCrit ? "crit" : "fumble");
        disposableTextures.push(auraTex);
        const auraMat = new THREE.MeshBasicMaterial({
          map: auraTex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        auraDisc = new THREE.Mesh(auraPlaneGeo, auraMat);
        auraDisc.position.set(startX, startY, 0.02);
        scene.add(auraDisc);
      }

      const col = i % cols;
      const row = Math.floor(i / cols);
      const spacingX = diceCount === 1 ? 0 : 1.75;
      const spacingY = rows === 1 ? 0 : 1.65;
      const targetX =
        (col - (cols - 1) / 2) * spacingX + ((i % 3) - 1) * 0.16;
      const targetY =
        ((rows - 1) / 2 - row) * spacingY + ((i % 2) - 0.5) * 0.14;

      const yawJitter = (((i * 73) % 21) - 10) * 0.028; // leve naturalidade +-16 deg mantendo leitura reta
      const targetQuat = computeTargetDieQuaternion(
        built.faceMap,
        item.value,
        yawJitter
      );

      const restZ = built.restHeight * dieScale;
      const flightFrames = 34;

      bodies.push({
        group,
        contactShadow,
        auraDisc,
        geometry: built.geometry,
        materials: built.materials,
        restZ,
        vx: (targetX - startX) / flightFrames,
        vy: (targetY - startY) / flightFrames,
        vz: 0.11 + (i % 3) * 0.025,
        wx: (i % 2 === 0 ? 1 : -1) * (0.24 + (i % 3) * 0.04),
        wy: (i % 3 === 0 ? -1 : 1) * 0.29,
        wz: 0.21,
        targetQuat,
        settleBlend: 0,
        bounces: 0,
        settled: false,
        isCrit: item.isCrit,
        isFumble: item.isFumble,
      });
    }

    playDiceRollSound({
      diceCount,
      hasNat20: soundNat20,
      hasNat1: soundNat1,
    });

    let rafId = 0;
    const startTime = performance.now();
    const totalDuration = 4200;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed >= totalDuration) {
        triggerDice3dRoll(null);
        return;
      }

      const fadeAlpha =
        elapsed > totalDuration - 650
          ? Math.max((totalDuration - elapsed) / 650, 0)
          : 1;
      renderer.domElement.style.opacity = String(fadeAlpha);

      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i]!;
        if (!b.settled) {
          b.group.position.x += b.vx;
          b.group.position.y += b.vy;
          b.group.position.z += b.vz;
          b.vz -= 0.02;

          // Mistura suave para a rotação da face sorteada após o primeiro quique/meio-voo
          if (elapsed > 520) {
            b.settleBlend = Math.min(1, b.settleBlend + 0.048);
            const spinDamp = 1 - b.settleBlend;
            b.group.rotation.x += b.wx * spinDamp;
            b.group.rotation.y += b.wy * spinDamp;
            b.group.rotation.z += b.wz * spinDamp;
            b.group.quaternion.slerp(b.targetQuat, 0.09 + b.settleBlend * 0.16);
          } else {
            b.group.rotation.x += b.wx;
            b.group.rotation.y += b.wy;
            b.group.rotation.z += b.wz;
          }

          if (b.group.position.x < -5.2 || b.group.position.x > 5.2) {
            b.vx = -b.vx * 0.68;
          }
          if (b.group.position.y < -3.6 || b.group.position.y > 3.6) {
            b.vy = -b.vy * 0.68;
          }

          if (b.group.position.z <= b.restZ) {
            b.group.position.z = b.restZ;
            b.bounces++;
            if (Math.abs(b.vz) > 0.055 && b.bounces <= 3) {
              b.vz = -b.vz * 0.5;
              b.vx *= 0.72;
              b.vy *= 0.72;
              b.wx *= 0.62;
              b.wy *= 0.62;
              b.wz *= 0.62;
            } else {
              b.vz = 0;
              b.vx *= 0.8;
              b.vy *= 0.8;
              b.wx *= 0.6;
              b.wy *= 0.6;
              b.wz *= 0.6;
              b.group.quaternion.slerp(b.targetQuat, 0.28);

              if (
                Math.hypot(b.vx, b.vy) < 0.008 &&
                b.group.quaternion.angleTo(b.targetQuat) < 0.025
              ) {
                b.group.quaternion.copy(b.targetQuat);
                b.settled = true;
              }
            }
          }
        }

        // Separação suave entre dados na mesa
        for (let j = i + 1; j < bodies.length; j++) {
          const other = bodies[j]!;
          const dx = other.group.position.x - b.group.position.x;
          const dy = other.group.position.y - b.group.position.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < 1.55) {
            const push = (1.55 - dist) * 0.08;
            const nx = dx / dist;
            const ny = dy / dist;
            b.group.position.x -= nx * push;
            b.group.position.y -= ny * push;
            other.group.position.x += nx * push;
            other.group.position.y += ny * push;
          }
        }

        // Atualiza sombra de contato no chão
        const heightRatio = Math.max(0, Math.min(1, (b.group.position.z - b.restZ) / 3.8));
        b.contactShadow.position.set(
          b.group.position.x,
          b.group.position.y,
          0.015
        );
        const sScale = (1 + heightRatio * 0.55) * dieScale;
        b.contactShadow.scale.set(sScale, sScale, 1);
        (b.contactShadow.material as THREE.MeshBasicMaterial).opacity =
          0.65 * (1 - heightRatio * 0.65);

        // Aura pulsante de Crítico / Falha Crítica
        if (b.auraDisc) {
          b.auraDisc.position.set(
            b.group.position.x,
            b.group.position.y,
            0.02
          );
          const auraMat = b.auraDisc.material as THREE.MeshBasicMaterial;
          if (b.settled || elapsed > 900) {
            const pulse = 0.72 + Math.sin(elapsed * 0.009) * 0.28;
            auraMat.opacity = Math.min(auraMat.opacity + 0.08, 0.9 * pulse);
            const aScale = (0.95 + Math.sin(elapsed * 0.006) * 0.08) * dieScale;
            b.auraDisc.scale.set(aScale, aScale, 1);
          }
        }
      }

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      bodies.forEach((b) => {
        b.geometry.dispose();
        b.materials.forEach((m) => m.dispose());
        (b.contactShadow.material as THREE.Material).dispose();
        if (b.auraDisc) {
          (b.auraDisc.material as THREE.Material).dispose();
        }
      });
      disposableTextures.forEach((t) => t.dispose());
      shadowPlaneGeo.dispose();
      auraPlaneGeo.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dice3dEnabled, activeDice3dRoll, triggerDice3dRoll]);

  if (!dice3dEnabled || !activeDice3dRoll) {
    return null;
  }

  const { roll, author } = activeDice3dRoll;
  let hasNat20 = false;
  let hasNat1 = false;
  for (const t of roll.terms) {
    if (t.type === "dice" && t.sides === 20) {
      for (const r of t.rolls) {
        if (r.kept && r.v === 20) hasNat20 = true;
        if (r.kept && r.v === 1) hasNat1 = true;
      }
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-25 overflow-hidden">
      <div ref={mountRef} className="h-full w-full" />

      {/* Banner Arcano Superior do Resultado */}
      <div className="absolute top-16 left-1/2 flex max-w-[92vw] -translate-x-1/2 flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-amber-500/50 bg-zinc-950/95 px-4 py-2 shadow-[0_0_35px_rgba(245,158,11,0.35)] backdrop-blur sm:px-5 sm:py-2.5">
        <Dices className="h-5 w-5 text-amber-400" />
        <div className="text-xs">
          <span className="font-bold text-amber-200">{author}</span>{" "}
          <span className="text-zinc-400">rolou</span>{" "}
          <code className="font-mono font-bold text-amber-300">
            {roll.expression}
          </code>
          {roll.label && (
            <span className="ml-1.5 rounded bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-200">
              {roll.label}
            </span>
          )}
        </div>
        <div className="h-5 w-px bg-amber-500/30" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Total
          </span>
          <span className="font-display text-xl font-extrabold text-amber-300">
            {roll.total}
          </span>
        </div>
        {hasNat20 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            20 Natural!
          </span>
        )}
        {!hasNat20 && hasNat1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
            <Skull className="h-3.5 w-3.5" />
            Falha Crítica!
          </span>
        )}
      </div>
    </div>
  );
}
