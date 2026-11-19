export type BestiaryCategory = "heroes" | "monsters" | "spells_props";

export interface BestiaryAttackPreset {
  name: string;
  attackBonus: number;
  damageFormula: string;
  damageType: string;
  rangeOrNotes?: string;
}

export interface BestiaryEntry {
  id: string;
  category: BestiaryCategory;
  name: string;
  subtitle: string;
  size: 1 | 2 | 3 | 4;
  hpMax: number;
  armorClass: number;
  avatarUrl: string;
  classOrArchetype?: string;
  ancestryOrRace?: string;
  speed?: string;
  attacks?: BestiaryAttackPreset[];
  isCustom?: boolean;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function buildSpellAoeSvg(params: {
  primary: string;
  secondary: string;
  label: string;
  innerPattern: string;
}): string {
  const { primary, secondary, label, innerPattern } = params;
  return svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
      <defs>
        <radialGradient id="aoe" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${primary}" stop-opacity="0.55" />
          <stop offset="70%" stop-color="${secondary}" stop-opacity="0.32" />
          <stop offset="100%" stop-color="${primary}" stop-opacity="0.75" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r="74" fill="url(#aoe)" stroke="${primary}" stroke-width="3" stroke-dasharray="8 4" />
      <circle cx="80" cy="80" r="58" fill="none" stroke="${primary}" stroke-opacity="0.6" stroke-width="1.5" />
      ${innerPattern}
      <text x="80" y="84" text-anchor="middle" fill="#ffffff" font-family="serif" font-weight="bold" font-size="13" opacity="0.9">${label}</text>
    </svg>
  `);
}

export const FORGOTTEN_REALMS_BESTIARY: BestiaryEntry[] = [
  // ==========================================================================
  // HERÓIS DE FAERÛN (com avatares reais do Pacote)
  // ==========================================================================
  {
    id: "hero-warrior",
    category: "heroes",
    name: "Guerreiro da Costa da Espada",
    subtitle: "Humano · CA 18 · Espada Longa & Escudo",
    size: 1,
    hpMax: 28,
    armorClass: 18,
    classOrArchetype: "Guerreiro",
    ancestryOrRace: "Humano",
    speed: "9m",
    avatarUrl: "/icons/humans/humans-male/contemplative-warrior-in-forest.png",
    attacks: [
      {
        name: "Espada Longa",
        attackBonus: 6,
        damageFormula: "1d8+4",
        damageType: "Cortante",
        rangeOrNotes: "Corpo a corpo",
      },
    ],
  },
  {
    id: "hero-paladin",
    category: "heroes",
    name: "Paladino de Tyr",
    subtitle: "Anão / Campeão · CA 19 · Martelo Sagrado",
    size: 1,
    hpMax: 32,
    armorClass: 19,
    classOrArchetype: "Paladino",
    ancestryOrRace: "Anão",
    speed: "7,5m",
    avatarUrl: "/icons/dwarves/dwarf-paladin-2.png",
    attacks: [
      {
        name: "Martelo de Guerra + Smite",
        attackBonus: 6,
        damageFormula: "1d8+3",
        damageType: "Concussão",
        rangeOrNotes: "+2d8 Radiante",
      },
    ],
  },
  {
    id: "hero-wizard",
    category: "heroes",
    name: "Arquimago de Waterdeep",
    subtitle: "Humano · CA 13 · Escola de Evocação",
    size: 1,
    hpMax: 22,
    armorClass: 13,
    classOrArchetype: "Mago (Evocação)",
    ancestryOrRace: "Humano",
    speed: "9m",
    avatarUrl: "/icons/humans/humans-male/arcane-conjurer.png",
    attacks: [
      {
        name: "Raio de Fogo",
        attackBonus: 6,
        damageFormula: "2d10",
        damageType: "Fogo",
        rangeOrNotes: "36m",
      },
    ],
  },
  {
    id: "hero-rogue",
    category: "heroes",
    name: "Ladina das Sombras",
    subtitle: "Tiefling · CA 16 · Adagas Envenenadas",
    size: 1,
    hpMax: 24,
    armorClass: 16,
    classOrArchetype: "Ladino",
    ancestryOrRace: "Tiefling",
    speed: "9m",
    avatarUrl: "/icons/tieflings/tiefling-blood-hunter.png",
    attacks: [
      {
        name: "Adaga Furtiva",
        attackBonus: 6,
        damageFormula: "1d4+4",
        damageType: "Perfurante",
        rangeOrNotes: "+2d6 Furtivo",
      },
    ],
  },
  {
    id: "hero-cleric",
    category: "heroes",
    name: "Clériga de Selûne",
    subtitle: "Anã do Escudo · CA 18 · Domínio da Luz",
    size: 1,
    hpMax: 27,
    armorClass: 18,
    classOrArchetype: "Clériga",
    ancestryOrRace: "Anã",
    speed: "7,5m",
    avatarUrl: "/icons/dwarves/dwarf-cleric-with-hammer.png",
    attacks: [
      {
        name: "Maça Sagrada",
        attackBonus: 5,
        damageFormula: "1d6+3",
        damageType: "Concussão",
      },
    ],
  },
  {
    id: "hero-ranger",
    category: "heroes",
    name: "Patrulheiro de Cormyr",
    subtitle: "Elfo da Floresta · CA 16 · Arco Longo",
    size: 1,
    hpMax: 28,
    armorClass: 16,
    classOrArchetype: "Patrulheiro",
    ancestryOrRace: "Elfo da Floresta",
    speed: "10,5m",
    avatarUrl: "/icons/d-and-d-iconic-characters/varis-silverymoon-ranger.png",
    attacks: [
      {
        name: "Arco Longo",
        attackBonus: 7,
        damageFormula: "1d8+4",
        damageType: "Perfurante",
        rangeOrNotes: "45m / 180m",
      },
    ],
  },
  {
    id: "hero-barbarian",
    category: "heroes",
    name: "Bárbaro do Vento Gélido",
    subtitle: "Guerreiro Nórdico · CA 15 · Machado Grande",
    size: 1,
    hpMax: 38,
    armorClass: 15,
    classOrArchetype: "Bárbaro",
    ancestryOrRace: "Humano",
    speed: "12m",
    avatarUrl: "/icons/humans/humans-male/enraged-barbarian.png",
    attacks: [
      {
        name: "Machado Grande (Fúria)",
        attackBonus: 6,
        damageFormula: "1d12+4",
        damageType: "Cortante",
      },
    ],
  },
  {
    id: "hero-bard",
    category: "heroes",
    name: "Bardo de Baldur's Gate",
    subtitle: "Meio-Elfo · CA 15 · Colégio do Conhecimento",
    size: 1,
    hpMax: 24,
    armorClass: 15,
    classOrArchetype: "Bardo",
    ancestryOrRace: "Meio-Elfo",
    speed: "9m",
    avatarUrl: "/icons/elves-and-half-elves/half-elf-bard.png",
    attacks: [
      {
        name: "Rapieira",
        attackBonus: 5,
        damageFormula: "1d8+3",
        damageType: "Perfurante",
      },
    ],
  },

  // ==========================================================================
  // BESTIÁRIO DE MONSTROS (D&D 5e / FORGOTTEN REALMS)
  // ==========================================================================
  {
    id: "monster-goblin",
    category: "monsters",
    name: "Goblin Saqueador",
    subtitle: "Pequeno (1x1) · ND 1/4 · CA 15 · 7 PV",
    size: 1,
    hpMax: 7,
    armorClass: 15,
    classOrArchetype: "Humanoide (Goblin)",
    ancestryOrRace: "Goblin",
    speed: "9m",
    avatarUrl: "/icons/goblins-goblinoids/goblin-1.png",
    attacks: [
      {
        name: "Cimitarra",
        attackBonus: 4,
        damageFormula: "1d6+2",
        damageType: "Cortante",
      },
      {
        name: "Arco Curto",
        attackBonus: 4,
        damageFormula: "1d6+2",
        damageType: "Perfurante",
        rangeOrNotes: "24m / 96m",
      },
    ],
  },
  {
    id: "monster-skeleton",
    category: "monsters",
    name: "Esqueleto da Cripta",
    subtitle: "Morto-Vivo (1x1) · ND 1/4 · CA 13 · 13 PV",
    size: 1,
    hpMax: 13,
    armorClass: 13,
    classOrArchetype: "Morto-Vivo",
    ancestryOrRace: "Esqueleto",
    speed: "9m",
    avatarUrl: "/icons/undead-misc/armored-undead-general.png",
    attacks: [
      {
        name: "Espada Curta",
        attackBonus: 4,
        damageFormula: "1d6+2",
        damageType: "Perfurante",
      },
    ],
  },
  {
    id: "monster-orc",
    category: "monsters",
    name: "Orc de Gruumsh",
    subtitle: "Médio (1x1) · ND 1/2 · CA 13 · 15 PV",
    size: 1,
    hpMax: 15,
    armorClass: 13,
    classOrArchetype: "Humanoide (Orc)",
    ancestryOrRace: "Orc",
    speed: "9m",
    avatarUrl: "/icons/orcs-and-half-orcs/determined-orc-fighter.png",
    attacks: [
      {
        name: "Machado Grande",
        attackBonus: 5,
        damageFormula: "1d12+3",
        damageType: "Cortante",
      },
    ],
  },
  {
    id: "monster-mimic",
    category: "monsters",
    name: "Mímico Devorador",
    subtitle: "Metamorfo (1x1) · ND 2 · CA 12 · 58 PV",
    size: 1,
    hpMax: 58,
    armorClass: 12,
    classOrArchetype: "Monstruosidade",
    ancestryOrRace: "Mímico",
    speed: "4,5m",
    avatarUrl: "/icons/abberations/abberant-maw.png",
    attacks: [
      {
        name: "Mordida / Pseudópode",
        attackBonus: 5,
        damageFormula: "1d8+3",
        damageType: "Perfurante",
        rangeOrNotes: "+1d8 Ácido",
      },
    ],
  },
  {
    id: "monster-mindflayer",
    category: "monsters",
    name: "Devorador de Mentes (Illithid)",
    subtitle: "Aberração (1x1) · ND 7 · CA 15 · 71 PV",
    size: 1,
    hpMax: 71,
    armorClass: 15,
    classOrArchetype: "Aberração",
    ancestryOrRace: "Illithid",
    speed: "9m",
    avatarUrl: "/icons/abberations/mind-flayer-1.png",
    attacks: [
      {
        name: "Tentáculos",
        attackBonus: 7,
        damageFormula: "2d10+4",
        damageType: "Psíquico",
      },
    ],
  },
  {
    id: "monster-ogre",
    category: "monsters",
    name: "Ogro Brutamonte",
    subtitle: "Grande (2x2) · ND 2 · CA 11 · 59 PV",
    size: 2,
    hpMax: 59,
    armorClass: 11,
    classOrArchetype: "Gigante",
    ancestryOrRace: "Ogro",
    speed: "12m",
    avatarUrl: "/icons/miscellaneous-monsters/onnake-ogre.png",
    attacks: [
      {
        name: "Clava Grande",
        attackBonus: 6,
        damageFormula: "2d8+4",
        damageType: "Concussão",
      },
    ],
  },
  {
    id: "monster-beholder",
    category: "monsters",
    name: "Observador (Beholder)",
    subtitle: "Aberração Grande (2x2) · ND 13 · CA 18 · 180 PV",
    size: 2,
    hpMax: 180,
    armorClass: 18,
    classOrArchetype: "Aberração",
    ancestryOrRace: "Observador",
    speed: "0m (Voo 6m)",
    avatarUrl: "/icons/abberations/beholder.png",
    attacks: [
      {
        name: "Mordida / Raios Oculares",
        attackBonus: 5,
        damageFormula: "4d6",
        damageType: "Cortante",
      },
    ],
  },
  {
    id: "monster-red-dragon",
    category: "monsters",
    name: "Dragão Vermelho Adulto",
    subtitle: "Imenso (3x3) · ND 17 · CA 19 · 256 PV",
    size: 3,
    hpMax: 256,
    armorClass: 19,
    classOrArchetype: "Dragão",
    ancestryOrRace: "Dragão Vermelho",
    speed: "12m (Voo 24m)",
    avatarUrl: "/icons/dragons/red-dragon-1.png",
    attacks: [
      {
        name: "Mordida Dracônica",
        attackBonus: 14,
        damageFormula: "2d10+8",
        damageType: "Perfurante",
        rangeOrNotes: "+2d6 Fogo",
      },
    ],
  },

  // ==========================================================================
  // TEMPLATES DE MAGIA DE ÁREA (AoE) & PROPS DE CENÁRIO
  // ==========================================================================
  {
    id: "aoe-fireball",
    category: "spells_props",
    name: "🔥 Bola de Fogo (Esfera 6m)",
    subtitle: "Template de Magia 4x4 · Evocação 3º Círculo (8d6)",
    size: 4,
    hpMax: 1,
    armorClass: 10,
    avatarUrl: buildSpellAoeSvg({
      primary: "#f97316",
      secondary: "#dc2626",
      label: "BOLA DE FOGO",
      innerPattern: `<circle cx="80" cy="80" r="34" fill="rgba(254,240,138,0.45)" />`,
    }),
  },
  {
    id: "aoe-aura-paladin",
    category: "spells_props",
    name: "✨ Aura de Proteção / Guardiões",
    subtitle: "Template de Magia 3x3 · Emanação Sagrada (3m)",
    size: 3,
    hpMax: 1,
    armorClass: 10,
    avatarUrl: buildSpellAoeSvg({
      primary: "#fbbf24",
      secondary: "#fef08a",
      label: "AURA SAGRADA",
      innerPattern: `<polygon points="80,22 95,62 138,80 95,98 80,138 65,98 22,80 65,62" fill="none" stroke="#fef08a" stroke-width="2"/>`,
    }),
  },
  {
    id: "aoe-frost-sphere",
    category: "spells_props",
    name: "❄️ Tempestade de Gelo",
    subtitle: "Template de Magia 3x3 · Terreno Congelado",
    size: 3,
    hpMax: 1,
    armorClass: 10,
    avatarUrl: buildSpellAoeSvg({
      primary: "#38bdf8",
      secondary: "#0284c7",
      label: "TEMPESTADE GELO",
      innerPattern: `<line x1="30" y1="80" x2="130" y2="80" stroke="#e0f2fe" stroke-width="2"/><line x1="80" y1="30" x2="80" y2="130" stroke="#e0f2fe" stroke-width="2"/>`,
    }),
  },
  {
    id: "prop-treasure-chest",
    category: "spells_props",
    name: "📦 Baú de Tesouro Arcano",
    subtitle: "Objeto de Cenário (1x1) · Trancado (CD 15)",
    size: 1,
    hpMax: 25,
    armorClass: 15,
    avatarUrl: "/icons/items/magic-vault.png",
  },
];
