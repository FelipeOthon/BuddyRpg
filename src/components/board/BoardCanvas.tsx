"use client";

import { useEffect, useRef, useState } from "react";
import { Layer, Stage } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { clamp, screenToWorld, type Point2D } from "@/lib/board/geometry";
import { useKeyPressed } from "@/hooks/useKeyPressed";
import { useBoardStore } from "@/stores/boardStore";
import type { CampaignRole, Scene, Token } from "@/types/domain";
import MapLayer from "./MapLayer";
import GridLayer from "./GridLayer";
import TokenNode from "./TokenNode";
import RulerLayer, { type LocalRulerState } from "./RulerLayer";
import BoardToolbar from "./BoardToolbar";

export default function BoardCanvas({
  scene,
  currentUserId,
  role,
  onTokenDragBroadcast,
  onTokenDragCommit,
  onRulerBroadcast,
}: {
  scene: Scene;
  currentUserId: string;
  role: CampaignRole;
  onTokenDragBroadcast?: (tokenId: string, x: number, y: number) => void;
  onTokenDragCommit?: (
    tokenId: string,
    x: number,
    y: number,
    prevX: number,
    prevY: number
  ) => void;
  onRulerBroadcast?: (
    start: Point2D,
    end: Point2D,
    active: boolean
  ) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [size, setSize] = useState({ width: 900, height: 650 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
    null
  );
  const pinchDistRef = useRef<number | null>(null);
  const [localRuler, setLocalRuler] = useState<LocalRulerState | null>(null);

  // Token de demonstração local caso a cena ainda não tenha tokens no banco
  const [demoTokenPos, setDemoTokenPos] = useState<Point2D>({
    x: scene.grid_size * 2,
    y: scene.grid_size * 2,
  });

  const spaceDown = useKeyPressed(" ");
  const {
    tool,
    viewport,
    setViewport,
    tokens,
    selectedTokenId,
    setSelectedTokenId,
    setDraggingLocalTokenId,
    remoteTokenDrags,
    remoteRulers,
    upsertToken,
  } = useBoardStore();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setSize({
        width: Math.max(el.clientWidth, 200),
        height: Math.max(el.clientHeight, 200),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const sceneTokens = tokens.filter(
    (t) => t.scene_id === scene.id && (role === "gm" || !t.is_hidden)
  );

  const fallbackDemoToken: Token = {
    id: `demo-token-${scene.id}`,
    scene_id: scene.id,
    campaign_id: scene.campaign_id,
    owner_id: currentUserId,
    character_id: null,
    name: "Herói (Demo)",
    image_url: null,
    pos_x: demoTokenPos.x,
    pos_y: demoTokenPos.y,
    size: 1,
    hp_current: 24,
    hp_max: 30,
    is_hidden: false,
    conditions: [],
    updated_at: new Date().toISOString(),
  };

  const renderedTokens =
    sceneTokens.length > 0 ? sceneTokens : [fallbackDemoToken];

  const canUserMoveToken = (token: Token): boolean => {
    if (token.id.startsWith("demo-token-")) return true;
    if (role === "gm") return true;
    return token.owner_id === currentUserId;
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = viewport.scale;
    const zoomFactor = e.evt.deltaY > 0 ? 1 / 1.12 : 1.12;
    const nextScale = clamp(
      Math.round(oldScale * zoomFactor * 1000) / 1000,
      0.15,
      4
    );

    const worldPoint = screenToWorld(pointer, viewport);
    setViewport({
      scale: nextScale,
      x: pointer.x - worldPoint.x * nextScale,
      y: pointer.y - worldPoint.y * nextScale,
    });
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const isMiddleClick = e.evt.button === 1;
    const isLeftClick = e.evt.button === 0;
    const wantPan = isMiddleClick || (isLeftClick && (spaceDown || tool === "pan"));

    if (wantPan) {
      e.evt.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.evt.clientX,
        y: e.evt.clientY,
        vx: viewport.x,
        vy: viewport.y,
      };
      return;
    }

    if (isLeftClick && tool === "ruler") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setLocalRuler({ start: worldPt, end: worldPt });
      onRulerBroadcast?.(worldPt, worldPt, true);
      return;
    }

    if (e.target === stage) {
      setSelectedTokenId(null);
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (isPanning && panStartRef.current) {
      const dx = e.evt.clientX - panStartRef.current.x;
      const dy = e.evt.clientY - panStartRef.current.y;
      setViewport({
        ...viewport,
        x: panStartRef.current.vx + dx,
        y: panStartRef.current.vy + dy,
      });
      return;
    }

    if (localRuler) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setLocalRuler((prev) => (prev ? { ...prev, end: worldPt } : null));
      onRulerBroadcast?.(localRuler.start, worldPt, true);
    }
  };

  const finishInteraction = () => {
    pinchDistRef.current = null;
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
    if (localRuler) {
      onRulerBroadcast?.(localRuler.start, localRuler.end, false);
      setLocalRuler(null);
    }
  };

  const handleTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;

    if (touches.length === 2) {
      const dx = touches[0]!.clientX - touches[1]!.clientX;
      const dy = touches[0]!.clientY - touches[1]!.clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      setIsPanning(false);
      return;
    }

    if (touches.length === 1) {
      const t = touches[0]!;
      if (tool === "pan") {
        setIsPanning(true);
        panStartRef.current = {
          x: t.clientX,
          y: t.clientY,
          vx: viewport.x,
          vy: viewport.y,
        };
        return;
      }

      if (tool === "ruler") {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const worldPt = screenToWorld(pointer, viewport);
        setLocalRuler({ start: worldPt, end: worldPt });
        onRulerBroadcast?.(worldPt, worldPt, true);
        return;
      }

      if (e.target === stage) {
        setSelectedTokenId(null);
      }
    }
  };

  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;

    if (touches.length === 2 && pinchDistRef.current) {
      e.evt.preventDefault();
      const t0 = touches[0]!;
      const t1 = touches[1]!;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const scaleBy = dist / pinchDistRef.current;
      pinchDistRef.current = dist;

      const rect = stage.container().getBoundingClientRect();
      const centerScreen = {
        x: (t0.clientX + t1.clientX) / 2 - rect.left,
        y: (t0.clientY + t1.clientY) / 2 - rect.top,
      };
      const nextScale = clamp(
        Math.round(viewport.scale * scaleBy * 1000) / 1000,
        0.15,
        4
      );
      const worldPoint = screenToWorld(centerScreen, viewport);
      setViewport({
        scale: nextScale,
        x: centerScreen.x - worldPoint.x * nextScale,
        y: centerScreen.y - worldPoint.y * nextScale,
      });
      return;
    }

    if (touches.length === 1) {
      const t = touches[0]!;
      if (isPanning && panStartRef.current) {
        const dx = t.clientX - panStartRef.current.x;
        const dy = t.clientY - panStartRef.current.y;
        setViewport({
          ...viewport,
          x: panStartRef.current.vx + dx,
          y: panStartRef.current.vy + dy,
        });
        return;
      }

      if (localRuler) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const worldPt = screenToWorld(pointer, viewport);
        setLocalRuler((prev) => (prev ? { ...prev, end: worldPt } : null));
        onRulerBroadcast?.(localRuler.start, worldPt, true);
      }
    }
  };

  const handleTokenDragStart = (tokenId: string) => {
    setDraggingLocalTokenId(tokenId);
  };

  const handleTokenDragMove = (tokenId: string, x: number, y: number) => {
    if (tokenId.startsWith("demo-token-")) return;
    onTokenDragBroadcast?.(tokenId, x, y);
  };

  const handleTokenDragEnd = (tokenId: string, x: number, y: number) => {
    setDraggingLocalTokenId(null);

    if (tokenId.startsWith("demo-token-")) {
      setDemoTokenPos({ x, y });
      return;
    }

    const existing = tokens.find((t) => t.id === tokenId);
    const prevX = existing?.pos_x ?? x;
    const prevY = existing?.pos_y ?? y;
    if (existing) {
      upsertToken({
        ...existing,
        pos_x: x,
        pos_y: y,
        updated_at: new Date().toISOString(),
      });
    }
    onTokenDragCommit?.(tokenId, x, y, prevX, prevY);
  };

  const cursorClass =
    isPanning
      ? "cursor-grabbing"
      : spaceDown || tool === "pan"
        ? "cursor-grab"
        : tool === "ruler"
          ? "cursor-crosshair"
          : "cursor-default";

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative h-full w-full touch-none overflow-hidden bg-zinc-950 select-none ${cursorClass}`}
    >
      <BoardToolbar scene={scene} isGm={role === "gm"} />

      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={finishInteraction}
        onMouseLeave={finishInteraction}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishInteraction}
      >
        {/* Camada 1: Mapa + Grade (listening=false para performance máxima) */}
        <Layer listening={false}>
          <MapLayer scene={scene} />
          <GridLayer scene={scene} />
        </Layer>

        {/* Camada 2: Tokens */}
        <Layer>
          {renderedTokens.map((token) => {
            const remoteDrag = remoteTokenDrags[token.id];
            const displayX = remoteDrag ? remoteDrag.x : token.pos_x;
            const displayY = remoteDrag ? remoteDrag.y : token.pos_y;
            const canMove =
              tool === "select" && !spaceDown && canUserMoveToken(token);

            return (
              <TokenNode
                key={token.id}
                token={token}
                displayX={displayX}
                displayY={displayY}
                gridSize={scene.grid_size}
                snapEnabled={scene.snap_to_grid}
                canMove={canMove}
                isSelected={selectedTokenId === token.id}
                onSelect={setSelectedTokenId}
                onDragStart={handleTokenDragStart}
                onDragMove={handleTokenDragMove}
                onDragEnd={handleTokenDragEnd}
              />
            );
          })}
        </Layer>

        {/* Camada 3: Régua de Medição */}
        <Layer listening={false}>
          <RulerLayer
            localRuler={localRuler}
            remoteRulers={remoteRulers}
            sceneId={scene.id}
            gridSize={scene.grid_size}
            metersPerCell={scene.meters_per_cell}
            rule={scene.distance_rule}
          />
        </Layer>
      </Stage>

      {/* Dica de controles no rodapé do tabuleiro */}
      <div className="pointer-events-none absolute bottom-3 left-4 z-10 hidden rounded-lg border border-zinc-800/80 bg-zinc-900/80 px-3 py-1.5 text-[11px] text-zinc-400 backdrop-blur sm:block">
        Scroll: Zoom · Botão do meio ou Espaço+Arrastar: Pan · Régua (R): Medir distância
      </div>
    </div>
  );
}
