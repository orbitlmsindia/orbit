import React, { useState } from "react";
import { StudentKingdom, StructureType, BattleAstraId } from "@/types/astravyuh";
import {
  BATTLE_ASTRAS,
  KINGDOM_SKINS,
  KINGDOM_BACKGROUNDS,
  calculateKingdomDefenseReduction,
  getStructureInfo
} from "@/services/astravyuhService";
import {
  Shield,
  Sparkles,
  Zap,
  Flame,
  Droplets,
  ChevronUp,
  Lock,
  Swords,
  ShoppingBag,
  Info,
  Hammer,
  Trophy,
  Star,
  CheckCircle2,
  Maximize2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface IsometricKingdomProps {
  kingdom: StudentKingdom;
  onSelectStructure: (type: StructureType) => void;
  onNavigateTab?: (tab: string) => void;
  flixBalance?: number;
  interactive?: boolean;
}

type SelectedBuildingType = "castle" | "wall" | "tower" | "cannon" | "elixir" | "gold" | "camp";

export const IsometricKingdom: React.FC<IsometricKingdomProps> = ({
  kingdom,
  onSelectStructure,
  onNavigateTab,
  flixBalance = 450,
  interactive = true,
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuildingType>("castle");
  const [hoveredBuilding, setHoveredBuilding] = useState<SelectedBuildingType | null>(null);

  const activeSkin = KINGDOM_SKINS.find((s) => s.id === kingdom.activeSkinId) || KINGDOM_SKINS[0];
  const activeBg = KINGDOM_BACKGROUNDS.find((b) => b.id === kingdom.activeBackgroundId) || KINGDOM_BACKGROUNDS[0];
  const equippedAstra = kingdom.equippedAstraId ? BATTLE_ASTRAS[kingdom.equippedAstraId] : null;

  const defense = calculateKingdomDefenseReduction(
    kingdom.castleLevel,
    kingdom.wallLevel,
    kingdom.towerLevel,
    kingdom.equippedAstraId
  );

  const totalCitadelLvl = kingdom.castleLevel + kingdom.wallLevel + kingdom.towerLevel;

  // House theme badge
  const houseIcon = kingdom.house === "chandra" ? "🌙" : kingdom.house === "agni" ? "🔥" : kingdom.house === "vayu" ? "🌪️" : "☀️";
  const houseName = kingdom.house ? `${kingdom.house.toUpperCase()} HOUSE` : "SURYA HOUSE";

  // Dynamic colors for walls based on level (Lvl 4: Purple Crystal, Lvl 5: Obsidian Lava)
  const wallTheme = kingdom.wallLevel >= 5
    ? {
        stone: "#1c1917",
        seam: "#ea580c",
        spike: "#f97316",
        aura: "rgba(249, 115, 22, 0.4)",
        label: "Obsidian Magma Wall"
      }
    : kingdom.wallLevel >= 4
    ? {
        stone: "#2e1065",
        seam: "#c084fc",
        spike: "#d8b4fe",
        aura: "rgba(192, 132, 252, 0.4)",
        label: "Amethyst Crystal Wall"
      }
    : kingdom.wallLevel >= 3
    ? {
        stone: "#334155",
        seam: "#f59e0b",
        spike: "#fbbf24",
        aura: "rgba(245, 158, 11, 0.3)",
        label: "Gilded Royal Rampart"
      }
    : {
        stone: "#475569",
        seam: "#64748b",
        spike: "#94a3b8",
        aura: "rgba(100, 116, 139, 0.2)",
        label: "Fortified Stone Wall"
      };

  // Building selection handler
  const handleBuildingClick = (type: SelectedBuildingType) => {
    if (!interactive) return;
    setSelectedBuilding(type);
  };

  const handleTriggerUpgrade = (type: StructureType) => {
    if (!interactive) return;
    onSelectStructure(type);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-[0_15px_45px_rgba(0,0,0,0.85)] bg-slate-950 p-2 sm:p-4 select-none font-sans">
      
      {/* ─── 1. TOP CLASH-STYLE GAME HUD BAR ─── */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-slate-900/95 border border-amber-500/30 backdrop-blur-md shadow-lg mb-2">
        {/* Left: Star Level & Student Name */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center font-black text-white text-xs sm:text-sm border-2 border-amber-400 shadow-md">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300 mr-0.5" />
              <span>{Math.max(1, totalCitadelLvl)}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-100 tracking-tight">
                {kingdom.studentName}
              </span>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] px-1.5 py-0 font-bold">
                {houseIcon} {houseName}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>🔨 2/2 Builders Free</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400/90 font-medium">{activeSkin.name}</span>
            </p>
          </div>
        </div>

        {/* Center: Shield Status */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-xl text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-300 font-medium">🛡️ Shield Active: 18h 42m</span>
        </div>

        {/* Right: Resources & Trophies */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Trophies Counter */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-amber-500/30 px-2.5 py-1 rounded-xl text-xs font-mono font-bold text-amber-300 shadow-inner">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{kingdom.trophies}</span>
          </div>

          {/* Flix Elixir Counter (Clash Elixir Reservoir Style) */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-purple-500/40 px-2.5 py-1 rounded-xl text-xs font-mono font-bold text-purple-300 shadow-inner">
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 animate-pulse flex items-center justify-center text-[8px]">
              ⚡
            </div>
            <span>{flixBalance} Flix</span>
          </div>

          {/* Defense Power Gauge */}
          <div className="flex items-center gap-1 bg-slate-950/90 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-xs font-mono font-black text-emerald-400">
            <span>🛡️</span>
            <span>-{defense.totalDefenseReduction} DMG</span>
          </div>
        </div>
      </div>

      {/* ─── 2. ISOMETRIC CHECKERED VILLAGE CANVAS (CLASH OF CLANS INSPIRATION) ─── */}
      <div className="relative w-full h-[420px] min-[480px]:h-[480px] sm:h-[520px] md:h-[560px] rounded-2xl overflow-hidden border-2 border-emerald-950 shadow-inner bg-[#1a380c] flex items-center justify-center">
        
        {/* SVG ISOMETRIC GAME CANVAS */}
        <svg
          viewBox="0 0 920 580"
          className="w-full h-full object-contain filter drop-shadow-2xl"
          style={{ imageRendering: "auto" }}
        >
          <defs>
            {/* Authentic Clash-of-Clans Checkered Grass Grid Pattern */}
            <pattern id="cocGrassTiles" width="80" height="40" patternUnits="userSpaceOnUse">
              {/* Tile 1: Rich Fairway Green */}
              <polygon points="40,0 80,20 40,40 0,20" fill="#529927" stroke="#437f1e" strokeWidth="0.8" />
              {/* Tile 2: Shaded Lawn Emerald */}
              <polygon points="40,20 80,40 40,60 0,40" fill="#468520" stroke="#376d18" strokeWidth="0.8" />
              {/* Subtle turf grain highlights */}
              <circle cx="20" cy="18" r="1.5" fill="#66b834" opacity="0.4" />
              <circle cx="60" cy="18" r="1.5" fill="#66b834" opacity="0.4" />
              <circle cx="40" cy="38" r="1.5" fill="#66b834" opacity="0.4" />
            </pattern>

            {/* Dirt Edge Texture */}
            <linearGradient id="dirtSlab" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b4423" />
              <stop offset="100%" stopColor="#3d2311" />
            </linearGradient>

            {/* Elixir Liquid Shading */}
            <radialGradient id="elixirOrb" cx="45%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="45%" stopColor="#c026d3" />
              <stop offset="90%" stopColor="#701a75" />
              <stop offset="100%" stopColor="#4a044e" />
            </radialGradient>

            {/* Gold Bullion Shading */}
            <linearGradient id="goldBarGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>

            {/* Town Hall Sloped Tiled Roof */}
            <linearGradient id="thRoofRed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#5a0a0a" />
            </linearGradient>

            {/* Wall Basalt / Obsidian */}
            <linearGradient id="obsidianStone" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Molten Lava Seams */}
            <linearGradient id="lavaVein" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Purple Amethyst Crystal Glow */}
            <linearGradient id="crystalSpike" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#c026d3" />
              <stop offset="100%" stopColor="#6b21a8" />
            </linearGradient>

            {/* Selection Pulse Glow */}
            <filter id="selectHalo" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#f59e0b" floodOpacity="0.9" />
            </filter>

            {/* Structure 3D Drop Shadow */}
            <filter id="buildingShadow" x="-30%" y="-30%" width="170%" height="170%">
              <feDropShadow dx="6" dy="12" stdDeviation="6" floodColor="#091804" floodOpacity="0.65" />
            </filter>
          </defs>

          {/* ─── A. TERRAIN FOUNDATION ─── */}
          {/* Outer Dirt Border */}
          <polygon points="460,15 900,290 460,565 20,290" fill="url(#dirtSlab)" stroke="#2b1709" strokeWidth="4" />
          
          {/* Authentic Checkered Grass Grid (Full playable village territory) */}
          <polygon points="460,30 875,290 460,550 45,290" fill="url(#cocGrassTiles)" />

          {/* Cobblestone Crossroad Arteries connecting Citadel to Quadrants */}
          <g id="villageRoads" opacity="0.65">
            <polygon points="460,140 480,150 240,430 220,420" fill="#64748b" />
            <polygon points="440,150 460,140 700,420 680,430" fill="#64748b" />
            <polygon points="460,170 480,180 460,390 440,380" fill="#475569" />
          </g>

          {/* ─── B. PERIMETER NATURE DECORATIONS (Pine Trees & Boulders) ─── */}
          {/* North-West Trees */}
          <g transform="translate(140, 160)" filter="url(#buildingShadow)">
            <polygon points="20,0 5,28 35,28" fill="#14532d" />
            <polygon points="20,12 10,38 30,38" fill="#15803d" />
            <rect x="17" y="38" width="6" height="8" fill="#543310" />
          </g>
          <g transform="translate(180, 120)" filter="url(#buildingShadow)">
            <polygon points="18,0 4,24 32,24" fill="#14532d" />
            <polygon points="18,10 8,34 28,34" fill="#166534" />
            <rect x="15" y="34" width="6" height="7" fill="#543310" />
          </g>

          {/* North-East Trees */}
          <g transform="translate(740, 150)" filter="url(#buildingShadow)">
            <polygon points="20,0 5,28 35,28" fill="#14532d" />
            <polygon points="20,12 10,38 30,38" fill="#15803d" />
            <rect x="17" y="38" width="6" height="8" fill="#543310" />
          </g>
          <g transform="translate(780, 190)" filter="url(#buildingShadow)">
            <polygon points="18,0 4,24 32,24" fill="#14532d" />
            <polygon points="18,10 8,34 28,34" fill="#166534" />
            <rect x="15" y="34" width="6" height="7" fill="#543310" />
          </g>

          {/* Natural Boulders & Wildflowers */}
          <ellipse cx="230" cy="380" rx="12" ry="7" fill="#64748b" stroke="#334155" strokeWidth="1" />
          <ellipse cx="690" cy="380" rx="14" ry="8" fill="#64748b" stroke="#334155" strokeWidth="1" />
          <circle cx="210" cy="390" r="3" fill="#fde047" />
          <circle cx="218" cy="395" r="2.5" fill="#f472b6" />
          <circle cx="710" cy="375" r="3" fill="#38bdf8" />

          {/* ─── C. 3D SEGMENTED DEFENSIVE WALLS (Clash-Style Compartments) ─── */}
          <g
            id="defensiveWalls"
            className="cursor-pointer"
            onClick={() => handleBuildingClick("wall")}
            onMouseEnter={() => setHoveredBuilding("wall")}
            onMouseLeave={() => setHoveredBuilding(null)}
            filter={selectedBuilding === "wall" || hoveredBuilding === "wall" ? "url(#selectHalo)" : "url(#buildingShadow)"}
          >
            {/* North-West Wall Section */}
            <g id="nwWall">
              <polygon points="460,115 280,215 295,225 475,125" fill={wallTheme.stone} />
              <polygon points="280,215 295,225 295,238 280,228" fill="#0f172a" />
              {kingdom.wallLevel >= 4 && (
                <polygon points="460,115 280,215 285,218 465,118" fill={wallTheme.seam} opacity="0.9" />
              )}
            </g>

            {/* North-East Wall Section */}
            <g id="neWall">
              <polygon points="460,115 640,215 625,225 445,125" fill={wallTheme.stone} />
              <polygon points="640,215 640,228 625,238 625,225" fill="#0f172a" />
              {kingdom.wallLevel >= 4 && (
                <polygon points="460,115 640,215 635,218 455,118" fill={wallTheme.seam} opacity="0.9" />
              )}
            </g>

            {/* South-West Wall Section */}
            <g id="swWall">
              <polygon points="280,215 380,315 395,305 295,205" fill={wallTheme.stone} />
              <polygon points="380,315 395,305 395,318 380,328" fill="#0f172a" />
              {kingdom.wallLevel >= 4 && (
                <polygon points="280,215 380,315 385,312 285,212" fill={wallTheme.seam} opacity="0.9" />
              )}
            </g>

            {/* South-East Wall Section */}
            <g id="seWall">
              <polygon points="640,215 540,315 525,305 625,205" fill={wallTheme.stone} />
              <polygon points="540,315 525,305 525,318 540,328" fill="#0f172a" />
              {kingdom.wallLevel >= 4 && (
                <polygon points="640,215 540,315 535,312 635,212" fill={wallTheme.seam} opacity="0.9" />
              )}
            </g>

            {/* Wall Corner Bastions & Spikes */}
            {[
              { x: 460, y: 115 },
              { x: 280, y: 215 },
              { x: 640, y: 215 },
              { x: 380, y: 315 },
              { x: 540, y: 315 }
            ].map((pt, i) => (
              <g key={i}>
                {/* Stone Corner Pillar */}
                <polygon points={`${pt.x},${pt.y - 12} ${pt.x + 10},${pt.y - 4} ${pt.x},${pt.y + 4} ${pt.x - 10},${pt.y - 4}`} fill="#1e293b" />
                <polygon points={`${pt.x - 10},${pt.y - 4} ${pt.x},${pt.y + 4} ${pt.x},${pt.y + 12} ${pt.x - 10},${pt.y + 4}`} fill="#0f172a" />
                <polygon points={`${pt.x},${pt.y + 4} ${pt.x + 10},${pt.y - 4} ${pt.x + 10},${pt.y + 4} ${pt.x},${pt.y + 12}`} fill="#334155" />

                {/* Level 4 Crystal Spikes (TH8 Inspired) or Level 5 Magma Horns (TH10 Inspired) */}
                {kingdom.wallLevel >= 4 && (
                  <polygon
                    points={`${pt.x},${pt.y - 28} ${pt.x + 7},${pt.y - 8} ${pt.x},${pt.y - 3} ${pt.x - 7},${pt.y - 8}`}
                    fill={kingdom.wallLevel >= 5 ? "url(#lavaVein)" : "url(#crystalSpike)"}
                  />
                )}
              </g>
            ))}

            {/* Wall Level Label */}
            <g transform="translate(460, 345)">
              <rect x="-34" y="-8" width="68" height="16" rx="5" fill="#020617" stroke={wallTheme.seam} strokeWidth="1.2" />
              <text x="0" y="3.5" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                WALL LV.{kingdom.wallLevel}
              </text>
            </g>
          </g>

          {/* ─── D. LEFT ARCHER DEFENSE TOWER (North-West Stilt Tower) ─── */}
          <g
            id="leftArcherTower"
            transform="translate(230, 240)"
            className="cursor-pointer transition-transform hover:scale-105 duration-200"
            onClick={() => handleBuildingClick("tower")}
            onMouseEnter={() => setHoveredBuilding("tower")}
            onMouseLeave={() => setHoveredBuilding(null)}
            filter={selectedBuilding === "tower" || hoveredBuilding === "tower" ? "url(#selectHalo)" : "url(#buildingShadow)"}
          >
            {/* Wooden Stilts Foundation */}
            <line x1="-16" y1="45" x2="-8" y2="0" stroke="#78350f" strokeWidth="4.5" />
            <line x1="16" y1="45" x2="8" y2="0" stroke="#78350f" strokeWidth="4.5" />
            <line x1="-16" y1="30" x2="16" y2="10" stroke="#92400e" strokeWidth="2.5" />
            <line x1="16" y1="30" x2="-16" y2="10" stroke="#92400e" strokeWidth="2.5" />

            {/* Fighting Platform */}
            <polygon points="-24,-5 0,-15 24,-5 0,5" fill="#b45309" />
            <polygon points="-24,-5 24,-5 24,0 -24,0" fill="#78350f" />

            {/* Archer Standing on Top */}
            <circle cx="0" cy="-14" r="5" fill="#fed7aa" />
            <polygon points="-4,-9 4,-9 6,0 -6,0" fill="#15803d" />
            <line x1="4" y1="-10" x2="12" y2="-6" stroke="#f59e0b" strokeWidth="2" />

            {/* Conical Spire Roof */}
            <polygon points="0,-45 -22,-16 22,-16" fill="#1e293b" />
            <polygon points="0,-45 0,-16 22,-16" fill="#0f172a" />
            <polygon points="0,-45 16,-38 0,-32" fill="#10b981" />

            {/* Badge */}
            <g transform="translate(0, -56)">
              <rect x="-30" y="-7" width="60" height="15" rx="5" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
              <text x="0" y="3.5" textAnchor="middle" fill="#ecfdf5" fontSize="8.5" fontWeight="bold">
                TOWER LV.{kingdom.towerLevel}
              </text>
            </g>
          </g>

          {/* ─── E. RIGHT ARCHER DEFENSE TOWER (North-East Stilt Tower) ─── */}
          <g
            id="rightArcherTower"
            transform="translate(690, 240)"
            className="cursor-pointer transition-transform hover:scale-105 duration-200"
            onClick={() => handleBuildingClick("tower")}
            onMouseEnter={() => setHoveredBuilding("tower")}
            onMouseLeave={() => setHoveredBuilding(null)}
            filter={selectedBuilding === "tower" || hoveredBuilding === "tower" ? "url(#selectHalo)" : "url(#buildingShadow)"}
          >
            {/* Wooden Stilts Foundation */}
            <line x1="-16" y1="45" x2="-8" y2="0" stroke="#78350f" strokeWidth="4.5" />
            <line x1="16" y1="45" x2="8" y2="0" stroke="#78350f" strokeWidth="4.5" />
            <line x1="-16" y1="30" x2="16" y2="10" stroke="#92400e" strokeWidth="2.5" />
            <line x1="16" y1="30" x2="-16" y2="10" stroke="#92400e" strokeWidth="2.5" />

            {/* Fighting Platform */}
            <polygon points="-24,-5 0,-15 24,-5 0,5" fill="#b45309" />
            <polygon points="-24,-5 24,-5 24,0 -24,0" fill="#78350f" />

            {/* Archer Standing on Top */}
            <circle cx="0" cy="-14" r="5" fill="#fed7aa" />
            <polygon points="-4,-9 4,-9 6,0 -6,0" fill="#15803d" />
            <line x1="4" y1="-10" x2="12" y2="-6" stroke="#f59e0b" strokeWidth="2" />

            {/* Conical Spire Roof */}
            <polygon points="0,-45 -22,-16 22,-16" fill="#1e293b" />
            <polygon points="0,-45 0,-16 22,-16" fill="#0f172a" />
            <polygon points="0,-45 16,-38 0,-32" fill="#10b981" />

            {/* Badge */}
            <g transform="translate(0, -56)">
              <rect x="-30" y="-7" width="60" height="15" rx="5" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
              <text x="0" y="3.5" textAnchor="middle" fill="#ecfdf5" fontSize="8.5" fontWeight="bold">
                TOWER LV.{kingdom.towerLevel}
              </text>
            </g>
          </g>

          {/* ─── F. FLIX PRANA RESERVOIR (Elixir Storage Spherical Tank) ─── */}
          <g
            id="flixPranaStorage"
            transform="translate(580, 180)"
            className="cursor-pointer transition-transform hover:scale-110 duration-200"
            onClick={() => handleBuildingClick("elixir")}
            onMouseEnter={() => setHoveredBuilding("elixir")}
            onMouseLeave={() => setHoveredBuilding(null)}
            filter={selectedBuilding === "elixir" || hoveredBuilding === "elixir" ? "url(#selectHalo)" : "url(#buildingShadow)"}
          >
            {/* Hexagonal Stone Pedestal */}
            <polygon points="0,-12 32,4 0,20 -32,4" fill="#334155" stroke="#1e293b" strokeWidth="2" />
            
            {/* Glowing Glass Sphere with Bubbling Purple Elixir */}
            <circle cx="0" cy="-16" r="26" fill="url(#elixirOrb)" stroke="#f472b6" strokeWidth="2" className="animate-pulse" />
            
            {/* Brass Reinforcement Ring & Rivets */}
            <ellipse cx="0" cy="-16" rx="26" ry="10" fill="none" stroke="#d97706" strokeWidth="2.5" />
            <line x1="0" y1="-42" x2="0" y2="10" stroke="#d97706" strokeWidth="2" />
            
            {/* Glass Specular Glare */}
            <ellipse cx="-8" cy="-24" rx="7" ry="4" fill="#ffffff" opacity="0.5" />
            <circle cx="10" cy="-12" r="3.5" fill="#fbcfe8" opacity="0.8" />
            
            {/* Badge */}
            <g transform="translate(0, -52)">
              <rect x="-24" y="-8" width="48" height="16" rx="5" fill="#701a75" stroke="#f472b6" strokeWidth="1.2" />
              <text x="0" y="3.5" textAnchor="middle" fill="#fdf4ff" fontSize="9" fontWeight="bold">
                ⚡ FLIX
              </text>
            </g>
          </g>

          {/* ─── G. KNOWLEDGE GOLD VAULT (Gold Treasury Bunker) ─── */}
          <g
            id="knowledgeGoldVault"
            transform="translate(340, 180)"
            className="cursor-pointer transition-transform hover:scale-110 duration-200"
            onClick={() => handleBuildingClick("gold")}
            onMouseEnter={() => setHoveredBuilding("gold")}
            onMouseLeave={() => setHoveredBuilding(null)}
            filter={selectedBuilding === "gold" || hoveredBuilding === "gold" ? "url(#selectHalo)" : "url(#buildingShadow)"}
          >
            {/* Heavy Stone Foundation */}
            <polygon points="0,-12 34,5 0,22 -34,5" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
            
            {/* Vault Body with Chiseled Corner Plates */}
            <polygon points="-28,-5 0,-20 28,-5 28,12 0,26 -28,12" fill="#334155" stroke="#64748b" strokeWidth="1.8" />
            
            {/* Open Roof overflowing with glittering Gold Bullion & Coins */}
            <ellipse cx="0" cy="-18" rx="24" ry="12" fill="url(#goldBarGrad)" stroke="#fef08a" strokeWidth="1" />
            <polygon points="-6,-28 0,-34 6,-28 0,-22" fill="#fef08a" />
            <circle cx="-10" cy="-18" r="4" fill="#fef08a" />
            <circle cx="8" cy="-16" r="4.5" fill="#fde047" />
            <circle cx="0" cy="-22" r="3" fill="#ffffff" opacity="0.8" />

            {/* Badge */}
            <g transform="translate(0, -50)">
              <rect x="-26" y="-8" width="52" height="16" rx="5" fill="#854d0e" stroke="#fbbf24" strokeWidth="1.2" />
              <text x="0" y="3.5" textAnchor="middle" fill="#fef08a" fontSize="9" fontWeight="bold">
                🪙 VAULT
              </text>
            </g>
          </g>

          {/* ─── H. SURYA HEAVY DEFENSE CANNON ─── */}
          <g
            id="suryaCannon"
            transform="translate(330, 290)"
            className="cursor-pointer transition-transform hover:scale-110 duration-200"
            onClick={() => handleBuildingClick("cannon")}
            onMouseEnter={() => setHoveredBuilding("cannon")}
            onMouseLeave={() => setHoveredBuilding(null)}
            filter={selectedBuilding === "cannon" || hoveredBuilding === "cannon" ? "url(#selectHalo)" : "url(#buildingShadow)"}
          >
            {/* Bronze Rotating Turntable Mount */}
            <polygon points="0,-10 26,4 0,16 -26,4" fill="#78350f" stroke="#b45309" strokeWidth="2" />
            <ellipse cx="0" cy="3" rx="20" ry="10" fill="#b45309" />
            
            {/* Cast-Iron Heavy Black Cannon Barrel */}
            <polygon points="-26,-4 16,-18 24,-6 -18,8" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <ellipse cx="-24" cy="2" rx="6" ry="10" fill="#020617" />
            
            {/* Stack of Iron Cannonballs */}
            <circle cx="16" cy="12" r="5" fill="#334155" />
            <circle cx="24" cy="14" r="5" fill="#1e293b" />
            <circle cx="20" cy="8" r="4.5" fill="#475569" />

            {/* Badge */}
            <g transform="translate(0, -28)">
              <rect x="-25" y="-7" width="50" height="15" rx="5" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
              <text x="0" y="3.5" textAnchor="middle" fill="#fef08a" fontSize="8.5" fontWeight="bold">
                💣 CANNON
              </text>
            </g>
          </g>

          {/* ─── I. SCHOLAR TRAINING BARRACKS & ARMY CAMP ─── */}
          <g
            id="scholarBarracks"
            transform="translate(590, 290)"
            className="cursor-pointer transition-transform hover:scale-105 duration-200"
            onClick={() => handleBuildingClick("camp")}
            onMouseEnter={() => setHoveredBuilding("camp")}
            onMouseLeave={() => setHoveredBuilding(null)}
            filter={selectedBuilding === "camp" || hoveredBuilding === "camp" ? "url(#selectHalo)" : "url(#buildingShadow)"}
          >
            {/* Dirt Training Ground */}
            <ellipse cx="0" cy="5" rx="34" ry="18" fill="#543310" stroke="#3b1d06" strokeWidth="2" />
            
            {/* Canvas Campaign Tent */}
            <polygon points="-16,-15 0,-30 16,-15 12,5 -12,5" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
            <polygon points="0,-30 16,-15 12,5 0,0" fill="#92400e" />
            <polygon points="-5,0 5,0 0,-15" fill="#451a03" />

            {/* Blazing Campfire with animated flame embers */}
            <circle cx="-16" cy="10" r="7" fill="#ea580c" className="animate-ping" opacity="0.6" />
            <circle cx="-16" cy="10" r="5" fill="#facc15" />
            <polygon points="-18,12 -14,12 -16,4" fill="#ffffff" />

            {/* Target Archery Dummy */}
            <line x1="18" y1="14" x2="18" y2="-4" stroke="#78350f" strokeWidth="3" />
            <ellipse cx="18" cy="2" rx="6" ry="4" fill="#d97706" />

            {/* Badge */}
            <g transform="translate(0, -38)">
              <rect x="-28" y="-7" width="56" height="15" rx="5" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
              <text x="0" y="3.5" textAnchor="middle" fill="#fef08a" fontSize="8.5" fontWeight="bold">
                ⛺ BARRACKS
              </text>
            </g>
          </g>

          {/* ─── J. CENTRAL GRAND TOWN HALL CITADEL (Clash Signature Fortress) ─── */}
          <g
            id="grandTownHallCitadel"
            transform="translate(460, 220)"
            className="cursor-pointer transition-transform hover:scale-105 duration-200"
            onClick={() => handleBuildingClick("castle")}
            onMouseEnter={() => setHoveredBuilding("castle")}
            onMouseLeave={() => setHoveredBuilding(null)}
            filter={selectedBuilding === "castle" || hoveredBuilding === "castle" ? "url(#selectHalo)" : "url(#buildingShadow)"}
          >
            {/* Foundation Stone Apron */}
            <polygon points="0,-38 68,0 0,38 -68,0" fill="#334155" stroke="#1e293b" strokeWidth="2.5" />

            {/* Tier 1 Ground Keep Walls */}
            <polygon points="-60,0 0,34 0,78 -60,44" fill="#334155" />
            <polygon points="0,34 60,0 60,44 0,78" fill="#1e293b" />
            {/* Chiseled Quoin Corner Accents */}
            <rect x="-60" y="10" width="8" height="6" fill="#64748b" />
            <rect x="-60" y="24" width="8" height="6" fill="#64748b" />
            <rect x="52" y="10" width="8" height="6" fill="#475569" />
            <rect x="52" y="24" width="8" height="6" fill="#475569" />

            {/* Arched Portcullis Gateway */}
            <polygon points="-16,42 16,24 16,70 -16,88" fill="#020617" />
            <ellipse cx="0" cy="38" rx="14" ry="9" fill="#f59e0b" opacity="0.45" />
            <line x1="-8" y1="46" x2="-8" y2="84" stroke="#f59e0b" strokeWidth="2" />
            <line x1="8" y1="36" x2="8" y2="76" stroke="#f59e0b" strokeWidth="2" />

            {/* Tier 2 Cantilevered Upper Hall */}
            <polygon points="-48,-24 0,-50 48,-24 0,2" fill="#64748b" />
            <polygon points="-48,-24 0,2 0,28 -48,2" fill="#475569" />
            <polygon points="0,2 48,-24 48,2 0,28" fill="#334155" />

            {/* Glowing Stained Glass Windows */}
            <rect x="-32" y="-12" width="10" height="14" rx="2" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            <rect x="22" y="-12" width="10" height="14" rx="2" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

            {/* Grand Sloped Terracotta Roof (Town Hall Signature) */}
            <polygon points="0,-82 -54,-40 0,-14 54,-40" fill="url(#thRoofRed)" />
            <polygon points="0,-82 54,-40 54,-34 0,-8" fill="#7f1d1d" />

            {/* Stone Chimney with Smoke Puffs */}
            <rect x="26" y="-75" width="12" height="24" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
            <circle cx="32" cy="-84" r="5" fill="#cbd5e1" opacity="0.5" className="animate-ping" />
            <circle cx="36" cy="-96" r="7" fill="#e2e8f0" opacity="0.35" />

            {/* Golden Kalash Finial / Spire */}
            <ellipse cx="0" cy="-86" rx="10" ry="7.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            <polygon points="0,-104 -4,-86 4,-86" fill="#d97706" />

            {/* Imperial Clan Pennant Flag */}
            <polygon points="0,-104 28,-95 0,-86" fill="#dc2626" />
            <text x="10" y="-92" fill="#fde047" fontSize="8" fontWeight="bold">⚔️</text>

            {/* Citadel Level Header Badge */}
            <g transform="translate(0, -115)">
              <rect x="-44" y="-9" width="88" height="18" rx="6" fill="#7f1d1d" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="0" y="4" textAnchor="middle" fill="#fef08a" fontSize="10" fontWeight="900" fontFamily="sans-serif">
                CITADEL LV.{kingdom.castleLevel}
              </text>
            </g>
          </g>
        </svg>

        {/* ─── BOTTOM-LEFT: ATTACK! BUTTON (CLASH OF CLANS STYLE) ─── */}
        <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 z-20">
          <button
            onClick={() => onNavigateTab ? onNavigateTab("arena") : undefined}
            className="group relative flex items-center gap-2.5 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-orange-500 text-slate-950 font-black font-display text-sm sm:text-base shadow-[0_8px_25px_rgba(239,68,68,0.55)] border-2 border-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer uppercase tracking-wider"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-950/30 flex items-center justify-center text-base sm:text-lg">
              ⚔️
            </div>
            <div className="text-left">
              <div className="leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">ATTACK!</div>
              <div className="text-[9px] sm:text-[10px] text-amber-200 font-sans font-bold">WAR ARENA</div>
            </div>
          </button>
        </div>

        {/* ─── BOTTOM-RIGHT: BAZAAR SHOP BUTTON (CLASH OF CLANS STYLE) ─── */}
        <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-20">
          <button
            onClick={() => onNavigateTab ? onNavigateTab("bazaar") : undefined}
            className="group relative flex items-center gap-2.5 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black font-display text-sm sm:text-base shadow-[0_8px_25px_rgba(245,158,11,0.55)] border-2 border-yellow-200 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer uppercase tracking-wider"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-950/20 flex items-center justify-center text-base sm:text-lg">
              🛍️
            </div>
            <div className="text-left">
              <div className="leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]">BAZAAR</div>
              <div className="text-[9px] sm:text-[10px] text-amber-950 font-sans font-bold">REALM SHOP</div>
            </div>
          </button>
        </div>
      </div>

      {/* ─── 3. BOTTOM BUILDING INSPECTION DOCK ─── */}
      <div className="mt-2 p-3 sm:p-4 rounded-2xl bg-slate-900/95 border border-amber-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
            {selectedBuilding === "castle" && "👑"}
            {selectedBuilding === "wall" && "🧱"}
            {selectedBuilding === "tower" && "🗼"}
            {selectedBuilding === "cannon" && "💣"}
            {selectedBuilding === "elixir" && "⚡"}
            {selectedBuilding === "gold" && "🪙"}
            {selectedBuilding === "camp" && "⛺"}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-slate-100 text-sm sm:text-base">
                {selectedBuilding === "castle" && `Royal Citadel (Level ${kingdom.castleLevel})`}
                {selectedBuilding === "wall" && `${wallTheme.label} (Level ${kingdom.wallLevel})`}
                {selectedBuilding === "tower" && `Arcane Defense Tower (Level ${kingdom.towerLevel})`}
                {selectedBuilding === "cannon" && "Surya Heavy Defense Cannon"}
                {selectedBuilding === "elixir" && "Flix Prana Reservoir (Capacity: 3,000)"}
                {selectedBuilding === "gold" && "Knowledge Treasury Vault (Full)"}
                {selectedBuilding === "camp" && "Scholar Training Barracks"}
              </h4>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0 font-bold">
                {selectedBuilding === "castle" || selectedBuilding === "wall" || selectedBuilding === "tower"
                  ? "UPGRADEABLE"
                  : "OPERATIONAL"}
              </Badge>
            </div>
            
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedBuilding === "castle" && `Reduces incoming enemy attack damage by -${defense.castleReduction} DMG.`}
              {selectedBuilding === "wall" && `Perimeter barrier providing -${defense.wallReduction} DMG fortification against enemy raids.`}
              {selectedBuilding === "tower" && `Elevated watchtower dealing -${defense.towerReduction} DMG suppression with active Astra beacon.`}
              {selectedBuilding === "cannon" && "Fires concentrated solar rounds against hostile quiz attackers."}
              {selectedBuilding === "elixir" && `Stores learning Flix harvested from successful quiz victories. Currently holding ${flixBalance} Flix.`}
              {selectedBuilding === "gold" && "Safeguards accumulated academic knowledge credits and semester achievements."}
              {selectedBuilding === "camp" && "Trains student scholars for PvP knowledge duels in the War Arena."}
            </p>
          </div>
        </div>

        {/* Action Controls for Selected Building */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t border-slate-800 sm:border-t-0">
          {(selectedBuilding === "castle" || selectedBuilding === "wall" || selectedBuilding === "tower") ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTriggerUpgrade(selectedBuilding)}
                className="text-xs font-bold border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 gap-1.5 rounded-xl"
              >
                <Info className="w-3.5 h-3.5" /> Stats
              </Button>

              <Button
                size="sm"
                onClick={() => handleTriggerUpgrade(selectedBuilding)}
                className="text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 gap-1.5 rounded-xl shadow-lg font-display"
              >
                <Hammer className="w-3.5 h-3.5" />
                Upgrade Structure
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => onNavigateTab ? onNavigateTab("bazaar") : undefined}
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5 rounded-xl"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              Visit Bazaar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
