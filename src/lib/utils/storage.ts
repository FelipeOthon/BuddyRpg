"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface UploadedImageInfo {
  publicUrl: string;
  width: number;
  height: number;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const width = img.naturalWidth || 2000;
      const height = img.naturalHeight || 2000;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler as dimensões da imagem."));
    };
    img.src = url;
  });
}

export async function uploadCampaignImage(params: {
  bucket: "maps" | "tokens";
  campaignId: string;
  file: File;
}): Promise<UploadedImageInfo> {
  const { bucket, campaignId, file } = params;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato inválido. Use imagens PNG, JPG ou WebP.");
  }

  const maxBytes = bucket === "maps" ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      bucket === "maps"
        ? "A imagem do mapa deve ter no máximo 10 MB."
        : "A imagem do token deve ter no máximo 2 MB."
    );
  }

  const { width, height } = await getImageDimensions(file);
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
  const path = `${campaignId}/${crypto.randomUUID()}.${safeExt}`;

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    publicUrl,
    width: Math.min(Math.max(width, 200), 10000),
    height: Math.min(Math.max(height, 200), 10000),
  };
}

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
];

const ALLOWED_AUDIO_EXTS = ["mp3", "ogg", "wav", "webm", "m4a", "mp4", "aac"];

export async function uploadCampaignAudio(params: {
  campaignId: string;
  file: File;
}): Promise<{ publicUrl: string; title: string }> {
  const { campaignId, file } = params;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (
    (!file.type || !ALLOWED_AUDIO_TYPES.includes(file.type)) &&
    !ALLOWED_AUDIO_EXTS.includes(ext)
  ) {
    throw new Error(
      "Formato inválido. Envie áudio MP3, OGG, WAV, WebM ou M4A."
    );
  }

  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("O arquivo de áudio deve ter no máximo 20 MB.");
  }

  const safeExt = ALLOWED_AUDIO_EXTS.includes(ext) ? ext : "mp3";
  const path = `${campaignId}/${crypto.randomUUID()}.${safeExt}`;

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage.from("music").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "audio/mpeg",
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("music").getPublicUrl(path);

  const cleanTitle =
    file.name.replace(/\.[^.]+$/, "").trim().slice(0, 80) || "Faixa da Mesa";

  return { publicUrl, title: cleanTitle };
}
