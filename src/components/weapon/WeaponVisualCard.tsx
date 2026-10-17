import React from "react";
import { AstraWeapon } from "@/types/weapon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Shield, Sparkles, Check, Lock, Swords, ChevronRight, Eye } from "lucide-react";

interface WeaponVisualCardProps {
  weapon: AstraWeapon;
  isOwned: boolean;
  isEquipped: boolean;
  userFlux: number;
  onEquip?: (weapon: AstraWeapon) => void;
  onPurchase?: (weapon: AstraWeapon) => void;
  onInspect?: (weapon: AstraWeapon) => void;
  compact?: boolean;
}

export function WeaponVisualCard({
  weapon,
  isOwned,
  isEquipped,
  userFlux,
  onEquip,
  onPurchase,
  onInspect,
  compact = false,
}: WeaponVisualCardProps) {
  const canAfford = userFlux >= weapon.cost;

  const rarityStyles: Record<string, { border: string; text: string; bg: string; badge: string }> = {
    divine: {
      border: "border-amber-500/50 hover:border-amber-400",
      text: "text-amber-500",
      bg: "bg-amber-500/10",
      badge: "bg-amber-500 text-slate-950 font-bold",
    },
    supreme: {
      border: "border-cyan-500/50 hover:border-cyan-400",
      text: "text-cyan-500",
      bg: "bg-cyan-500/10",
      badge: "bg-cyan-500 text-slate-950 font-bold",
    },
    mythic: {
      border: "border-purple-500/50 hover:border-purple-400",
      text: "text-purple-500",
      bg: "bg-purple-500/10",
      badge: "bg-purple-500 text-white font-bold",
    },
    celestial: {
      border: "border-emerald-500/50 hover:border-emerald-400",
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
      badge: "bg-emerald-500 text-slate-950 font-bold",
    },
    legendary: {
      border: "border-orange-500/50 hover:border-orange-400",
      text: "text-orange-500",
      bg: "bg-orange-500/10",
      badge: "bg-orange-500 text-slate-950 font-bold",
    },
    ancient: {
      border: "border-slate-500/50 hover:border-slate-400",
      text: "text-slate-400",
      bg: "bg-slate-500/10",
      badge: "bg-slate-600 text-white font-bold",
    },
  };

  const style = rarityStyles[weapon.rarity] || rarityStyles.legendary;

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 group flex flex-col justify-between border ${
        isEquipped
          ? "ring-2 ring-amber-500 shadow-lg shadow-amber-500/20 border-amber-500"
          : style.border
      } bg-card/95 hover:shadow-xl`}
      style={{
        boxShadow: isEquipped
          ? `0 0 24px ${weapon.glowColor}40`
          : undefined,
      }}
    >
      {/* Top Gradient Banner / Cosmic Glow */}
      <div className={`h-2.5 w-full bg-gradient-to-r ${weapon.gradient}`} />

      {/* Equipped Badge Tag */}
      {isEquipped && (
        <div className="absolute top-4 right-4 z-10">
          <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] tracking-wide gap-1 shadow-sm px-2 py-0.5">
            <Check className="h-3 w-3 stroke-[3]" /> EQUIPPED
          </Badge>
        </div>
      )}

      <CardContent className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-4">
        {/* Header: Icon, Titles & Rarity */}
        <div>
          <div className="flex items-start gap-3">
            {/* Visual Icon Box */}
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shadow-md border ${style.border} ${style.bg} shrink-0 group-hover:scale-105 transition-transform duration-300`}
              style={{
                boxShadow: `0 0 16px ${weapon.glowColor}30`,
              }}
            >
              {weapon.icon}
            </div>

            <div className="space-y-0.5 flex-1 pr-6">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={`text-[9px] uppercase font-mono px-1.5 py-0 ${style.text} border-current`}>
                  {weapon.rarity}
                </Badge>
                <Badge variant="secondary" className="text-[9px] uppercase font-mono px-1.5 py-0">
                  {weapon.category.replace('_', ' ')}
                </Badge>
              </div>

              <h3 className="font-bold text-sm sm:text-base text-foreground font-display tracking-tight group-hover:text-primary transition-colors">
                {weapon.name}
              </h3>

              <p className="text-xs font-serif font-bold text-amber-600 dark:text-amber-400 italic">
                {weapon.sanskritName}
              </p>
            </div>
          </div>

          {/* Lore Snippet */}
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
            {weapon.lore}
          </p>
        </div>

        {/* Mantra Pill (if present) */}
        {weapon.mantra && (
          <div className="px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/60 text-[11px] font-serif text-muted-foreground italic flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="truncate">{weapon.mantra}</span>
          </div>
        )}

        {/* Weapon Stats Bar */}
        <div className="space-y-2 p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Destructive Power</span>
              <span className="font-bold text-foreground">{weapon.stats.power}/100</span>
            </div>
            <Progress value={weapon.stats.power} className="h-1.5 bg-muted" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Cosmic Radiance</span>
              <span className="font-bold text-foreground">{weapon.stats.radiance}/100</span>
            </div>
            <Progress value={weapon.stats.radiance} className="h-1.5 bg-muted" />
          </div>

          <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] text-muted-foreground border-t border-border/40 font-mono">
            <div>
              <span className="opacity-70">Range: </span>
              <span className="text-foreground font-semibold">{weapon.stats.range}</span>
            </div>
            <div>
              <span className="opacity-70">Speed: </span>
              <span className="text-foreground font-semibold">{weapon.stats.speed}</span>
            </div>
          </div>
        </div>

        {/* Passive LMS Buff Box */}
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border border-amber-500/20 text-xs flex items-start gap-2">
          <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 block">
              Active Passive Buff
            </span>
            <p className="text-foreground font-medium text-[11px] leading-snug">
              {weapon.passiveBuff}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t flex items-center justify-between gap-2">
          {onInspect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInspect(weapon)}
              className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground gap-1"
            >
              <Eye className="h-3.5 w-3.5" /> Lore
            </Button>
          )}

          {isOwned ? (
            isEquipped ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 w-full sm:w-auto"
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Wielding Active
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => onEquip && onEquip(weapon)}
                className="h-8 text-xs font-bold w-full sm:w-auto bg-primary hover:bg-primary/90"
              >
                <Swords className="h-3.5 w-3.5 mr-1" /> Equip Astra
              </Button>
            )
          ) : (
            <Button
              variant={canAfford ? "default" : "outline"}
              size="sm"
              onClick={() => onPurchase && onPurchase(weapon)}
              disabled={!canAfford}
              className={`h-8 text-xs font-bold w-full sm:w-auto gap-1 shadow-sm ${
                canAfford
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              {!canAfford ? <Lock className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5 fill-current" />}
              <span>Unlock ⚡ {weapon.cost}</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
