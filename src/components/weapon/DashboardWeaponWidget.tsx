import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Swords, Flame, Sparkles, ChevronRight, Compass } from "lucide-react";
import { AstraWeapon } from "@/types/weapon";
import { getEquippedWeapon } from "@/services/weaponService";
import { getFluxBalance } from "@/services/themeService";

const RARITY_MAP: Record<string, { border: string; text: string; bg: string; badge: string; label: string }> = {
  divine: {
    border: "border-amber-500/50 hover:border-amber-400",
    text: "text-amber-500",
    bg: "bg-amber-500/10",
    badge: "bg-amber-500 text-slate-950 font-bold",
    label: "Divine Astra"
  },
  supreme: {
    border: "border-cyan-500/50 hover:border-cyan-400",
    text: "text-cyan-500",
    bg: "bg-cyan-500/10",
    badge: "bg-cyan-500 text-slate-950 font-bold",
    label: "Supreme Astra"
  },
  mythic: {
    border: "border-purple-500/50 hover:border-purple-400",
    text: "text-purple-500",
    bg: "bg-purple-500/10",
    badge: "bg-purple-500 text-white font-bold",
    label: "Mythic Shastra"
  },
  celestial: {
    border: "border-emerald-500/50 hover:border-emerald-400",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    badge: "bg-emerald-500 text-slate-950 font-bold",
    label: "Celestial"
  },
  legendary: {
    border: "border-orange-500/50 hover:border-orange-400",
    text: "text-orange-500",
    bg: "bg-orange-500/10",
    badge: "bg-orange-500 text-slate-950 font-bold",
    label: "Legendary"
  },
  ancient: {
    border: "border-slate-500/50 hover:border-slate-400",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    badge: "bg-slate-500 text-white font-bold",
    label: "Ancient Relic"
  }
};

export function DashboardWeaponWidget() {
  const [weapon, setWeapon] = useState<AstraWeapon>(() => getEquippedWeapon());
  const [, setFlux] = useState<number>(() => getFluxBalance());

  useEffect(() => {
    const handleEquipped = (e: any) => {
      if (e.detail) {
        setWeapon(e.detail);
      } else {
        setWeapon(getEquippedWeapon());
      }
    };

    const handleFlux = () => {
      setFlux(getFluxBalance());
    };

    window.addEventListener("orbit_weapon_equipped", handleEquipped);
    window.addEventListener("orbit_flux_updated", handleFlux);

    return () => {
      window.removeEventListener("orbit_weapon_equipped", handleEquipped);
      window.removeEventListener("orbit_flux_updated", handleFlux);
    };
  }, []);

  const rarityMeta = RARITY_MAP[weapon.rarity] || RARITY_MAP.ancient;

  return (
    <Card className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-card via-card/90 to-primary/5 shadow-md overflow-hidden relative group">
      {/* Subtle background cosmic radial glow */}
      <div
        className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none transition-all group-hover:opacity-30 bg-primary/20"
      />

      <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        {/* Left info & weapon avatar */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div
            className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-lg bg-gradient-to-br from-background/90 to-background/50 text-2xl sm:text-3xl transition-transform duration-300 group-hover:scale-105 ${rarityMeta.border}`}
          >
            <span className="drop-shadow-md select-none">{weapon.icon}</span>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground font-semibold flex items-center gap-1">
                <Swords className="h-3 w-3 text-primary" /> Active Celestial Weapon
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono px-2 py-0 border ${rarityMeta.badge}`}
              >
                {rarityMeta.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-medium bg-muted/60 capitalize">
                {weapon.category.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2">
              <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                {weapon.name}
              </h3>
              <span className="text-xs font-serif text-amber-500/90 font-medium shrink-0">
                ({weapon.sanskritName})
              </span>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-1 italic max-w-xl">
              "{weapon.mantra || weapon.passiveBuff}"
            </p>
          </div>
        </div>

        {/* Right metrics & CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
          {/* Quick Stat Bars */}
          <div className="hidden lg:flex flex-col gap-1.5 min-w-[140px] px-3 py-1.5 rounded-xl bg-background/50 border border-border/40 text-[11px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-red-500" /> Power
              </span>
              <span className="font-mono font-bold text-foreground">{weapon.stats.power}/100</span>
            </div>
            <Progress value={weapon.stats.power} className="h-1.5 bg-muted" />

            <div className="flex items-center justify-between text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Radiance
              </span>
              <span className="font-mono font-bold text-foreground">{weapon.stats.radiance}/100</span>
            </div>
            <Progress value={weapon.stats.radiance} className="h-1.5 bg-muted" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Link to="/student/armory" className="w-full sm:w-auto">
              <Button
                size="sm"
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold text-xs shadow-md touch-press"
              >
                <Swords className="h-3.5 w-3.5" />
                <span>Armory (31 Astras)</span>
                <ChevronRight className="h-3 w-3 opacity-70" />
              </Button>
            </Link>

            <Link to="/student/leaderboard" className="hidden sm:inline-block">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                title="View Astras equipped by top scholars on the Leaderboard"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Ranks</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
