export interface FurnitureAssetItem {
  id: string;
  label: string;
  category: "Mobília" | "Decoração" | "Tesouro";
  cols: number;
  rows: number;
  imageUrl: string;
}

export interface HeroTokenAssetItem {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const FURNITURE_PACK: readonly FurnitureAssetItem[] = [
  {
    id: "sofa-veludo",
    label: "🛋️ Sofá (Veludo)",
    category: "Mobília",
    cols: 2,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 70">
        <rect x="6" y="10" width="128" height="52" rx="12" fill="#451a03" stroke="#1c0a00" stroke-width="3"/>
        <rect x="12" y="12" width="116" height="16" rx="7" fill="#7f1d1d" stroke="#450a0a" stroke-width="2"/>
        <rect x="12" y="26" width="56" height="30" rx="6" fill="#991b1b" stroke="#450a0a" stroke-width="2"/>
        <rect x="72" y="26" width="56" height="30" rx="6" fill="#991b1b" stroke="#450a0a" stroke-width="2"/>
        <rect x="4" y="14" width="16" height="44" rx="7" fill="#7f1d1d" stroke="#450a0a" stroke-width="2"/>
        <rect x="120" y="14" width="16" height="44" rx="7" fill="#7f1d1d" stroke="#450a0a" stroke-width="2"/>
      </svg>
    `),
  },
  {
    id: "poltrona-couro",
    label: "🪑 Poltrona",
    category: "Mobília",
    cols: 1,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70">
        <rect x="9" y="9" width="52" height="52" rx="12" fill="#451a03" stroke="#1c0a00" stroke-width="2.5"/>
        <rect x="15" y="11" width="40" height="14" rx="6" fill="#78350f"/>
        <rect x="15" y="23" width="40" height="32" rx="6" fill="#92400e" stroke="#451a03" stroke-width="1.5"/>
        <rect x="7" y="16" width="12" height="38" rx="5" fill="#78350f"/>
        <rect x="51" y="16" width="12" height="38" rx="5" fill="#78350f"/>
      </svg>
    `),
  },
  {
    id: "cama-casal",
    label: "🛏️ Cama de Casal",
    category: "Mobília",
    cols: 2,
    rows: 2,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
        <rect x="10" y="8" width="120" height="124" rx="10" fill="#5c2d12" stroke="#2a1205" stroke-width="3"/>
        <rect x="16" y="12" width="108" height="14" rx="4" fill="#3f1d0b"/>
        <rect x="18" y="28" width="104" height="96" rx="6" fill="#e2e8f0"/>
        <rect x="23" y="31" width="42" height="22" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <rect x="75" y="31" width="42" height="22" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <rect x="18" y="60" width="104" height="64" rx="4" fill="#1e3a8a" stroke="#172554" stroke-width="2"/>
        <path d="M18 68 H122" stroke="#f59e0b" stroke-width="3" opacity="0.7"/>
      </svg>
    `),
  },
  {
    id: "mesa-taverna",
    label: "🪵 Mesa de Taverna",
    category: "Mobília",
    cols: 2,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 70">
        <rect x="8" y="12" width="124" height="46" rx="6" fill="#78350f" stroke="#291202" stroke-width="3"/>
        <line x1="12" y1="27" x2="128" y2="27" stroke="#451a03" stroke-width="1.5"/>
        <line x1="12" y1="43" x2="128" y2="43" stroke="#451a03" stroke-width="1.5"/>
        <rect x="14" y="17" width="8" height="36" fill="#5c280a" opacity="0.45"/>
        <rect x="118" y="17" width="8" height="36" fill="#5c280a" opacity="0.45"/>
      </svg>
    `),
  },
  {
    id: "mesa-redonda",
    label: "⭕ Mesa Redonda",
    category: "Mobília",
    cols: 2,
    rows: 2,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="56" fill="#78350f" stroke="#291202" stroke-width="4"/>
        <circle cx="70" cy="70" r="46" fill="none" stroke="#92400e" stroke-width="2"/>
        <circle cx="70" cy="70" r="10" fill="#451a03"/>
      </svg>
    `),
  },
  {
    id: "cadeira-madeira",
    label: "🪑 Cadeira",
    category: "Mobília",
    cols: 1,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70">
        <rect x="18" y="16" width="34" height="36" rx="6" fill="#92400e" stroke="#291202" stroke-width="2.5"/>
        <rect x="16" y="12" width="38" height="10" rx="4" fill="#5c280a" stroke="#291202" stroke-width="2"/>
      </svg>
    `),
  },
  {
    id: "trono-real",
    label: "👑 Trono Real",
    category: "Mobília",
    cols: 1,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70">
        <rect x="10" y="8" width="50" height="54" rx="10" fill="#78350f" stroke="#f59e0b" stroke-width="2.5"/>
        <rect x="16" y="10" width="38" height="14" rx="5" fill="#991b1b" stroke="#fbbf24" stroke-width="1.5"/>
        <rect x="16" y="24" width="38" height="32" rx="6" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1.5"/>
        <rect x="8" y="16" width="10" height="38" rx="4" fill="#b45309" stroke="#fbbf24" stroke-width="1.2"/>
        <rect x="52" y="16" width="10" height="38" rx="4" fill="#b45309" stroke="#fbbf24" stroke-width="1.2"/>
      </svg>
    `),
  },
  {
    id: "estante-livros",
    label: "📚 Estante de Livros",
    category: "Mobília",
    cols: 2,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 70">
        <rect x="8" y="16" width="124" height="38" rx="4" fill="#451a03" stroke="#1c0a00" stroke-width="3"/>
        <rect x="16" y="21" width="12" height="28" fill="#991b1b"/>
        <rect x="30" y="23" width="10" height="26" fill="#1e40af"/>
        <rect x="42" y="20" width="14" height="29" fill="#065f46"/>
        <rect x="58" y="22" width="9" height="27" fill="#b45309"/>
        <rect x="70" y="21" width="13" height="28" fill="#581c87"/>
        <rect x="86" y="23" width="11" height="26" fill="#9a3412"/>
        <rect x="100" y="20" width="14" height="29" fill="#1e293b"/>
        <rect x="116" y="22" width="10" height="27" fill="#ca8a04"/>
      </svg>
    `),
  },
  {
    id: "tapete-nobre",
    label: "🟥 Tapete Nobre",
    category: "Decoração",
    cols: 3,
    rows: 2,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 140">
        <rect x="8" y="8" width="194" height="124" rx="4" fill="#7f1d1d" stroke="#f59e0b" stroke-width="4"/>
        <rect x="18" y="18" width="174" height="104" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="6 4"/>
        <polygon points="105,34 150,70 105,106 60,70" fill="#991b1b" stroke="#f59e0b" stroke-width="2.5"/>
        <circle cx="105" cy="70" r="14" fill="#b45309" stroke="#fde68a" stroke-width="2"/>
      </svg>
    `),
  },
  {
    id: "bau-tesouro",
    label: "🧰 Baú de Tesouro",
    category: "Tesouro",
    cols: 1,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70">
        <rect x="11" y="16" width="48" height="38" rx="6" fill="#78350f" stroke="#1c0a00" stroke-width="2.5"/>
        <rect x="11" y="31" width="48" height="8" fill="#f59e0b" opacity="0.85"/>
        <rect x="30" y="28" width="10" height="14" rx="2" fill="#fde68a" stroke="#78350f" stroke-width="1.5"/>
      </svg>
    `),
  },
  {
    id: "barril-madeira",
    label: "🛢️ Barril",
    category: "Tesouro",
    cols: 1,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="24" fill="#92400e" stroke="#3f3f46" stroke-width="4"/>
        <circle cx="35" cy="35" r="17" fill="#b45309" stroke="#451a03" stroke-width="1.5"/>
        <circle cx="43" cy="27" r="3" fill="#27272a"/>
      </svg>
    `),
  },
  {
    id: "altar-ritual",
    label: "🕯️ Altar de Pedra",
    category: "Decoração",
    cols: 2,
    rows: 1,
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 70">
        <rect x="10" y="10" width="120" height="50" rx="6" fill="#334155" stroke="#0f172a" stroke-width="3"/>
        <rect x="20" y="18" width="100" height="34" rx="3" fill="#475569" stroke="#fbbf24" stroke-width="1.5" opacity="0.85"/>
        <circle cx="70" cy="35" r="10" fill="none" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="28" cy="24" r="4" fill="#fde68a"/>
        <circle cx="112" cy="24" r="4" fill="#fde68a"/>
      </svg>
    `),
  },
];

function makeHeroPortrait(bg: string, rim: string, glyph: string): string {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <radialGradient id="g" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stop-color="${bg}"/>
          <stop offset="100%" stop-color="#09090b"/>
        </radialGradient>
      </defs>
      <circle cx="64" cy="64" r="60" fill="url(#g)" stroke="${rim}" stroke-width="6"/>
      <text x="64" y="76" text-anchor="middle" font-size="52">${glyph}</text>
    </svg>
  `);
}

export const CURATED_HERO_TOKENS: readonly HeroTokenAssetItem[] = [
  {
    id: "hero-guerreiro",
    name: "Guerreiro",
    role: "Tanque / Linha de Frente",
    imageUrl: makeHeroPortrait("#7f1d1d", "#f59e0b", "⚔️"),
  },
  {
    id: "hero-mago",
    name: "Mago Arcano",
    role: "Conjurador",
    imageUrl: makeHeroPortrait("#1e3a8a", "#38bdf8", "🔮"),
  },
  {
    id: "hero-ladino",
    name: "Ladino",
    role: "Furtivo / Explorador",
    imageUrl: makeHeroPortrait("#27272a", "#a1a1aa", "🗡️"),
  },
  {
    id: "hero-clerigo",
    name: "Clérigo",
    role: "Suporte / Cura",
    imageUrl: makeHeroPortrait("#854d0e", "#fde047", "🛡️"),
  },
  {
    id: "hero-arqueiro",
    name: "Patrulheiro",
    role: "Distância",
    imageUrl: makeHeroPortrait("#064e3b", "#34d399", "🏹"),
  },
  {
    id: "hero-guarda",
    name: "Guarda / Bandido",
    role: "NPC / Inimigo",
    imageUrl: makeHeroPortrait("#4c0519", "#fb7185", "🪖"),
  },
];
