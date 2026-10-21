import React from "react";
import { BattleAstra, BattleAstraId } from "@/types/astravyuh";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Shield, Swords, Sparkles, Check, CheckCircle2 } from "lucide-react";

interface AstraArsenalCardProps {
  astra: BattleAstra;
  isOwned: boolean;
  isEquipped: boolean;
  flixBalance: number;
  onEquip: (id: BattleAstraId) => void;
  onUnequip: () => void;
  onPurchase: (id: BattleAstraId) => void;
}

export const AstraArsenalCard: React.FC<AstraArsenalCardProps> = ({
  astra,
  isOwned,
  isEquipped,
  flixBalance,
  onEquip,
  onUnequip,
  onPurchase
}) => {
  const canAfford = flixBalance >= astra.cost;

  return (
    <Card
      className={`relative overflow-hidden border transition-all duration-300 ${
        isEquipped
          ? "border-amber-400 bg-slate-900/95 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/50"
          : isOwned
          ? "border-slate-800 bg-slate-900/80 hover:border-slate-700"
          : "border-slate-800/80 bg-slate-950/80 hover:border-amber-500/30"
      }`}
    >
      {/* Top Banner Gradient */}
      <div className={`h-2 w-full bg-gradient-to-r ${astra.gradient}`} />

      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Header: Icon, Name & Sanskrit Name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border ${astra.accentBg}`}
              style={{ borderColor: astra.glowColor }}
            >
              {astra.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-100 font-display">
                  {astra.name}
                </h3>
                {isEquipped && (
                  <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0 h-4">
                    ACTIVE
                  </Badge>
                )}
              </div>
              <p className="text-xs font-serif text-amber-400/90 tracking-wide">
                {astra.sanskritName}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="text-[10px] font-mono uppercase tracking-wider text-slate-400 border-slate-700"
          >
            {astra.element}
          </Badge>
        </div>

        {/* Ability Pill */}
        <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800/80 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Battle Ability
          </div>
          <p className="text-xs font-semibold text-slate-200">
            {astra.ability}
          </p>
        </div>

        {/* Lore Snippet */}
        <p className="text-xs text-slate-400 italic line-clamp-2 leading-relaxed">
          "{astra.lore}"
        </p>

        {/* Action Controls */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {isOwned ? (
            isEquipped ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnequip}
                className="w-full text-xs font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Equipped (Tap to Unequip)
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onEquip(astra.id)}
                className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md"
              >
                <Swords className="w-3.5 h-3.5 mr-1.5" />
                Equip Astra
              </Button>
            )
          ) : (
            <Button
              size="sm"
              onClick={() => onPurchase(astra.id)}
              disabled={!canAfford}
              className={`w-full text-xs font-bold ${
                canAfford
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 shadow-md"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Zap className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" />
              {canAfford ? `Unlock for ⚡ ${astra.cost} Flix` : `Need ⚡ ${astra.cost} Flix`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
