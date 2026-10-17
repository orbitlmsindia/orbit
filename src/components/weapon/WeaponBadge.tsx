import React from "react";
import { AstraWeapon } from "@/types/weapon";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Shield, Zap } from "lucide-react";

interface WeaponBadgeProps {
  weapon: AstraWeapon;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export function WeaponBadge({ weapon, showDetails = false, size = "md", className = "", onClick }: WeaponBadgeProps) {
  const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
    divine: { bg: "bg-amber-500/15", text: "text-amber-500 dark:text-amber-400", border: "border-amber-500/40" },
    supreme: { bg: "bg-cyan-500/15", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/40" },
    mythic: { bg: "bg-purple-500/15", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/40" },
    celestial: { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/40" },
    legendary: { bg: "bg-orange-500/15", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/40" },
    ancient: { bg: "bg-slate-500/15", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/40" },
  };

  const colors = rarityColors[weapon.rarity] || rarityColors.legendary;

  const badgeContent = (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${colors.bg} ${colors.border} ${
        onClick ? "cursor-pointer hover:scale-105 active:scale-95 shadow-2xs" : ""
      } ${className}`}
      style={{
        boxShadow: `0 0 12px ${weapon.glowColor}25`,
      }}
    >
      <span className="text-sm shrink-0 drop-shadow-xs">{weapon.icon}</span>
      <div className="flex flex-col text-left leading-none">
        <span className={`font-bold font-sans tracking-tight ${size === "sm" ? "text-[11px]" : "text-xs"} ${colors.text}`}>
          {weapon.name}
        </span>
        {showDetails && (
          <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
            {weapon.sanskritName} • {weapon.rarity.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs space-y-2 border-primary/20 shadow-xl bg-popover/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{weapon.icon}</span>
              <div>
                <p className="font-bold text-xs text-foreground">{weapon.name}</p>
                <p className="text-[10px] text-primary font-serif font-bold">{weapon.sanskritName}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[9px] uppercase font-mono ${colors.border} ${colors.text}`}>
              {weapon.rarity}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
            {weapon.lore}
          </p>
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-medium text-foreground flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500 shrink-0" />
            <span>{weapon.passiveBuff}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
