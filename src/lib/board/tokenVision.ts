import type { Token } from "@/types/domain";

/**
 * Calcula quantos metros de visão/luz efetiva um token projeta para recortar
 * Névoa e Escuridão. Evita que o valor padrão de banco (18m = 12 quadrados)
 * abra um raio gigante desproporcional em tokens comuns ou de monstros do Mestre.
 */
export function computeTokenRevealMeters(
  token: Token,
  options: {
    gmUserIds: string[];
    isGm: boolean;
    gmPreviewVision: boolean;
    selectedTokenId: string | null;
  }
): number {
  const { gmUserIds, isGm, gmPreviewVision, selectedTokenId } = options;

  if (
    token.is_hidden &&
    !(isGm && gmPreviewVision && token.id === selectedTokenId)
  ) {
    return 0;
  }

  const hasTorch = (token.light_radius ?? 0) > 0;
  if (hasTorch) {
    return token.light_radius ?? 12;
  }

  const isPlayerToken =
    Boolean(token.character_id) ||
    (token.owner_id !== null && !gmUserIds.includes(token.owner_id));
  const explicitVision = token.vision_range ?? 0;

  if (isPlayerToken) {
    if (explicitVision <= 0) return 0;
    return explicitVision === 18 ? 4.5 : explicitVision;
  }

  if (explicitVision > 0 && explicitVision !== 18) {
    return explicitVision;
  }

  if (isGm && gmPreviewVision && token.id === selectedTokenId) {
    const previewBase = explicitVision === 18 ? 4.5 : explicitVision || 4.5;
    return Math.min(Math.max(previewBase, 1.5), 9);
  }

  return 0;
}
