import React, { useState, useEffect, useRef } from "react";
import { StudentKingdom, BattleAstraId } from "@/types/astravyuh";
import { BATTLE_ASTRAS } from "@/services/astravyuhService";
import { Shield, Swords, Zap, Flame, Droplets, Trophy, Star, Bomb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface CombatEvent {
  id: string;
  type: "strike" | "wall_breach" | "citadel_hit" | "counter_fire" | "astra_blast";
  text: string;
  damage: number;
  isCrit?: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
}

interface BattleWarCanvasProps {
  defender: StudentKingdom;
  attacker: StudentKingdom;
  currentWave: number;
  totalWaves: number;
  destructionPercent: number;
  starsEarned: number;
  activeCombatEvent: CombatEvent | null;
  onDeployTroop?: (troopType: string) => void;
  isAttacking: boolean;
  battleOver: boolean;
}

interface TroopSprite {
  id: string;
  type: "warrior" | "archer" | "wallbreaker" | "mage";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  state: "marching" | "attacking" | "exploding" | "cheering";
  frame: number;
}

interface ProjectileSprite {
  id: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: "cannonball" | "arrow" | "fireball" | "lightning";
}

export const BattleWarCanvas: React.FC<BattleWarCanvasProps> = ({
  defender,
  attacker,
  currentWave,
  totalWaves,
  destructionPercent,
  starsEarned,
  activeCombatEvent,
  onDeployTroop,
  isAttacking,
  battleOver,
}) => {
  const [screenShake, setScreenShake] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [troops, setTroops] = useState<TroopSprite[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileSprite[]>([]);
  const [citadelHp, setCitadelHp] = useState(100);
  const [wallHp, setWallHp] = useState(100);
  const [towerHp, setTowerHp] = useState(100);
  const [cannonAngle, setCannonAngle] = useState(0);

  // Initialize defense structures based on destruction percentage
  useEffect(() => {
    const remainingRatio = Math.max(0, 1 - destructionPercent / 100);
    setWallHp(Math.max(0, Math.floor(100 - destructionPercent * 1.5)));
    setTowerHp(Math.max(0, Math.floor(100 - destructionPercent * 1.2)));
    setCitadelHp(Math.max(0, Math.floor(remainingRatio * 100)));
  }, [destructionPercent]);

  // Handle incoming combat event
  useEffect(() => {
    if (!activeCombatEvent) return;

    // Trigger screen shake on heavy impacts
    if (activeCombatEvent.type === "wall_breach" || activeCombatEvent.type === "astra_blast" || activeCombatEvent.isCrit) {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 450);
    }

    // Add floating combat text
    const targetX = 400 + (Math.random() * 120 - 60);
    const targetY = 220 + (Math.random() * 80 - 40);
    const newText: FloatingText = {
      id: "ft_" + Date.now() + "_" + Math.random(),
      x: targetX,
      y: targetY,
      text: activeCombatEvent.text,
      color: activeCombatEvent.isCrit ? "#ef4444" : activeCombatEvent.type === "astra_blast" ? "#a855f7" : "#f59e0b",
      opacity: 1
    };

    setFloatingTexts(prev => [...prev.slice(-6), newText]);

    // Spawn attacking troops rushing toward enemy citadel
    const newTroops: TroopSprite[] = [
      {
        id: "t_wb_" + Date.now(),
        type: "wallbreaker",
        x: 180 + Math.random() * 40,
        y: 440 + Math.random() * 20,
        targetX: 340,
        targetY: 310,
        hp: 80,
        maxHp: 80,
        state: "marching",
        frame: 0
      },
      {
        id: "t_warrior_" + Date.now(),
        type: "warrior",
        x: 140 + Math.random() * 30,
        y: 460 + Math.random() * 30,
        targetX: 380,
        targetY: 280,
        hp: 120,
        maxHp: 120,
        state: "marching",
        frame: 0
      },
      {
        id: "t_archer_" + Date.now(),
        type: "archer",
        x: 220 + Math.random() * 40,
        y: 470,
        targetX: 310,
        targetY: 340,
        hp: 60,
        maxHp: 60,
        state: "attacking",
        frame: 0
      }
    ];

    setTroops(prev => [...prev.slice(-8), ...newTroops]);

    // Spawn projectile from attacker or defender
    if (activeCombatEvent.type === "counter_fire") {
      setProjectiles(prev => [
        ...prev,
        {
          id: "proj_" + Date.now(),
          startX: 540,
          startY: 230,
          currentX: 540,
          currentY: 230,
          targetX: 200,
          targetY: 450,
          progress: 0,
          type: "cannonball"
        }
      ]);
    } else {
      setProjectiles(prev => [
        ...prev,
        {
          id: "proj_atk_" + Date.now(),
          startX: 240,
          startY: 440,
          currentX: 240,
          currentY: 440,
          targetX: 430,
          targetY: 240,
          progress: 0,
          type: activeCombatEvent.type === "astra_blast" ? "lightning" : "arrow"
        }
      ]);
    }
  }, [activeCombatEvent]);

  // Animation ticker for marching troops, projectiles, and floating text fade
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Update floating texts
      setFloatingTexts(prev =>
        prev
          .map(ft => ({ ...ft, y: ft.y - 1.8, opacity: ft.opacity - 0.04 }))
          .filter(ft => ft.opacity > 0)
      );

      // 2. Animate projectiles
      setProjectiles(prev =>
        prev
          .map(p => {
            const nextProgress = p.progress + 0.12;
            const currentX = p.startX + (p.targetX - p.startX) * nextProgress;
            const currentY = p.startY + (p.targetY - p.startY) * nextProgress;
            return { ...p, progress: nextProgress, currentX, currentY };
          })
          .filter(p => p.progress < 1)
      );

      // 3. Animate troops marching towards target
      setTroops(prev =>
        prev.map(t => {
          const dx = t.targetX - t.x;
          const dy = t.targetY - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 10) {
            return { ...t, state: "attacking", frame: (t.frame + 1) % 4 };
          }
          return {
            ...t,
            x: t.x + (dx / dist) * 3,
            y: t.y + (dy / dist) * 2,
            frame: (t.frame + 1) % 4
          };
        })
      );
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const astraInfo = attacker.equippedAstraId ? BATTLE_ASTRAS[attacker.equippedAstraId] : null;

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-slate-950 shadow-2xl transition-transform ${screenShake ? "animate-bounce" : ""}`}>
      {/* ─── TOP WAR HUD OVERLAY (Clash of Clans War Banner) ─── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/70 to-transparent pointer-events-none">
        
        {/* Left: Star Destruction Percentage */}
        <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-amber-500/30 shadow-lg">
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(starNum => (
              <Star
                key={starNum}
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${
                  starsEarned >= starNum
                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] scale-110"
                    : "text-slate-600 fill-slate-800"
                }`}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-slate-700/60" />

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-amber-400">
                {destructionPercent}%
              </span>
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                Damage
              </span>
            </div>
            {/* Miniature destruction bar */}
            <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-700 mt-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-300"
                style={{ width: `${Math.min(100, destructionPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Wave Indicator */}
        <div className="hidden sm:flex flex-col items-center bg-slate-900/85 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-slate-700 shadow-md">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            Tactical Wave
          </span>
          <span className="text-sm font-black text-slate-100 font-mono">
            {currentWave + 1} of {totalWaves}
          </span>
        </div>

        {/* Right: Enemy Target Defender Base Info */}
        <div className="flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-red-500/30 shadow-lg">
          <div className="w-8 h-8 rounded-full bg-red-950 border border-red-500/50 flex items-center justify-center text-sm shadow-inner font-bold text-red-200">
            🏰
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-slate-100 truncate max-w-[120px] sm:max-w-[160px]">
              {defender.studentName}
            </div>
            <div className="text-[10px] text-red-400 font-mono flex items-center justify-end gap-1">
              <span>Town Hall Lv.{defender.castleLevel}</span>
              <span>•</span>
              <span>Wall Lv.{defender.wallLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ISOMETRIC WAR BATTLEFIELD SVG ─── */}
      <svg
        viewBox="0 0 840 520"
        className="w-full h-auto select-none block"
        style={{ minHeight: "360px", background: "radial-gradient(circle at 50% 50%, #2f6916 0%, #1e450e 70%, #122b08 100%)" }}
      >
        <defs>
          {/* Checkered Grass Tile Patterns */}
          <pattern id="warGrassPattern" width="60" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
            <polygon points="30,0 60,15 30,30 0,15" fill="#4d9926" />
            <polygon points="30,30 60,45 30,60 0,45" fill="#418220" />
          </pattern>

          {/* Gradients */}
          <linearGradient id="wallBasalt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="wallLavaVein" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          <linearGradient id="crystalGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#6b21a8" />
          </linearGradient>

          <linearGradient id="citadelRoof" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>

          <radialGradient id="cannonFlash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="1" />
            <stop offset="60%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>

          {/* Shadow Filter */}
          <filter id="warShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="4" dy="8" stdDeviation="5" floodColor="#091305" floodOpacity="0.65" />
          </filter>
        </defs>

        {/* ─── 1. BATTLEFIELD BASE TURF ─── */}
        <polygon points="420,30 810,225 420,490 30,225" fill="#3b771e" />
        <polygon points="420,40 790,225 420,475 50,225" fill="url(#warGrassPattern)" />

        {/* Outer Red Scorch Boundary (Deployment Line) */}
        <polygon
          points="420,20 830,225 420,510 10,225"
          fill="none"
          stroke="#ea580c"
          strokeWidth="3"
          strokeDasharray="10,6"
          opacity="0.75"
        />

        {/* Cobblestone Crossroad to Citadel */}
        <polygon points="420,110 460,130 260,370 220,350" fill="#64748b" opacity="0.6" />
        <polygon points="380,130 420,110 620,350 580,370" fill="#64748b" opacity="0.6" />

        {/* ─── 2. ENEMY PERIMETER WALLS (Lvl 4/5 Clash-Inspired) ─── */}
        <g id="enemyWalls" filter="url(#warShadow)">
          {/* North-East Wall Segment */}
          <polygon points="420,100 580,180 570,195 410,115" fill={wallHp > 0 ? "url(#wallBasalt)" : "#475569"} />
          {wallHp > 0 && defender.wallLevel >= 4 && (
            <polygon points="420,95 580,175 575,185 415,105" fill="url(#wallLavaVein)" opacity="0.8" />
          )}

          {/* North-West Wall Segment */}
          <polygon points="420,100 260,180 270,195 430,115" fill={wallHp > 0 ? "url(#wallBasalt)" : "#475569"} />

          {/* South-East Wall Segment */}
          <polygon points="580,180 500,280 485,270 565,170" fill={wallHp > 0 ? "url(#wallBasalt)" : "#475569"} />

          {/* South-West Wall Segment (Front Breach Section) */}
          {wallHp > 40 ? (
            <polygon points="260,180 340,280 355,270 275,170" fill="url(#wallBasalt)" />
          ) : (
            // Crumbling rubble / Breached gap
            <g>
              <ellipse cx="300" cy="230" rx="30" ry="12" fill="#1e293b" />
              <polygon points="280,225 295,215 305,230 285,235" fill="#475569" />
              <polygon points="310,230 325,220 335,235 315,240" fill="#334155" />
              <text x="300" y="245" fill="#f97316" fontSize="10" fontWeight="bold" textAnchor="middle">
                💥 BREACHED
              </text>
            </g>
          )}

          {/* Wall Corner Spikes (Amethyst crystals or Magma horns) */}
          {[
            { x: 420, y: 95 },
            { x: 580, y: 175 },
            { x: 260, y: 175 },
            { x: 500, y: 275 }
          ].map((pt, i) => (
            <g key={i}>
              <polygon
                points={`${pt.x},${pt.y - 18} ${pt.x + 8},${pt.y} ${pt.x},${pt.y + 6} ${pt.x - 8},${pt.y}`}
                fill={defender.wallLevel >= 5 ? "url(#wallLavaVein)" : "url(#crystalGlow)"}
              />
            </g>
          ))}
        </g>

        {/* ─── 3. ENEMY CANNON (Front-Right Defense) ─── */}
        <g id="enemyCannon" transform="translate(520, 240)" filter="url(#warShadow)">
          {/* Bronze Turntable Mount */}
          <ellipse cx="0" cy="15" rx="26" ry="14" fill="#78350f" />
          <ellipse cx="0" cy="12" rx="22" ry="11" fill="#b45309" />

          {/* Heavy Cast-Iron Barrel */}
          <polygon
            points="-22,-5 15,-20 22,-8 -15,7"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          {/* Muzzle Opening */}
          <ellipse cx="-20" cy="-2" rx="6" ry="10" fill="#020617" />

          {/* Stack of Cannonballs */}
          <circle cx="16" cy="12" r="5" fill="#334155" />
          <circle cx="24" cy="14" r="5" fill="#1e293b" />
          <circle cx="20" cy="8" r="4.5" fill="#475569" />

          {/* HP Bar */}
          <rect x="-24" y="-30" width="48" height="5" rx="2" fill="#0f172a" />
          <rect x="-23" y="-29" width={Math.max(0, 46 * (towerHp / 100))} height="3" rx="1.5" fill="#ef4444" />
        </g>

        {/* ─── 4. ENEMY ARCHER TOWER (North Watchtower) ─── */}
        <g id="enemyArcherTower" transform="translate(290, 140)" filter="url(#warShadow)">
          {/* Timber Stilts & Cross Bracing */}
          <line x1="-15" y1="50" x2="-8" y2="0" stroke="#78350f" strokeWidth="4" />
          <line x1="15" y1="50" x2="8" y2="0" stroke="#78350f" strokeWidth="4" />
          <line x1="-14" y1="35" x2="14" y2="15" stroke="#92400e" strokeWidth="2.5" />
          <line x1="14" y1="35" x2="-14" y2="15" stroke="#92400e" strokeWidth="2.5" />

          {/* Octagonal Wooden Fighting Platform */}
          <polygon points="-24,-5 0,-15 24,-5 0,5" fill="#b45309" />
          <polygon points="-24,-5 24,-5 24,0 -24,0" fill="#78350f" />

          {/* Archer Archer on Platform */}
          <circle cx="0" cy="-14" r="5" fill="#fed7aa" />
          <polygon points="-4,-9 4,-9 6,0 -6,0" fill="#15803d" />
          <line x1="4" y1="-10" x2="12" y2="-6" stroke="#f59e0b" strokeWidth="2" />

          {/* Tower Conical Roof Spire */}
          <polygon points="0,-42 -20,-16 20,-16" fill="#1e293b" />
          <polygon points="0,-42 0,-16 20,-16" fill="#0f172a" />
          {/* Banner */}
          <polygon points="0,-42 16,-36 0,-30" fill="#dc2626" />

          {/* HP Bar */}
          <rect x="-20" y="-52" width="40" height="4" rx="2" fill="#0f172a" />
          <rect x="-19" y="-51" width={Math.max(0, 38 * (towerHp / 100))} height="2" rx="1" fill="#ef4444" />
        </g>

        {/* ─── 5. CENTRAL ROYAL CITADEL (Enemy Town Hall Keep) ─── */}
        <g id="enemyCitadel" transform="translate(420, 200)" filter="url(#warShadow)">
          {/* Smoke from Chimney */}
          <ellipse cx="28" cy="-55" rx="6" ry="4" fill="#94a3b8" opacity="0.4" />
          <ellipse cx="32" cy="-65" rx="9" ry="6" fill="#cbd5e1" opacity="0.3" />

          {/* Base Stone Keep Walls */}
          <polygon points="-55,0 0,-30 55,0 0,30" fill="#475569" />
          {/* Left facade */}
          <polygon points="-55,0 0,30 0,75 -55,45" fill="#334155" />
          {/* Right facade */}
          <polygon points="0,30 55,0 55,45 0,75" fill="#1e293b" />

          {/* Arched Portcullis Entrance */}
          <polygon points="-12,42 12,30 12,65 -12,77" fill="#020617" />
          <ellipse cx="0" cy="38" rx="12" ry="8" fill="#f59e0b" opacity="0.4" />

          {/* Tier 2 Keep Floor */}
          <polygon points="-42,-20 0,-44 42,-20 0,4" fill="#64748b" />
          <polygon points="-42,-20 0,4 0,30 -42,6" fill="#475569" />
          <polygon points="0,4 42,-20 42,6 0,30" fill="#334155" />

          {/* Sloped Red/Gold Terracotta Roof (Town Hall Signature) */}
          <polygon points="0,-72 -48,-32 0,-10 48,-32" fill="url(#citadelRoof)" />
          <polygon points="0,-72 48,-32 48,-26 0,-6" fill="#7f1d1d" />

          {/* Golden Dome / Kalash Finial */}
          <ellipse cx="0" cy="-76" rx="9" ry="7" fill="#fbbf24" />
          <polygon points="0,-92 -3,-76 3,-76" fill="#d97706" />

          {/* Fluttering House Pennant */}
          <polygon points="0,-92 24,-84 0,-76" fill="#dc2626" />

          {/* Fire / Damage Overlay if Citadel under heavy attack */}
          {citadelHp < 70 && (
            <g>
              <polygon points="-20,-10 -10,-35 0,-15 10,-40 20,-10" fill="#f97316" opacity="0.85" />
              <polygon points="-12,-15 -5,-30 0,-18 6,-32 12,-15" fill="#fde047" opacity="0.9" />
            </g>
          )}

          {/* Central Town Hall HP Bar */}
          <g transform="translate(0, -104)">
            <rect x="-42" y="0" width="84" height="8" rx="4" fill="#020617" stroke="#475569" strokeWidth="1" />
            <rect
              x="-40"
              y="2"
              width={Math.max(0, 80 * (citadelHp / 100))}
              height="4"
              rx="2"
              fill={citadelHp > 50 ? "#22c55e" : citadelHp > 25 ? "#f59e0b" : "#ef4444"}
            />
            <text x="0" y="-3" fill="#f8fafc" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
              TOWN HALL {citadelHp}% HP
            </text>
          </g>
        </g>

        {/* ─── 6. FLIX PRANA & GOLD STORAGES (Resource Buildings) ─── */}
        <g id="elixirStorage" transform="translate(560, 140)" filter="url(#warShadow)">
          {/* Pedestal */}
          <ellipse cx="0" cy="18" rx="20" ry="10" fill="#334155" />
          {/* Glass Sphere containing purple Elixir */}
          <circle cx="0" cy="0" r="18" fill="url(#crystalGlow)" opacity="0.85" />
          <ellipse cx="-5" cy="-6" rx="6" ry="4" fill="#ffffff" opacity="0.4" />
          <text x="0" y="5" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
            ⚡
          </text>
        </g>

        <g id="goldStorage" transform="translate(280, 260)" filter="url(#warShadow)">
          {/* Reinforced Vault with gold coins */}
          <polygon points="-20,5 0,-5 20,5 0,15" fill="#78350f" />
          <polygon points="-20,5 0,15 0,28 -20,18" fill="#451a03" />
          <polygon points="0,15 20,5 20,18 0,28" fill="#292524" />
          {/* Piles of Gold */}
          <circle cx="-4" cy="2" r="5" fill="#f59e0b" />
          <circle cx="5" cy="4" r="6" fill="#fbbf24" />
          <circle cx="0" cy="-2" r="5" fill="#d97706" />
          <text x="0" y="32" fill="#fbbf24" fontSize="9" fontWeight="bold" textAnchor="middle">
            🪙 VAULT
          </text>
        </g>

        {/* ─── 7. ANIMATED MARCHING / ATTACKING TROOPS ─── */}
        {troops.map(t => (
          <g key={t.id} transform={`translate(${t.x}, ${t.y})`} filter="url(#warShadow)">
            {t.type === "warrior" && (
              <g>
                {/* Shadow */}
                <ellipse cx="0" cy="6" rx="8" ry="4" fill="rgba(0,0,0,0.4)" />
                {/* Legs */}
                <line x1="-3" y1="0" x2="-3" y2="5" stroke="#78350f" strokeWidth="2.5" />
                <line x1="3" y1="0" x2="3" y2="5" stroke="#78350f" strokeWidth="2.5" />
                {/* Body & Armor */}
                <polygon points="-6,-6 6,-6 5,1 -5,1" fill="#dc2626" />
                <circle cx="0" cy="-10" r="5" fill="#fed7aa" />
                {/* Golden Helmet */}
                <polygon points="-5,-12 0,-18 5,-12" fill="#fbbf24" />
                {/* Sword & Shield */}
                <line x1="6" y1="-8" x2="14" y2="-14" stroke="#e2e8f0" strokeWidth="2.5" />
                <ellipse cx="-6" cy="-4" rx="4" ry="7" fill="#f59e0b" />
              </g>
            )}

            {t.type === "wallbreaker" && (
              <g>
                {/* Sprinting Skeleton with Giant Bomb */}
                <ellipse cx="0" cy="6" rx="10" ry="5" fill="rgba(0,0,0,0.5)" />
                {/* Skeleton Bones */}
                <line x1="-2" y1="-2" x2="-4" y2="5" stroke="#e2e8f0" strokeWidth="2" />
                <line x1="2" y1="-2" x2="4" y2="5" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx="-1" cy="-8" r="4.5" fill="#f8fafc" />
                {/* Massive Barrel Bomb */}
                <circle cx="4" cy="-6" r="8" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                {/* Sparking Fuse */}
                <path d="M 8,-12 Q 12,-16 14,-14" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <circle cx="14" cy="-14" r="2.5" fill="#ef4444" />
              </g>
            )}

            {t.type === "archer" && (
              <g>
                <ellipse cx="0" cy="5" rx="7" ry="3.5" fill="rgba(0,0,0,0.35)" />
                {/* Green Cloaked Archer */}
                <polygon points="-5,-5 5,-5 4,2 -4,2" fill="#16a34a" />
                <circle cx="0" cy="-9" r="4.5" fill="#fde68a" />
                <polygon points="-4,-11 0,-16 4,-11" fill="#15803d" />
                {/* Bow */}
                <path d="M 6,-14 Q 10,-7 6,0" fill="none" stroke="#b45309" strokeWidth="2" />
                <line x1="6" y1="-14" x2="6" y2="0" stroke="#f1f5f9" strokeWidth="1" />
              </g>
            )}
          </g>
        ))}

        {/* ─── 8. ANIMATED PROJECTILES (Arrows, Cannonballs, Lightning) ─── */}
        {projectiles.map(p => (
          <g key={p.id} transform={`translate(${p.currentX}, ${p.currentY})`}>
            {p.type === "cannonball" && (
              <g>
                <circle cx="0" cy="0" r="6" fill="#020617" />
                <circle cx="-1.5" cy="-1.5" r="2" fill="#64748b" />
                {/* Smoke Trail */}
                <circle cx="4" cy="3" r="3" fill="#cbd5e1" opacity="0.4" />
                <circle cx="8" cy="6" r="4" fill="#94a3b8" opacity="0.25" />
              </g>
            )}

            {p.type === "arrow" && (
              <g transform="rotate(45)">
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#f59e0b" strokeWidth="2.5" />
                <polygon points="12,-3 18,0 12,3" fill="#e2e8f0" />
                <polygon points="-12,-3 -16,0 -12,3" fill="#dc2626" />
              </g>
            )}

            {p.type === "lightning" && (
              <g>
                <polygon points="-4,-20 8,-4 -1,0 6,18 -10,2 -2,0" fill="#c084fc" />
                <circle cx="0" cy="0" r="14" fill="#e879f9" opacity="0.35" />
              </g>
            )}
          </g>
        ))}

        {/* ─── 9. FLOATING COMBAT TEXT & NOTIFICATIONS ─── */}
        {floatingTexts.map(ft => (
          <g key={ft.id} transform={`translate(${ft.x}, ${ft.y})`} opacity={ft.opacity}>
            <text
              x="0"
              y="0"
              fill={ft.color}
              fontSize="16"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
              stroke="#020617"
              strokeWidth="3"
              paintOrder="stroke fill"
            >
              {ft.text}
            </text>
          </g>
        ))}
      </svg>

      {/* ─── BOTTOM COMBAT STATUS BAR ─── */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold text-xs">
            {astraInfo ? astraInfo.name : "Agni Battle Core"}
          </Badge>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Troop deployment active • Answer questions to trigger siege strike waves!
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            <Zap className="w-3.5 h-3.5" /> Troops Ready
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-bold">
            ⚔️ Attack in Progress
          </span>
        </div>
      </div>
    </div>
  );
};
