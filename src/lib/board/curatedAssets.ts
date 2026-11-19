export interface CuratedMapItem {
  id: string;
  title: string;
  category: "Taverna" | "Santuário" | "Montanha" | "Sala Modular";
  url: string;
  cols: number;
  rows: number;
  description: string;
}

export interface CuratedVfxItem {
  id: string;
  label: string;
  category: "Fogo & Luz" | "Magia" | "Ambiente";
  url: string;
  defaultCells: number;
}

export const CURATED_BATTLEMAPS: readonly CuratedMapItem[] = [
  {
    id: "taverna-sieben",
    title: "Taverna Sieben (Salão)",
    category: "Taverna",
    url: "/curated-maps/taverna-sieben-34x22.jpg",
    cols: 34,
    rows: 22,
    description: "Estalagem detalhada com salão principal, balcão e mesas.",
  },
  {
    id: "monasterio-montanha",
    title: "Monastério na Montanha",
    category: "Montanha",
    url: "/curated-maps/monasterio-montanha-34x22.jpg",
    cols: 34,
    rows: 22,
    description: "Portão de entrada em rocha elevada e escadarias de pedra.",
  },
  {
    id: "templo-corrupcao",
    title: "Santuário da Corrupção",
    category: "Santuário",
    url: "/curated-maps/templo-corrupcao-34x22.jpg",
    cols: 34,
    rows: 22,
    description: "Templo sombrio ideal para cultos, mortos-vivos e chefes.",
  },
  {
    id: "santuario-sangue",
    title: "Altar do Abismo de Sangue",
    category: "Santuário",
    url: "/curated-maps/santuario-sangue-44x34.jpg",
    cols: 44,
    rows: 34,
    description: "Câmara ritual ampla sobre abismo para combates épicos.",
  },
  {
    id: "sala-museu",
    title: "Bastion: Sala Museu",
    category: "Sala Modular",
    url: "/curated-maps/sala-museu-7x5.png",
    cols: 7,
    rows: 5,
    description: "Sala modular em madeira com vitrines de relíquias.",
  },
  {
    id: "sala-cofre",
    title: "Bastion: Câmara do Cofre",
    category: "Sala Modular",
    url: "/curated-maps/sala-cofre-4x4.png",
    cols: 4,
    rows: 4,
    description: "Sala modular fortificada com tesouros e baús.",
  },
];

export const CURATED_VFX_ANIMATIONS: readonly CuratedVfxItem[] = [
  {
    id: "fire-brazier-1",
    label: "🔥 Braseiro Flamejante",
    category: "Fogo & Luz",
    url: "/vfx/Fire_Brazier_A1_01.webm",
    defaultCells: 1.5,
  },
  {
    id: "fire-brazier-2",
    label: "🔥 Braseiro Intenso",
    category: "Fogo & Luz",
    url: "/vfx/Fire_Brazier_A1_03.webm",
    defaultCells: 1.5,
  },
  {
    id: "campfire-1",
    label: "🏕️ Fogueira de Acampamento",
    category: "Fogo & Luz",
    url: "/vfx/Fire_CampfireMask_A1_01.webm",
    defaultCells: 2,
  },
  {
    id: "campfire-2",
    label: "🏕️ Fogueira Alta",
    category: "Fogo & Luz",
    url: "/vfx/Fire_CampfireMask_A2_03.webm",
    defaultCells: 2,
  },
  {
    id: "sparkles-gold",
    label: "✨ Brilho Arcano",
    category: "Magia",
    url: "/vfx/Sparkles_A1_01.webm",
    defaultCells: 2,
  },
  {
    id: "sparkles-aura",
    label: "💫 Aura Cintilante",
    category: "Magia",
    url: "/vfx/Sparkles_A3_01.webm",
    defaultCells: 2.5,
  },
  {
    id: "fireflies-1",
    label: "🪲 Vagalumes da Floresta",
    category: "Ambiente",
    url: "/vfx/Fireflies_A1_01.webm",
    defaultCells: 4,
  },
  {
    id: "spores-1",
    label: "🍄 Esporos de Caverna",
    category: "Ambiente",
    url: "/vfx/Spores_A1_01.webm",
    defaultCells: 4,
  },
  {
    id: "dust-1",
    label: "🌫️ Poeira / Luz Solar",
    category: "Ambiente",
    url: "/vfx/DustParticles_A1_01.webm",
    defaultCells: 5,
  },
  {
    id: "water-drops",
    label: "💧 Goteiras / Água",
    category: "Ambiente",
    url: "/vfx/Water_Droplets_A1_01.webm",
    defaultCells: 2,
  },
];

export const DM_SCREEN_PAGES: readonly string[] = Array.from(
  { length: 8 },
  (_, i) => `/dm-screen/page-${i + 1}.jpg`
);
