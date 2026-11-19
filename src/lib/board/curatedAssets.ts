export interface CuratedMapItem {
  id: string;
  title: string;
  category: "Taverna" | "Santuário" | "Montanha" | "Sala Modular" | "Trem & Selva";
  url: string;
  cols: number;
  rows: number;
  description: string;
}

export interface CuratedVfxItem {
  id: string;
  label: string;
  category: "Fogo & Braseiros" | "Magia & Brilhos" | "Vagalumes & Natureza" | "Água & Atmosfera";
  url: string;
  defaultCells: number;
}

export interface CuratedTokenItem {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface CuratedItemProp {
  id: string;
  label: string;
  url: string;
  cols: number;
  rows: number;
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
  // Salas modulares de Fortaleza / Bastion (encaixe livre!)
  {
    id: "bastion-salao",
    title: "Salão / Sala de Estar",
    category: "Sala Modular",
    url: "/curated-maps/bastion-salao-6x6.png",
    cols: 6,
    rows: 6,
    description: "Sala acolhedora modular para montar casas e mansões.",
  },
  {
    id: "bastion-jantar",
    title: "Sala de Jantar",
    category: "Sala Modular",
    url: "/curated-maps/bastion-jantar-7x6.png",
    cols: 7,
    rows: 6,
    description: "Mesa longa de banquetes para mansões ou guildas.",
  },
  {
    id: "bastion-cozinha",
    title: "Cozinha & Despensa",
    category: "Sala Modular",
    url: "/curated-maps/bastion-cozinha-6x7.png",
    cols: 6,
    rows: 7,
    description: "Cozinha equipada em madeira para estalagens e castelos.",
  },
  {
    id: "bastion-quarto",
    title: "Quarto Nobre",
    category: "Sala Modular",
    url: "/curated-maps/bastion-quarto-5x4.png",
    cols: 5,
    rows: 4,
    description: "Aposento com camas e mobília para encaixar no mapa.",
  },
  {
    id: "bastion-patio",
    title: "Pátio Interno",
    category: "Sala Modular",
    url: "/curated-maps/bastion-patio-6x6.png",
    cols: 6,
    rows: 6,
    description: "Área aberta central para pátio ou jardim de fortaleza.",
  },
  {
    id: "bastion-deposito",
    title: "Depósito / Armazém",
    category: "Sala Modular",
    url: "/curated-maps/bastion-deposito-5x4.png",
    cols: 5,
    rows: 4,
    description: "Sala com caixas, barris e suprimentos.",
  },
  {
    id: "bastion-museu",
    title: "Sala Museu",
    category: "Sala Modular",
    url: "/curated-maps/sala-museu-7x5.png",
    cols: 7,
    rows: 5,
    description: "Sala modular em madeira com vitrines de relíquias.",
  },
  {
    id: "bastion-cofre",
    title: "Câmara do Cofre",
    category: "Sala Modular",
    url: "/curated-maps/sala-cofre-4x4.png",
    cols: 4,
    rows: 4,
    description: "Câmara fortificada com tesouros e baús.",
  },
  {
    id: "bastion-varanda",
    title: "Varanda de Madeira",
    category: "Sala Modular",
    url: "/curated-maps/bastion-varanda-3x5.png",
    cols: 3,
    rows: 5,
    description: "Varanda lateral para encaixar em fachadas.",
  },
  {
    id: "bastion-leme",
    title: "Ponte de Comando / Leme",
    category: "Sala Modular",
    url: "/curated-maps/bastion-leme-4x5.png",
    cols: 4,
    rows: 5,
    description: "Cabine de comando para dirigíveis ou embarcações.",
  },
  // Trem Arcano & Ruínas
  {
    id: "trem-locomotiva",
    title: "Trem: Locomotiva",
    category: "Trem & Selva",
    url: "/curated-maps/trem-locomotiva-14x5.png",
    cols: 14,
    rows: 5,
    description: "Vagão frontal da locomotiva arcana (encaixe em linha).",
  },
  {
    id: "trem-restaurante",
    title: "Trem: Vagão Restaurante",
    category: "Trem & Selva",
    url: "/curated-maps/trem-restaurante-14x5.png",
    cols: 14,
    rows: 5,
    description: "Vagão luxuoso de refeições para emboscadas em movimento.",
  },
  {
    id: "trem-primeira-classe",
    title: "Trem: Primeira Classe",
    category: "Trem & Selva",
    url: "/curated-maps/trem-primeira-classe-14x5.png",
    cols: 14,
    rows: 5,
    description: "Cabines privadas de passageiros.",
  },
  {
    id: "trem-carga",
    title: "Trem: Vagão de Carga",
    category: "Trem & Selva",
    url: "/curated-maps/trem-carga-14x5.png",
    cols: 14,
    rows: 5,
    description: "Vagão cheio de caixotes para cobertura tática.",
  },
  {
    id: "ruinas-selva",
    title: "Ruínas na Selva",
    category: "Trem & Selva",
    url: "/curated-maps/ruinas-selva-8x6.png",
    cols: 8,
    rows: 6,
    description: "Bloco tático de ruínas antigas tomadas pela mata.",
  },
  {
    id: "ruinas-altar",
    title: "Altar na Selva",
    category: "Trem & Selva",
    url: "/curated-maps/ruinas-altar-6x6.png",
    cols: 6,
    rows: 6,
    description: "Pequeno santuário em ruínas para encontros rápidos.",
  },
  {
    id: "ruinas-pedra",
    title: "Muralha em Ruínas",
    category: "Trem & Selva",
    url: "/curated-maps/ruinas-pedra-10x6.png",
    cols: 10,
    rows: 6,
    description: "Ruínas de pedra para encaixar em qualquer mapa.",
  },
];

// Todos os 27 efeitos animados .webm de FA_Animations_01
export const CURATED_VFX_ANIMATIONS: readonly CuratedVfxItem[] = [
  // Fogo & Braseiros
  {
    id: "fire-brazier-1",
    label: "🔥 Braseiro Flamejante 1",
    category: "Fogo & Braseiros",
    url: "/vfx/Fire_Brazier_A1_01.webm",
    defaultCells: 1.5,
  },
  {
    id: "fire-brazier-2",
    label: "🔥 Braseiro Flamejante 2",
    category: "Fogo & Braseiros",
    url: "/vfx/Fire_Brazier_A1_02.webm",
    defaultCells: 1.5,
  },
  {
    id: "fire-brazier-3",
    label: "🔥 Braseiro Intenso",
    category: "Fogo & Braseiros",
    url: "/vfx/Fire_Brazier_A1_03.webm",
    defaultCells: 1.5,
  },
  {
    id: "campfire-1",
    label: "🏕️ Fogueira Clássica",
    category: "Fogo & Braseiros",
    url: "/vfx/Fire_CampfireMask_A1_01.webm",
    defaultCells: 2,
  },
  {
    id: "campfire-2",
    label: "🏕️ Fogueira Viva",
    category: "Fogo & Braseiros",
    url: "/vfx/Fire_CampfireMask_A1_02.webm",
    defaultCells: 2,
  },
  {
    id: "campfire-3",
    label: "🏕️ Fogueira Grande",
    category: "Fogo & Braseiros",
    url: "/vfx/Fire_CampfireMask_A2_03.webm",
    defaultCells: 2.5,
  },
  // Magia & Brilhos
  {
    id: "sparkles-a1-1",
    label: "✨ Brilho Mágico 1",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A1_01.webm",
    defaultCells: 2,
  },
  {
    id: "sparkles-a1-2",
    label: "✨ Brilho Mágico 2",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A1_02.webm",
    defaultCells: 2,
  },
  {
    id: "sparkles-a1-3",
    label: "✨ Brilho Mágico 3",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A1_03.webm",
    defaultCells: 2,
  },
  {
    id: "sparkles-a2-1",
    label: "🌟 Centelhas Arcanas 1",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A2_01.webm",
    defaultCells: 2,
  },
  {
    id: "sparkles-a2-2",
    label: "🌟 Centelhas Arcanas 2",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A2_02.webm",
    defaultCells: 2,
  },
  {
    id: "sparkles-a2-3",
    label: "🌟 Centelhas Arcanas 3",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A2_03.webm",
    defaultCells: 2,
  },
  {
    id: "sparkles-a3-1",
    label: "💫 Aura Estelar 1",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A3_01.webm",
    defaultCells: 3,
  },
  {
    id: "sparkles-a3-2",
    label: "💫 Aura Estelar 2",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A3_02.webm",
    defaultCells: 3,
  },
  {
    id: "sparkles-a3-3",
    label: "💫 Aura Estelar 3",
    category: "Magia & Brilhos",
    url: "/vfx/Sparkles_A3_03.webm",
    defaultCells: 3,
  },
  // Vagalumes & Natureza
  {
    id: "fireflies-1",
    label: "🪲 Vagalumes Dourados 1",
    category: "Vagalumes & Natureza",
    url: "/vfx/Fireflies_A1_01.webm",
    defaultCells: 4,
  },
  {
    id: "fireflies-2",
    label: "🪲 Vagalumes Dourados 2",
    category: "Vagalumes & Natureza",
    url: "/vfx/Fireflies_A1_02.webm",
    defaultCells: 3,
  },
  {
    id: "fireflies-3",
    label: "🪲 Vagalumes Verdes 1",
    category: "Vagalumes & Natureza",
    url: "/vfx/Fireflies_A2_01.webm",
    defaultCells: 4,
  },
  {
    id: "fireflies-4",
    label: "🪲 Vagalumes Verdes 2",
    category: "Vagalumes & Natureza",
    url: "/vfx/Fireflies_A2_02.webm",
    defaultCells: 3,
  },
  {
    id: "spores-1",
    label: "🍄 Esporos da Caverna 1",
    category: "Vagalumes & Natureza",
    url: "/vfx/Spores_A1_01.webm",
    defaultCells: 4,
  },
  {
    id: "spores-2",
    label: "🍄 Esporos Densos 2",
    category: "Vagalumes & Natureza",
    url: "/vfx/Spores_A2_01.webm",
    defaultCells: 5,
  },
  {
    id: "flies-1",
    label: "🪰 Enxame de Moscas",
    category: "Vagalumes & Natureza",
    url: "/vfx/Flies_A1_01.webm",
    defaultCells: 2,
  },
  // Água & Atmosfera
  {
    id: "dust-1",
    label: "🌫️ Poeira / Feixe de Luz",
    category: "Água & Atmosfera",
    url: "/vfx/DustParticles_A1_01.webm",
    defaultCells: 5,
  },
  {
    id: "water-1",
    label: "💧 Ondas / Goteiras 1",
    category: "Água & Atmosfera",
    url: "/vfx/Water_Droplets_A1_01.webm",
    defaultCells: 2,
  },
  {
    id: "water-2",
    label: "💧 Ondas / Goteiras 2",
    category: "Água & Atmosfera",
    url: "/vfx/Water_Droplets_A2_01.webm",
    defaultCells: 2,
  },
  {
    id: "water-3",
    label: "💧 Ondas / Goteiras 3",
    category: "Água & Atmosfera",
    url: "/vfx/Water_Droplets_A3_01.webm",
    defaultCells: 2,
  },
  {
    id: "water-4",
    label: "💧 Ondas / Goteiras 4",
    category: "Água & Atmosfera",
    url: "/vfx/Water_Droplets_A4_01.webm",
    defaultCells: 2,
  },
];

export const CURATED_CREATURE_TOKENS: readonly CuratedTokenItem[] = [
  { id: "tok-gryphon", name: "Grifo", url: "/curated-tokens/gryphon.png", size: 2 },
  { id: "tok-hydra", name: "Hidra", url: "/curated-tokens/hydra-2h.png", size: 3 },
  { id: "tok-manticore", name: "Mantícora", url: "/curated-tokens/manticore.png", size: 2 },
  { id: "tok-gorgon", name: "Górgona", url: "/curated-tokens/gorgon.png", size: 2 },
  { id: "tok-capricorn", name: "Capricórnio", url: "/curated-tokens/capricorn.png", size: 2 },
  { id: "tok-statue", name: "Estátua de Grifo", url: "/curated-tokens/gryphon-statue.png", size: 2 },
];

export const CURATED_ADVENTURE_ITEMS: readonly CuratedItemProp[] = [
  { id: "it-lanterna", label: "🏮 Lanterna Arcana", url: "/curated-items/lanterna-gema.png", cols: 1, rows: 1 },
  { id: "it-tocha", label: "🔥 Tocha de Parede", url: "/curated-items/tocha-parede.png", cols: 1, rows: 1 },
  { id: "it-bancada", label: "🛠️ Bancada de Artífice", url: "/curated-items/bancada-artifice.png", cols: 2, rows: 1 },
  { id: "it-martelo", label: "🔨 Martelo Clerical", url: "/curated-items/martelo-clerical.png", cols: 1, rows: 1 },
  { id: "it-cajado", label: "🌿 Cajado Druídico", url: "/curated-items/cajado-druidico.png", cols: 1, rows: 1 },
  { id: "it-oculos", label: "🥽 Óculos de Artífice", url: "/curated-items/oculos-artifice.png", cols: 1, rows: 1 },
  { id: "it-simbolo", label: "☀️ Símbolo Sagrado", url: "/curated-items/simbolo-sagrado.png", cols: 1, rows: 1 },
  { id: "it-cubo", label: "🧊 Cubo Protetor", url: "/curated-items/cubo-arcano.png", cols: 1, rows: 1 },
];

export const DM_SCREEN_PAGES: readonly string[] = Array.from(
  { length: 8 },
  (_, i) => `/dm-screen/page-${i + 1}.jpg`
);
