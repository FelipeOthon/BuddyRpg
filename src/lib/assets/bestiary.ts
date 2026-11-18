export type BestiaryCategory = "heroes" | "monsters" | "spells_props";

export interface BestiaryEntry {
  id: string;
  category: BestiaryCategory;
  name: string;
  subtitle: string;
  size: 1 | 2 | 3 | 4;
  hpMax: number;
  armorClass: number;
  avatarUrl: string;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function buildPortraitSvg(params: {
  bgFrom: string;
  bgTo: string;
  ringColor: string;
  iconSvg: string;
  badgeText?: string;
}): string {
  const { bgFrom, bgTo, ringColor, iconSvg, badgeText } = params;
  return svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <radialGradient id="bg" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stop-color="${bgFrom}" />
          <stop offset="100%" stop-color="${bgTo}" />
        </radialGradient>
        <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="${ringColor}" />
          <stop offset="100%" stop-color="#78350f" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#bg)" stroke="url(#rim)" stroke-width="6" />
      <circle cx="60" cy="60" r="49" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="4 3" />
      <g transform="translate(0, 0)">
        ${iconSvg}
      </g>
      ${
        badgeText
          ? `<rect x="26" y="88" width="68" height="18" rx="9" fill="rgba(9,9,11,0.85)" stroke="${ringColor}" stroke-width="1.5"/>
             <text x="60" y="100" text-anchor="middle" fill="#fef3c7" font-family="serif" font-weight="bold" font-size="10">${badgeText}</text>`
          : ""
      }
    </svg>
  `);
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
  // HERÓIS DE FAERÛN
  // ==========================================================================
  {
    id: "hero-warrior",
    category: "heroes",
    name: "Guerreiro da Costa da Espada",
    subtitle: "Humano · CA 18 · Espada Longa & Escudo",
    size: 1,
    hpMax: 28,
    armorClass: 18,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#7c2d12",
      bgTo: "#1c1917",
      ringColor: "#f59e0b",
      badgeText: "GUERREIRO",
      iconSvg: `
        <path d="M60 22 L76 34 L74 62 C74 74 60 82 60 82 C60 82 46 74 46 62 L44 34 Z" fill="#cbd5e1" stroke="#475569" stroke-width="3"/>
        <path d="M60 26 L60 78" stroke="#f59e0b" stroke-width="3"/>
        <path d="M48 48 L72 48" stroke="#94a3b8" stroke-width="4"/>
        <rect x="50" y="43" width="8" height="4" rx="1" fill="#0f172a"/>
        <rect x="62" y="43" width="8" height="4" rx="1" fill="#0f172a"/>
      `,
    }),
  },
  {
    id: "hero-paladin",
    category: "heroes",
    name: "Paladino de Tyr",
    subtitle: "Meio-Elfo · CA 19 · Campeão Sagrado",
    size: 1,
    hpMax: 32,
    armorClass: 19,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#854d0e",
      bgTo: "#1e1b4b",
      ringColor: "#fde047",
      badgeText: "PALADINO",
      iconSvg: `
        <circle cx="60" cy="52" r="26" fill="rgba(253,224,71,0.2)" />
        <path d="M60 18 L66 40 L88 46 L66 52 L60 76 L54 52 L32 46 L54 40 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
        <circle cx="60" cy="46" r="8" fill="#ffffff"/>
      `,
    }),
  },
  {
    id: "hero-wizard",
    category: "heroes",
    name: "Arquimago de Waterdeep",
    subtitle: "Elfo do Sol · CA 13 · Escola de Evocação",
    size: 1,
    hpMax: 22,
    armorClass: 13,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#4c1d95",
      bgTo: "#090d16",
      ringColor: "#a855f7",
      badgeText: "ARQUIMAGO",
      iconSvg: `
        <polygon points="60,16 36,56 84,56" fill="#581c87" stroke="#c084fc" stroke-width="2.5"/>
        <ellipse cx="60" cy="56" rx="30" ry="7" fill="#6b21a8" stroke="#c084fc" stroke-width="2"/>
        <circle cx="60" cy="68" r="10" fill="#38bdf8" stroke="#bae6fd" stroke-width="2"/>
      `,
    }),
  },
  {
    id: "hero-rogue",
    category: "heroes",
    name: "Ladina das Sombras",
    subtitle: "Tiefling · CA 16 · Adagas Envenenadas",
    size: 1,
    hpMax: 24,
    armorClass: 16,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#115e59",
      bgTo: "#09090b",
      ringColor: "#10b981",
      badgeText: "LADINA",
      iconSvg: `
        <path d="M36 74 L78 24 L84 30 L42 80 Z" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <path d="M84 74 L42 24 L36 30 L78 80 Z" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <circle cx="60" cy="52" r="9" fill="#10b981" stroke="#a7f3d0" stroke-width="2"/>
      `,
    }),
  },
  {
    id: "hero-cleric",
    category: "heroes",
    name: "Clériga de Selûne",
    subtitle: "Anã do Escudo · CA 18 · Domínio da Luz",
    size: 1,
    hpMax: 27,
    armorClass: 18,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#0369a1",
      bgTo: "#0f172a",
      ringColor: "#38bdf8",
      badgeText: "CLÉRIGA",
      iconSvg: `
        <path d="M68 24 A24 24 0 1 0 68 78 A18 18 0 1 1 68 24 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
        <circle cx="48" cy="44" r="3" fill="#fef08a"/>
        <circle cx="72" cy="52" r="4" fill="#fef08a"/>
      `,
    }),
  },
  {
    id: "hero-ranger",
    category: "heroes",
    name: "Patrulheiro de Cormyr",
    subtitle: "Elfo da Floresta · CA 16 · Arco Longo",
    size: 1,
    hpMax: 28,
    armorClass: 16,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#166534",
      bgTo: "#052e16",
      ringColor: "#4ade80",
      badgeText: "PATRULHEIRO",
      iconSvg: `
        <path d="M44 22 C76 38 76 66 44 82" fill="none" stroke="#a16207" stroke-width="5" stroke-linecap="round"/>
        <line x1="44" y1="22" x2="44" y2="82" stroke="#e2e8f0" stroke-width="1.5"/>
        <line x1="32" y1="52" x2="82" y2="52" stroke="#fde047" stroke-width="3"/>
        <polygon points="84,52 74,47 74,57" fill="#fde047"/>
      `,
    }),
  },
  {
    id: "hero-barbarian",
    category: "heroes",
    name: "Bárbaro do Vento Gélido",
    subtitle: "Golias · CA 15 · Machado Grande",
    size: 1,
    hpMax: 38,
    armorClass: 15,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#991b1b",
      bgTo: "#18181b",
      ringColor: "#ef4444",
      badgeText: "BÁRBARO",
      iconSvg: `
        <line x1="60" y1="20" x2="60" y2="84" stroke="#78350f" stroke-width="6" stroke-linecap="round"/>
        <path d="M60 28 C86 20 88 54 60 46 Z" fill="#cbd5e1" stroke="#ef4444" stroke-width="2"/>
        <path d="M60 28 C34 20 32 54 60 46 Z" fill="#cbd5e1" stroke="#ef4444" stroke-width="2"/>
      `,
    }),
  },
  {
    id: "hero-bard",
    category: "heroes",
    name: "Bardo de Baldur's Gate",
    subtitle: "Meio-Elfo · CA 15 · Colégio do Conhecimento",
    size: 1,
    hpMax: 24,
    armorClass: 15,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#9d174d",
      bgTo: "#1e1b4b",
      ringColor: "#f472b6",
      badgeText: "BARDO",
      iconSvg: `
        <path d="M44 26 L44 68 C44 76 76 76 76 68 L76 26" fill="none" stroke="#fbbf24" stroke-width="4"/>
        <line x1="52" y1="28" x2="52" y2="72" stroke="#fef08a" stroke-width="1.5"/>
        <line x1="60" y1="28" x2="60" y2="73" stroke="#fef08a" stroke-width="1.5"/>
        <line x1="68" y1="28" x2="68" y2="72" stroke="#fef08a" stroke-width="1.5"/>
      `,
    }),
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
    avatarUrl: buildPortraitSvg({
      bgFrom: "#365314",
      bgTo: "#14180d",
      ringColor: "#84cc16",
      badgeText: "GOBLIN",
      iconSvg: `
        <polygon points="20,46 42,40 40,56" fill="#65a30d"/>
        <polygon points="100,46 78,40 80,56" fill="#65a30d"/>
        <circle cx="60" cy="52" r="22" fill="#65a30d" stroke="#365314" stroke-width="2.5"/>
        <circle cx="51" cy="48" r="4" fill="#ef4444"/>
        <circle cx="69" cy="48" r="4" fill="#ef4444"/>
        <path d="M48 62 Q60 68 72 62" fill="none" stroke="#1a2e05" stroke-width="3"/>
      `,
    }),
  },
  {
    id: "monster-skeleton",
    category: "monsters",
    name: "Esqueleto da Cripta",
    subtitle: "Morto-Vivo (1x1) · ND 1/4 · CA 13 · 13 PV",
    size: 1,
    hpMax: 13,
    armorClass: 13,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#334155",
      bgTo: "#09090b",
      ringColor: "#94a3b8",
      badgeText: "ESQUELETO",
      iconSvg: `
        <circle cx="60" cy="46" r="20" fill="#e2e8f0"/>
        <rect x="50" y="58" width="20" height="14" rx="3" fill="#e2e8f0"/>
        <circle cx="52" cy="45" r="5" fill="#09090b"/>
        <circle cx="68" cy="45" r="5" fill="#09090b"/>
        <circle cx="52" cy="45" r="2" fill="#38bdf8"/>
        <circle cx="68" cy="45" r="2" fill="#38bdf8"/>
      `,
    }),
  },
  {
    id: "monster-orc",
    category: "monsters",
    name: "Orc de Gruumsh",
    subtitle: "Médio (1x1) · ND 1/2 · CA 13 · 15 PV",
    size: 1,
    hpMax: 15,
    armorClass: 13,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#7f1d1d",
      bgTo: "#141414",
      ringColor: "#dc2626",
      badgeText: "ORC",
      iconSvg: `
        <circle cx="60" cy="52" r="23" fill="#4d7c0f" stroke="#1a2e05" stroke-width="2.5"/>
        <circle cx="51" cy="46" r="4" fill="#fef08a"/>
        <circle cx="69" cy="46" r="4" fill="#fef08a"/>
        <polygon points="46,66 50,54 54,66" fill="#fef9c3"/>
        <polygon points="66,66 70,54 74,66" fill="#fef9c3"/>
      `,
    }),
  },
  {
    id: "monster-mimic",
    category: "monsters",
    name: "Mímico Devorador",
    subtitle: "Metamorfo (1x1) · ND 2 · CA 12 · 58 PV",
    size: 1,
    hpMax: 58,
    armorClass: 12,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#78350f",
      bgTo: "#1c1917",
      ringColor: "#d97706",
      badgeText: "MÍMICO",
      iconSvg: `
        <rect x="34" y="34" width="52" height="40" rx="6" fill="#78350f" stroke="#fbbf24" stroke-width="3"/>
        <polygon points="38,52 44,60 50,52 56,60 62,52 68,60 74,52 80,60" fill="#fef2f2"/>
        <path d="M56 54 Q64 78 76 66" fill="none" stroke="#ec4899" stroke-width="6" stroke-linecap="round"/>
      `,
    }),
  },
  {
    id: "monster-mindflayer",
    category: "monsters",
    name: "Devorador de Mentes (Illithid)",
    subtitle: "Aberração (1x1) · ND 7 · CA 15 · 71 PV",
    size: 1,
    hpMax: 71,
    armorClass: 15,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#581c87",
      bgTo: "#090514",
      ringColor: "#c084fc",
      badgeText: "ILLITHID",
      iconSvg: `
        <ellipse cx="60" cy="42" rx="18" ry="20" fill="#9333ea"/>
        <circle cx="53" cy="42" r="3.5" fill="#fef08a"/>
        <circle cx="67" cy="42" r="3.5" fill="#fef08a"/>
        <path d="M48 56 Q42 74 38 80 M55 58 Q53 76 50 82 M65 58 Q67 76 70 82 M72 56 Q78 74 82 80" fill="none" stroke="#a855f7" stroke-width="4" stroke-linecap="round"/>
      `,
    }),
  },
  {
    id: "monster-ogre",
    category: "monsters",
    name: "Ogro Brutamonte",
    subtitle: "Grande (2x2) · ND 2 · CA 11 · 59 PV",
    size: 2,
    hpMax: 59,
    armorClass: 11,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#713f12",
      bgTo: "#1c1917",
      ringColor: "#eab308",
      badgeText: "OGRO 2x2",
      iconSvg: `
        <circle cx="60" cy="52" r="26" fill="#ca8a04" stroke="#713f12" stroke-width="3"/>
        <circle cx="50" cy="46" r="4" fill="#1c1917"/>
        <circle cx="70" cy="46" r="4" fill="#1c1917"/>
        <rect x="46" y="60" width="28" height="7" rx="3" fill="#422006"/>
      `,
    }),
  },
  {
    id: "monster-beholder",
    category: "monsters",
    name: "Observador (Beholder)",
    subtitle: "Aberração Grande (2x2) · ND 13 · CA 18 · 180 PV",
    size: 2,
    hpMax: 180,
    armorClass: 18,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#701a75",
      bgTo: "#090514",
      ringColor: "#e879f9",
      badgeText: "BEHOLDER",
      iconSvg: `
        <path d="M40 34 Q30 18 36 16 M52 30 Q50 14 56 14 M68 30 Q72 14 66 14 M80 34 Q90 18 84 16" fill="none" stroke="#c084fc" stroke-width="3.5"/>
        <circle cx="60" cy="54" r="24" fill="#86198f" stroke="#f0abfc" stroke-width="2.5"/>
        <circle cx="60" cy="50" r="11" fill="#fef9c3"/>
        <circle cx="60" cy="50" r="5" fill="#dc2626"/>
      `,
    }),
  },
  {
    id: "monster-red-dragon",
    category: "monsters",
    name: "Dragão Vermelho Adulto",
    subtitle: "Imenso (3x3) · ND 17 · CA 19 · 256 PV",
    size: 3,
    hpMax: 256,
    armorClass: 19,
    avatarUrl: buildPortraitSvg({
      bgFrom: "#991b1b",
      bgTo: "#1f0505",
      ringColor: "#f59e0b",
      badgeText: "DRAGÃO 3x3",
      iconSvg: `
        <polygon points="34,20 48,40 40,46" fill="#fef08a"/>
        <polygon points="86,20 72,40 80,46" fill="#fef08a"/>
        <polygon points="60,26 82,52 68,78 52,78 38,52" fill="#dc2626" stroke="#fbbf24" stroke-width="2.5"/>
        <polygon points="46,48 56,52 48,56" fill="#fef08a"/>
        <polygon points="74,48 64,52 72,56" fill="#fef08a"/>
      `,
    }),
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
    avatarUrl: buildPortraitSvg({
      bgFrom: "#78350f",
      bgTo: "#271506",
      ringColor: "#fbbf24",
      badgeText: "TESOURO",
      iconSvg: `
        <rect x="32" y="38" width="56" height="38" rx="5" fill="#92400e" stroke="#fbbf24" stroke-width="3"/>
        <line x1="32" y1="54" x2="88" y2="54" stroke="#fbbf24" stroke-width="3"/>
        <rect x="55" y="48" width="10" height="12" rx="2" fill="#fde047"/>
      `,
    }),
  },
];
