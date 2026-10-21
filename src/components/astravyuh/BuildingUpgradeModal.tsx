import React, { useState } from "react";
import { StructureType, StudentKingdom } from "@/types/astravyuh";
import { getStructureInfo, upgradeStructure } from "@/services/astravyuhService";
import { getFluxBalance } from "@/services/themeService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Zap, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { triggerConfetti } from "@/lib/confetti";

interface BuildingUpgradeModalProps {
  type: StructureType | null;
  isOpen: boolean;
  onClose: () => void;
  kingdom: StudentKingdom;
  onUpgradeSuccess: (updatedKingdom: StudentKingdom) => void;
}

export const BuildingUpgradeModal: React.FC<BuildingUpgradeModalProps> = ({
  type,
  isOpen,
  onClose,
  kingdom,
  onUpgradeSuccess
}) => {
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!type) return null;

  const currentLevel =
    type === "castle"
      ? kingdom.castleLevel
      : type === "wall"
      ? kingdom.wallLevel
      : kingdom.towerLevel;

  const info = getStructureInfo(type, currentLevel);
  const flixBalance = getFluxBalance();
  const isMaxLevel = currentLevel >= info.maxLevel;
  const nextInfo = !isMaxLevel ? getStructureInfo(type, currentLevel + 1) : null;
  const canAfford = !isMaxLevel && flixBalance >= info.upgradeCost;

  const handleUpgrade = () => {
    if (isMaxLevel || !canAfford) return;

    setIsUpgrading(true);
    try {
      const res = upgradeStructure(type);
      if (res.success) {
        triggerConfetti({ particleCount: 60 });
        toast({
          title: "Fortification Upgraded! 🏰",
          description: res.message
        });
        onUpgradeSuccess(res.kingdom);
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Upgrade Failed",
          description: res.message
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to upgrade building."
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const getFormulaDescription = () => {
    if (type === "wall") return "Wall Level × 2 (Absorbs direct enemy catapult fire and siege missiles)";
    if (type === "tower") return "Tower Level × 2 (Fires suppressing arrows and solar obelisk beams)";
    return "Castle Level × 1 (Royal bastion core structure defense)";
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 border border-amber-500/30 text-slate-100 shadow-2xl p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                {info.icon}
              </span>
              <div>
                <DialogTitle className="text-xl font-bold font-display text-slate-100">
                  {info.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                    Level {currentLevel} of {info.maxLevel}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">
                    Defense: -{info.defenseContribution} DMG
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-400 pt-1">
            {info.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress level bar */}
        <div className="space-y-1.5 py-3">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>Fortification Tier</span>
            <span>{currentLevel} / {info.maxLevel}</span>
          </div>
          <Progress
            value={(currentLevel / info.maxLevel) * 100}
            className="h-2 bg-slate-800"
          />
        </div>

        {/* Next Tier Upgrade Preview */}
        {!isMaxLevel && nextInfo ? (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Next Fortification Tier: Level {currentLevel + 1}
              </span>
              <span className="font-mono text-emerald-400">
                +{nextInfo.defenseContribution - info.defenseContribution} Defense
              </span>
            </div>

            <p className="text-xs text-slate-300 italic">
              "{nextInfo.description}"
            </p>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Upgrade Investment:</span>
              <span className="font-bold font-mono text-amber-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {info.upgradeCost} Orbit Flix
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">Supreme Fortification Active</p>
              <p className="text-emerald-400/80 text-[11px] mt-0.5">
                This structure has reached its pinnacle Level 5 state. Maximum defensive barrier applied.
              </p>
            </div>
          </div>
        )}

        {/* Formula Explainer */}
        <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <span>
            <strong className="text-slate-300">Defense Formula:</strong> {getFormulaDescription()}
          </span>
        </div>

        {/* Wallet Balance Status */}
        <div className="flex items-center justify-between text-xs px-1 text-slate-400">
          <span>Your Orbit Flix Wallet:</span>
          <span className="font-bold font-mono text-amber-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            {flixBalance} ⚡
          </span>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto text-slate-400 hover:text-slate-200"
          >
            Cancel
          </Button>

          {!isMaxLevel && (
            <Button
              onClick={handleUpgrade}
              disabled={!canAfford || isUpgrading}
              className={`w-full sm:w-auto gap-2 font-bold font-display ${
                canAfford
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              {isUpgrading ? (
                "Fortifying..."
              ) : canAfford ? (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  Upgrade to Level {currentLevel + 1}
                </>
              ) : (
                `Need ⚡ ${info.upgradeCost - flixBalance} More Flix`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
