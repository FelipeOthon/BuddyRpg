"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Dices, Skull, Sparkles } from "lucide-react";
import { playDiceRollSound } from "@/lib/audio/soundEngine";
import { useBoardStore } from "@/stores/boardStore";

interface DiePhysicsBody {
  group: THREE.Group;
  badge: THREE.Sprite;
  vx: number;
  vy: number;
  vz: number;
  wx: number;
  wy: number;
  wz: number;
  settled: boolean;
  isCrit: boolean;
  isFumble: boolean;
  kept: boolean;
}

function createGeometryForSides(sides: number): THREE.BufferGeometry {
  if (sides === 4) return new THREE.TetrahedronGeometry(0.78, 0);
  if (sides === 6) return new THREE.BoxGeometry(0.95, 0.95, 0.95);
  if (sides === 8 || sides === 10 || sides === 100) {
    return new THREE.OctahedronGeometry(0.76, 0);
  }
  if (sides === 12) return new THREE.DodecahedronGeometry(0.72, 0);
  return new THREE.IcosahedronGeometry(0.78, 0);
}

function createNumberBadgeSprite(params: {
  value: number;
  sides: number;
  isCrit: boolean;
  isFumble: boolean;
  kept: boolean;
}): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, 256, 256);

  // Anel externo dourado/esmeralda/rubro
  ctx.beginPath();
  ctx.arc(128, 128, 84, 0, Math.PI * 2);
  ctx.fillStyle = params.isCrit
    ? "rgba(6, 78, 59, 0.92)"
    : params.isFumble
      ? "rgba(136, 19, 55, 0.92)"
      : "rgba(12, 10, 18, 0.88)";
  ctx.fill();

  ctx.lineWidth = 8;
  ctx.strokeStyle = params.isCrit
    ? "#34d399"
    : params.isFumble
      ? "#fb7185"
      : params.kept
        ? "#f59e0b"
        : "#52525b";
  ctx.stroke();

  // Número sorteado
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 84px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = params.isCrit
    ? "#fef08a"
    : params.isFumble
      ? "#fecdd3"
      : params.kept
        ? "#fef3c7"
        : "#a1a1aa";
  ctx.fillText(String(params.value), 128, 118);

  // Tipo de dado (ex: d20)
  ctx.font = "700 30px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = params.isCrit
    ? "#6ee7b7"
    : params.isFumble
      ? "#fda4af"
      : "#fbbf24";
  ctx.fillText(`d${params.sides}`, 128, 176);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.25, 1.25, 1);
  return sprite;
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
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, -6.2, 11.5);
    camera.lookAt(0, 0.2, 0);

    // Iluminação cinematográfica (luz quente de tocha + luz arcana fria)
    const ambient = new THREE.AmbientLight(0xfff1d6, 0.75);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffd28a, 2.4);
    keyLight.position.set(5, -4, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    const dCam = 9;
    keyLight.shadow.camera.left = -dCam;
    keyLight.shadow.camera.right = dCam;
    keyLight.shadow.camera.top = dCam;
    keyLight.shadow.camera.bottom = -dCam;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x818cf8, 22, 25);
    rimLight.position.set(-6, 5, 6);
    scene.add(rimLight);

    // Plano invisível que recebe sombras reais sobre o mapa
    const floorGeo = new THREE.PlaneGeometry(32, 24);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.48 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    floor.position.z = 0;
    scene.add(floor);

    // Constrói os dados do roll_result
    const flatDice: Array<{ sides: number; value: number; kept: boolean }> =
      [];
    for (const term of activeDice3dRoll.roll.terms) {
      if (term.type === "dice") {
        for (const r of term.rolls) {
          flatDice.push({
            sides: term.sides,
            value: r.v,
            kept: r.kept,
          });
        }
      }
    }

    const bodies: DiePhysicsBody[] = [];
    const diceCount = Math.min(flatDice.length, 16);

    let soundNat20 = false;
    let soundNat1 = false;

    for (let i = 0; i < diceCount; i++) {
      const item = flatDice[i]!;
      const isCrit = item.kept && item.sides === 20 && item.value === 20;
      const isFumble = item.kept && item.sides === 20 && item.value === 1;
      if (isCrit) soundNat20 = true;
      if (isFumble) soundNat1 = true;

      const geo = createGeometryForSides(item.sides);
      const baseColor = isCrit
        ? 0x065f46
        : isFumble
          ? 0x881337
          : item.kept
            ? 0x221738
            : 0x27272a;

      const mat = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.22,
        metalness: 0.35,
        clearcoat: 0.9,
        clearcoatRoughness: 0.15,
        transparent: !item.kept,
        opacity: item.kept ? 1 : 0.48,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Bordas metálicas em ouro velho / esmeralda / rubi
      const edgesGeo = new THREE.EdgesGeometry(geo);
      const edgeColor = isCrit
        ? 0x34d399
        : isFumble
          ? 0xfb7185
          : item.kept
            ? 0xf59e0b
            : 0x71717a;
      const edgesMat = new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: item.kept ? 0.95 : 0.45,
      });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edges);

      const group = new THREE.Group();
      group.add(mesh);

      const angle = (i / Math.max(diceCount, 1)) * Math.PI * 2;
      const startX = -3.8 + (i % 4) * 1.1;
      const startY = -3.6 + Math.floor(i / 4) * 0.8;
      group.position.set(startX, startY, 3.6 + (i % 3) * 0.7);
      group.rotation.set(i * 0.9, i * 1.4, i * 0.6);

      scene.add(group);

      const badge = createNumberBadgeSprite({
        value: item.value,
        sides: item.sides,
        isCrit,
        isFumble,
        kept: item.kept,
      });
      badge.position.set(startX, startY, 1.35);
      scene.add(badge);

      const targetX = Math.cos(angle) * Math.min(diceCount * 0.55, 2.8);
      const targetY = Math.sin(angle) * Math.min(diceCount * 0.45, 2.0);
      const flightFrames = 36;

      bodies.push({
        group,
        badge,
        vx: (targetX - startX) / flightFrames,
        vy: (targetY - startY) / flightFrames,
        vz: 0.12 + (i % 3) * 0.03,
        wx: (i % 2 === 0 ? 1 : -1) * 0.24,
        wy: 0.28,
        wz: 0.19,
        settled: false,
        isCrit,
        isFumble,
        kept: item.kept,
      });
    }

    playDiceRollSound({
      diceCount,
      hasNat20: soundNat20,
      hasNat1: soundNat1,
    });

    let rafId = 0;
    const startTime = performance.now();
    const totalDuration = 4000;

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

      // Passo de física 3D
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i]!;
        if (!b.settled) {
          b.group.position.x += b.vx;
          b.group.position.y += b.vy;
          b.group.position.z += b.vz;
          b.vz -= 0.019; // gravidade

          b.group.rotation.x += b.wx;
          b.group.rotation.y += b.wy;
          b.group.rotation.z += b.wz;

          // Limites da mesa
          if (b.group.position.x < -5.5 || b.group.position.x > 5.5) {
            b.vx = -b.vx * 0.7;
          }
          if (b.group.position.y < -3.8 || b.group.position.y > 3.8) {
            b.vy = -b.vy * 0.7;
          }

          // Quique no chão z = 0.65
          if (b.group.position.z <= 0.65) {
            b.group.position.z = 0.65;
            if (Math.abs(b.vz) > 0.055) {
              b.vz = -b.vz * 0.54;
              b.vx *= 0.76;
              b.vy *= 0.76;
              b.wx *= 0.72;
              b.wy *= 0.72;
              b.wz *= 0.72;
            } else {
              b.vz = 0;
              b.vx *= 0.82;
              b.vy *= 0.82;
              b.wx *= 0.68;
              b.wy *= 0.68;
              b.wz *= 0.68;

              if (
                Math.hypot(b.vx, b.vy) < 0.008 &&
                Math.hypot(b.wx, b.wy, b.wz) < 0.02
              ) {
                b.settled = true;
              }
            }
          }
        }

        // Repulsão suave entre dados
        for (let j = i + 1; j < bodies.length; j++) {
          const other = bodies[j]!;
          const dx = other.group.position.x - b.group.position.x;
          const dy = other.group.position.y - b.group.position.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < 1.45) {
            const push = (1.45 - dist) * 0.08;
            const nx = dx / dist;
            const ny = dy / dist;
            b.group.position.x -= nx * push;
            b.group.position.y -= ny * push;
            other.group.position.x += nx * push;
            other.group.position.y += ny * push;
          }
        }

        // Badge acompanha o dado e aparece suavemente ao assentar (ou após 850ms)
        b.badge.position.set(
          b.group.position.x,
          b.group.position.y,
          b.group.position.z + 0.95
        );
        const badgeMat = b.badge.material as THREE.SpriteMaterial;
        if (b.settled || elapsed > 900) {
          badgeMat.opacity = Math.min(badgeMat.opacity + 0.12, 1);
        }
      }

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      bodies.forEach((b) => {
        b.badge.material.map?.dispose();
        b.badge.material.dispose();
      });
      floorGeo.dispose();
      floorMat.dispose();
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
