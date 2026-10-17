import React from "react";
import { AstraWeapon } from "@/types/weapon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Zap,
  Shield,
  Swords,
  Check,
  Lock,
  Flame,
  Award,
  Crown,
  Share2,
} from "lucide-react";

interface WeaponDetailModalProps {
  weapon: AstraWeapon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwned: boolean;
  isEquipped: boolean;
  userFlux: number;
  onEquip: (weapon: AstraWeapon) => void;
  onPurchase: (weapon: AstraWeapon) => void;
}

export function WeaponDetailModal({
  weapon,
  open,
  onOpenChange,
  isOwned,
  isEquipped,
  userFlux,
  onEquip,
  onPurchase,
}: WeaponDetailModalProps) {
  if (!weapon) return null;

  const canAfford = userFlux >= weapon.cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 border border-primary/30 shadow-2xl">
        {/* Header Hero Banner with Dynamic Gradient Glow */}
        <div
          className={`p-6 sm:p-8 bg-gradient-to-br ${weapon.gradient} text-white relative overflow-hidden`}
        >
          {/* Animated Background Cosmic Particles Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/40 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* 3D Holographic Icon Container */}
            <div
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-black/40 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl shrink-0 animate-pulse"
              style={{
                boxShadow: `0 0 30px ${weapon.glowColor}`,
              }}
            >
              {weapon.icon}
            </div>

            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <Badge className="bg-white/20 hover:bg-white/30 text-white font-mono text-[10px] tracking-wider uppercase backdrop-blur-sm border-white/30">
                  {weapon.rarity}
                </Badge>
                <Badge className="bg-black/30 text-white/90 font-mono text-[10px] uppercase border-white/20">
                  {weapon.category.replace("_", " ")}
                </Badge>
                {isEquipped && (
                  <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] gap-1">
                    <Check className="h-3 w-3 stroke-[3]" /> EQUIPPED
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight drop-shadow-md">
                {weapon.name}
              </h2>

              <p className="text-base sm:text-lg font-serif font-bold text-amber-200 drop-shadow-xs">
                {weapon.sanskritName}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Mythology Lore */}
          <div className="space-y-1.5">
            <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Ancient Indian Mythology & Lore
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border/60">
              {weapon.lore}
            </p>
          </div>

          {/* Legendary Historical Wielders */}
          {weapon.wielders && weapon.wielders.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                Legendary Epic Wielders
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {weapon.wielders.map((w, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[11px] font-medium bg-background px-2.5 py-0.5 border-primary/20 text-foreground"
                  >
                    👑 {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sacred Mantra & Invocation */}
          {weapon.mantra && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 block">
                  Sacred Activation Verse / Mantra
                </span>
                <p className="text-foreground font-serif font-bold text-sm mt-0.5 italic">
                  "{weapon.mantra}"
                </p>
              </div>
            </div>
          )}

          {/* Combat & Cosmic Energy Stats */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border/80">
            <h4 className="text-[11px] uppercase font-bold text-foreground tracking-wider flex items-center justify-between">
              <span>Celestial Stat Metrics</span>
              <span className="text-[10px] font-mono text-muted-foreground">Calibrated Scale</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground">Destructive Power</span>
                  <span className="font-bold text-foreground">{weapon.stats.power} / 100</span>
                </div>
                <Progress value={weapon.stats.power} className="h-2 bg-muted" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground">Cosmic Radiance (Aura)</span>
                  <span className="font-bold text-foreground">{weapon.stats.radiance} / 100</span>
                </div>
                <Progress value={weapon.stats.radiance} className="h-2 bg-muted" />
              </div>

              <div className="flex justify-between text-[11px] p-2 rounded-lg bg-background border font-mono">
                <span className="text-muted-foreground">Effective Range</span>
                <span className="font-bold text-foreground">{weapon.stats.range}</span>
              </div>

              <div className="flex justify-between text-[11px] p-2 rounded-lg bg-background border font-mono">
                <span className="text-muted-foreground">Deployment Velocity</span>
                <span className="font-bold text-foreground">{weapon.stats.speed}</span>
              </div>
            </div>
          </div>

          {/* LMS Gamification Passive Buff */}
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-2.5">
            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">
                Active LMS Student Perk
              </span>
              <p className="text-foreground font-semibold text-xs mt-0.5">
                {weapon.passiveBuff}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="p-5 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-muted-foreground font-medium">Your Orbit Flux:</span>
            <Badge variant="outline" className="font-mono text-xs font-bold text-amber-500 border-amber-500/40 bg-amber-500/10">
              ⚡ {userFlux.toLocaleString()} FLUX
            </Badge>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>

            {isOwned ? (
              isEquipped ? (
                <Button variant="outline" size="sm" disabled className="gap-1.5 font-bold border-amber-500/40 text-amber-500">
                  <Check className="h-4 w-4 stroke-[3]" /> Actively Wielded
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    onEquip(weapon);
                    onOpenChange(false);
                  }}
                  className="gap-1.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Swords className="h-4 w-4" /> Equip Astra
                </Button>
              )
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  onPurchase(weapon);
                  onOpenChange(false);
                }}
                disabled={!canAfford}
                className={`gap-1.5 font-bold ${
                  canAfford
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                {!canAfford ? <Lock className="h-4 w-4" /> : <Zap className="h-4 w-4 fill-current" />}
                Unlock for ⚡ {weapon.cost} Flux
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
