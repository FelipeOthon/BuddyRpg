"use client";

import { useEffect, useRef } from "react";
import {
  exploredStorageKey,
  parseTrail,
  serializeTrail,
} from "@/lib/board/exploredSpots";
import { useBoardStore, type ExploredSpot } from "@/stores/boardStore";
import type { Scene } from "@/types/domain";

const EMPTY: ExploredSpot[] = [];

function usePersistedTrail(
  campaignId: string,
  sceneId: string,
  layer: "fog" | "darkness",
  epoch: number,
  spots: ExploredSpot[]
) {
  const setExploredMemory = useBoardStore((s) => s.setExploredMemory);
  const loadedKeyRef = useRef<string | null>(null);
  const key = `${sceneId}:${layer}:${epoch}`;

  // 1. Carrega rastro salvo (ou descarta se a "época" de reset mudou)
  useEffect(() => {
    let spotsFromStorage: ExploredSpot[] = [];
    try {
      spotsFromStorage = parseTrail(
        window.localStorage.getItem(
          exploredStorageKey(campaignId, sceneId, layer)
        ),
        epoch
      );
    } catch {
      // localStorage indisponível (modo privado, etc.)
    }
    loadedKeyRef.current = key;
    setExploredMemory(sceneId, layer, spotsFromStorage);
  }, [campaignId, sceneId, layer, epoch, key, setExploredMemory]);

  // 2. Salva (com debounce) sempre que o rastro mudar
  useEffect(() => {
    if (loadedKeyRef.current !== key) return;
    const timer = window.setTimeout(() => {
      try {
        const storageKey = exploredStorageKey(campaignId, sceneId, layer);
        if (spots.length === 0) {
          window.localStorage.removeItem(storageKey);
        } else {
          window.localStorage.setItem(storageKey, serializeTrail(spots, epoch));
        }
      } catch {
        // cota excedida ou indisponível: ignora silenciosamente
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [campaignId, sceneId, layer, epoch, key, spots]);
}

/**
 * Persiste o rastro de exploração da Névoa/Escuridão no navegador, invalidando-o
 * quando o Mestre reseta (época da cena muda) — assim nada "volta" ao recarregar.
 */
export function useExploredPersistence(scene: Scene) {
  const fogSpots = useBoardStore((s) => s.exploredMemory[scene.id]) ?? EMPTY;
  const darkSpots =
    useBoardStore((s) => s.exploredDarknessMemory[scene.id]) ?? EMPTY;

  usePersistedTrail(
    scene.campaign_id,
    scene.id,
    "fog",
    scene.fog_trail_epoch ?? 0,
    fogSpots
  );
  usePersistedTrail(
    scene.campaign_id,
    scene.id,
    "darkness",
    scene.darkness_trail_epoch ?? 0,
    darkSpots
  );
}
