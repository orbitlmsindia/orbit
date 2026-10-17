export type ThemeId =
  | "light"
  | "dark"
  | "cyberpunk"
  | "doomsday"
  | "sapphire"
  | "amethyst"
  | "solar-flare"
  | "crimson"
  | "emerald-nordic"
  | "cosmic-aurora"
  | "system";

export interface ThemePalette {
  background: string;
  card: string;
  primary: string;
  accent: string;
  foreground: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  cost: number; // In ⚡ Orbit Flux
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  previewGradient: string;
  badge?: "DEFAULT" | "POPULAR" | "PREMIUM" | "EPIC" | "MYTHIC" | "EXCLUSIVE";
  description: string;
  palette: ThemePalette;
}

export type ThemeCatalogItem = ThemeDefinition;

export const THEMES_CATALOG: ThemeDefinition[] = [
  {
    id: "light",
    name: "Orbit Classic Light",
    tagline: "Crisp Academic Daylight",
    cost: 0,
    isDark: false,
    primaryColor: "#2563eb",
    secondaryColor: "#64748b",
    bgColor: "#f8fafc",
    previewGradient: "from-blue-600 via-sky-500 to-slate-100",
    badge: "DEFAULT",
    description: "Standard daytime palette featuring high-legibility royal blue with pristine white surfaces.",
    palette: {
      background: "#f8fafc",
      card: "#ffffff",
      primary: "#2563eb",
      accent: "#3b82f6",
      foreground: "#0f172a",
    },
  },
  {
    id: "dark",
    name: "Orbit Obsidian Dark",
    tagline: "Deep Space Engineering",
    cost: 0,
    isDark: true,
    primaryColor: "#3b82f6",
    secondaryColor: "#1e293b",
    bgColor: "#0f172a",
    previewGradient: "from-blue-500 via-slate-800 to-slate-950",
    badge: "DEFAULT",
    description: "Our signature dark carbon theme optimized for long study sessions and eye comfort.",
    palette: {
      background: "#0f172a",
      card: "#1e293b",
      primary: "#3b82f6",
      accent: "#60a5fa",
      foreground: "#f8fafc",
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon 2077",
    tagline: "Electric Cyan & Hot Magenta",
    cost: 200,
    isDark: true,
    primaryColor: "#00f0ff",
    secondaryColor: "#ff007f",
    bgColor: "#070b19",
    previewGradient: "from-cyan-400 via-fuchsia-600 to-slate-950",
    badge: "POPULAR",
    description: "High-contrast synthetic cyber aesthetics with high-frequency neon cyan and electric magenta accents.",
    palette: {
      background: "#070b19",
      card: "#0e172e",
      primary: "#00f0ff",
      accent: "#ff007f",
      foreground: "#f8fafc",
    },
  },
  {
    id: "doomsday",
    name: "Doomsday Matrix",
    tagline: "Phosphor Terminal Bio-Green",
    cost: 350,
    isDark: true,
    primaryColor: "#00ff73",
    secondaryColor: "#0d2b1d",
    bgColor: "#07140f",
    previewGradient: "from-emerald-400 via-emerald-800 to-black",
    badge: "EPIC",
    description: "Underground terminal phosphor glow with obsidian carbon fiber matrix backgrounds.",
    palette: {
      background: "#07140f",
      card: "#0c271e",
      primary: "#00ff73",
      accent: "#059669",
      foreground: "#f0fdf4",
    },
  },
  {
    id: "sapphire",
    name: "Midnight Sapphire",
    tagline: "Royal Deep Abyssal Blue",
    cost: 500,
    isDark: true,
    primaryColor: "#1d4ed8",
    secondaryColor: "#1e3a8a",
    bgColor: "#070e1e",
    previewGradient: "from-blue-600 via-indigo-900 to-slate-950",
    badge: "PREMIUM",
    description: "Royal cobalt and sapphire brilliance reflecting off deep abyssal navy waters.",
    palette: {
      background: "#070e1e",
      card: "#0f1d38",
      primary: "#1d4ed8",
      accent: "#3b82f6",
      foreground: "#eff6ff",
    },
  },
  {
    id: "amethyst",
    name: "Amethyst Royal",
    tagline: "Imperial Velvet & Violet Glow",
    cost: 650,
    isDark: true,
    primaryColor: "#a855f7",
    secondaryColor: "#581c87",
    bgColor: "#10091d",
    previewGradient: "from-purple-500 via-violet-900 to-slate-950",
    badge: "PREMIUM",
    description: "Regal amethyst crystals blended with dark imperial violet and lavender luminescence.",
    palette: {
      background: "#10091d",
      card: "#1f1238",
      primary: "#a855f7",
      accent: "#c084fc",
      foreground: "#faf5ff",
    },
  },
  {
    id: "solar-flare",
    name: "Solar Flare Amber",
    tagline: "Molten Gold & Sunset Glow",
    cost: 800,
    isDark: true,
    primaryColor: "#f59e0b",
    secondaryColor: "#78350f",
    bgColor: "#140e09",
    previewGradient: "from-amber-400 via-orange-600 to-slate-950",
    badge: "EPIC",
    description: "Warm molten amber energy reminiscent of a solar eclipse on obsidian volcanic glass.",
    palette: {
      background: "#140e09",
      card: "#271b12",
      primary: "#f59e0b",
      accent: "#fbbf24",
      foreground: "#fffbeb",
    },
  },
  {
    id: "crimson",
    name: "Crimson Dynasty",
    tagline: "Blood Moon & Imperial Scarlet",
    cost: 1000,
    isDark: true,
    primaryColor: "#ef4444",
    secondaryColor: "#7f1d1d",
    bgColor: "#14070a",
    previewGradient: "from-rose-500 via-red-900 to-black",
    badge: "EPIC",
    description: "Sovereign ruby scarlet and blood moon velvet inspired by legendary martial dynasties.",
    palette: {
      background: "#14070a",
      card: "#280f15",
      primary: "#ef4444",
      accent: "#f87171",
      foreground: "#fef2f2",
    },
  },
  {
    id: "emerald-nordic",
    name: "Nordic Pine & Emerald",
    tagline: "Alpine Evergreen & Mint Glow",
    cost: 1250,
    isDark: true,
    primaryColor: "#10b981",
    secondaryColor: "#064e3b",
    bgColor: "#071712",
    previewGradient: "from-emerald-400 via-teal-800 to-slate-950",
    badge: "PREMIUM",
    description: "Lustrous Scandinavian pine forest emerald combined with cool alpine mist tones.",
    palette: {
      background: "#071712",
      card: "#0e2d24",
      primary: "#10b981",
      accent: "#34d399",
      foreground: "#ecfdf5",
    },
  },
  {
    id: "cosmic-aurora",
    name: "Cosmic Aurora Prestige",
    tagline: "Holographic Celestial Horizon",
    cost: 1500,
    isDark: true,
    primaryColor: "#06b6d4",
    secondaryColor: "#8b5cf6",
    bgColor: "#09071b",
    previewGradient: "from-cyan-400 via-violet-500 to-fuchsia-900",
    badge: "MYTHIC",
    description: "The ultimate prestige aesthetic featuring shifting holographic northern lights across deep space.",
    palette: {
      background: "#09071b",
      card: "#151136",
      primary: "#06b6d4",
      accent: "#8b5cf6",
      foreground: "#f5f3ff",
    },
  },
];
