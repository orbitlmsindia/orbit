import React from "react";

interface BattleVFXProps {
  element: "fire" | "water" | "lightning" | "clash";
  isActive: boolean;
}

export const BattleVFX: React.FC<BattleVFXProps> = ({ element, isActive }) => {
  if (!isActive) return null;

  if (element === "fire") {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20 animate-in fade-in zoom-in duration-300">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Outer Fire Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 opacity-30 blur-2xl animate-pulse" />
          {/* Fire Core Icon & Rays */}
          <div className="relative flex flex-col items-center animate-bounce">
            <span className="text-6xl drop-shadow-[0_0_25px_#f97316]">🔥</span>
            <div className="mt-2 px-3 py-1 rounded-full bg-orange-950/80 border border-orange-500/50 text-orange-300 text-xs font-mono tracking-wider font-bold shadow-lg">
              AGNI FLAME STRIKE (+10 ATK)
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (element === "lightning") {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20 animate-in fade-in zoom-in duration-300">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Lightning Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 opacity-35 blur-2xl animate-ping" />
          {/* Thunderbolt Core */}
          <div className="relative flex flex-col items-center">
            <span className="text-6xl drop-shadow-[0_0_30px_#eab308] animate-pulse">⚡</span>
            <div className="mt-2 px-3 py-1 rounded-full bg-yellow-950/80 border border-yellow-500/50 text-yellow-300 text-xs font-mono tracking-wider font-bold shadow-lg">
              VAJRA THUNDERBOLT (+15 CRIT)
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (element === "water") {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20 animate-in fade-in zoom-in duration-300">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Oceanic Tidal Shield */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-700 opacity-30 blur-2xl animate-pulse" />
          {/* Water Barrier */}
          <div className="relative flex flex-col items-center">
            <span className="text-6xl drop-shadow-[0_0_25px_#06b6d4]">🌊</span>
            <div className="mt-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-mono tracking-wider font-bold shadow-lg">
              VARUNA DELUGE SHIELD (-10 DMG)
            </div>
          </div>
        </div>
      </div>
    );
  }

  // General Clash VFX
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20 animate-in fade-in zoom-in duration-300">
      <div className="relative flex flex-col items-center">
        <span className="text-5xl animate-bounce">⚔️</span>
        <div className="mt-2 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-mono tracking-wider font-bold">
          CITADEL BREACH ASSAULT
        </div>
      </div>
    </div>
  );
};
