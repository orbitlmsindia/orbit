import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { THEMES_CATALOG, ThemeCatalogItem, ThemeId } from "@/types/theme";
import {
  getFluxBalance,
  claimDailyFlux,
  getUnlockedThemeIds,
  purchaseTheme,
  isUserAdminOrMaster,
  hasClaimedFluxToday,
} from "@/services/themeService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Zap,
  Check,
  Lock,
  Crown,
  Palette,
  Gift,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

interface ThemeSelectorGridProps {
  userRole?: string | null;
  onThemeEquipped?: (themeId: ThemeId) => void;
}

export function ThemeSelectorGrid({ userRole, onThemeEquipped }: ThemeSelectorGridProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [fluxBalance, setFluxState] = useState<number>(getFluxBalance());
  const [unlockedIds, setUnlockedIds] = useState<ThemeId[]>(getUnlockedThemeIds(userRole));
  const [hasClaimedToday, setHasClaimedToday] = useState<boolean>(() => hasClaimedFluxToday());
  const [claiming, setClaiming] = useState(false);
  const [purchasingId, setPurchasingId] = useState<ThemeId | null>(null);

  const isAdminOrMaster = isUserAdminOrMaster(userRole);

  useEffect(() => {
    const handleFluxUpdated = (e: CustomEvent<number>) => {
      setFluxState(e.detail ?? getFluxBalance());
      setHasClaimedToday(hasClaimedFluxToday());
    };
    const handleThemesUpdated = (e: CustomEvent<ThemeId[]>) => {
      setUnlockedIds(e.detail ?? getUnlockedThemeIds(userRole));
    };

    window.addEventListener("orbit_flux_updated" as any, handleFluxUpdated);
    window.addEventListener("orbit_themes_updated" as any, handleThemesUpdated);

    return () => {
      window.removeEventListener("orbit_flux_updated" as any, handleFluxUpdated);
      window.removeEventListener("orbit_themes_updated" as any, handleThemesUpdated);
    };
  }, [userRole]);

  const handleClaimReward = () => {
    if (hasClaimedFluxToday()) {
      toast({
        title: "Daily Limit Reached",
        description: "You have already claimed your 10 Orbit Flux for today. Resets at midnight!",
        variant: "destructive",
      });
      return;
    }

    setClaiming(true);
    setTimeout(() => {
      const res = claimDailyFlux(10);
      setFluxState(res.newBalance);
      setHasClaimedToday(true);
      setClaiming(false);
      if (res.success) {
        toast({
          title: "⚡ +10 Orbit Flux Claimed!",
          description: `Your new wallet balance is ⚡ ${res.newBalance.toLocaleString()} Flux. Enjoy unlocking themes!`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Already Claimed",
          description: res.message,
        });
      }
    }, 200);
  };

  const handleEquip = (themeId: ThemeId, themeName: string) => {
    setTheme(themeId);
    if (onThemeEquipped) {
      onThemeEquipped(themeId);
    }
    toast({
      title: `🎨 Theme Applied: ${themeName}`,
      description: "Complete application layout and tokens updated seamlessly with zero inconsistency.",
    });
  };

  const handleUnlockAndEquip = (themeItem: ThemeCatalogItem) => {
    setPurchasingId(themeItem.id);
    const result = purchaseTheme(themeItem.id, userRole);
    setPurchasingId(null);

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Unlock Failed",
        description: result.message,
      });
      return;
    }

    setUnlockedIds(getUnlockedThemeIds(userRole));
    setFluxState(result.remainingFlux);

    // Auto-equip upon unlocking
    setTheme(themeItem.id);
    if (onThemeEquipped) {
      onThemeEquipped(themeItem.id);
    }

    toast({
      title: `🎉 Unlocked & Equipped!`,
      description: result.message,
    });
  };

  return (
    <div className="space-y-6">
      {/* Flux Wallet & Privilege Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-accent/10 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner shrink-0">
            <Zap className="h-6 w-6 fill-amber-500/40" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-foreground">Orbit Flux Balance</h3>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-500 bg-amber-500/10">
                New Theme Currency
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acquire exclusive visual palettes and futuristic interface themes using Orbit Flux.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <div className="h-10 px-3.5 sm:px-4 rounded-xl border border-border bg-background/80 backdrop-blur-sm flex items-center gap-2 font-mono font-bold text-xs sm:text-sm shadow-2xs">
            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-foreground">{fluxBalance.toLocaleString()}</span>
            <span className="text-[11px] sm:text-xs text-muted-foreground">FLUX</span>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleClaimReward}
            disabled={claiming || hasClaimedToday}
            className={`h-10 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm gap-1.5 shadow-md touch-press transition-all ${
              hasClaimedToday
                ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-80"
                : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20 cursor-pointer"
            }`}
          >
            {hasClaimedToday ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Gift className="h-4 w-4" />}
            <span>
              {claiming ? "Claiming..." : hasClaimedToday ? "Claimed (+10 Today)" : "+10 Flux"}
            </span>
          </Button>
        </div>
      </div>

      {/* Admin / Master VIP Privilege Banner */}
      {isAdminOrMaster && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-3.5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Crown className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-foreground">
                VIP Master & College Admin Privilege Active
              </span>
              <Badge className="bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase py-0 px-1.5">
                VIP Free
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              As an Administrator, you can equip any of the 10 themes instantly at 0 Flux cost.
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 hidden sm:block" />
        </div>
      )}

      {/* 10 Themes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {THEMES_CATALOG.map((themeItem) => {
          const isActive = theme === themeItem.id;
          const isUnlocked = isAdminOrMaster || unlockedIds.includes(themeItem.id);
          const canAfford = fluxBalance >= themeItem.cost;

          return (
            <div
              key={themeItem.id}
              className={`group relative rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden bg-card ${
                isActive
                  ? "border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/50 hover:shadow-md"
              }`}
            >
              {/* Theme Mockup Visual Preview Canvas */}
              <div
                className="h-28 w-full p-3 flex flex-col justify-between relative overflow-hidden border-b border-border/60 transition-transform duration-300 group-hover:scale-[1.01]"
                style={{ background: themeItem.palette?.background || themeItem.bgColor || "#0f172a" }}
              >
                {/* Header Mockup Bar */}
                <div
                  className="rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow-xs border border-white/10"
                  style={{ background: themeItem.palette?.card || "#1e293b", color: themeItem.palette?.foreground || "#f8fafc" }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: themeItem.palette?.primary || themeItem.primaryColor || "#3b82f6" }}
                    />
                    <span className="text-[10px] font-bold font-mono tracking-wider opacity-90">
                      ORBIT LMS
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: themeItem.palette?.accent || "#60a5fa" }}
                    />
                    <span className="h-1.5 w-4 rounded-full bg-white/20" />
                  </div>
                </div>

                {/* Dashboard Elements Mockup */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-7 px-2.5 rounded-md flex items-center gap-1.5 text-[9px] font-bold shadow-xs border border-white/10"
                    style={{
                      background: themeItem.palette?.primary || themeItem.primaryColor || "#3b82f6",
                      color: themeItem.isDark ? "#ffffff" : "#000000",
                    }}
                  >
                    <Sparkles className="h-2.5 w-2.5 shrink-0" />
                    <span>Active Pulse</span>
                  </div>

                  <div
                    className="h-7 flex-1 rounded-md px-2 flex items-center justify-between border border-white/10"
                    style={{ background: themeItem.palette?.card || "#1e293b" }}
                  >
                    <span
                      className="text-[9px] font-mono"
                      style={{ color: themeItem.palette?.foreground || "#f8fafc" }}
                    >
                      Theme Preview
                    </span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: themeItem.palette?.accent || "#60a5fa" }}
                    />
                  </div>
                </div>

                {/* Gradient Accent Floor Line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ background: themeItem.previewGradient || "linear-gradient(to right, #3b82f6, #60a5fa)" }}
                />
              </div>

              {/* Theme Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {themeItem.name}
                      </h4>
                      {isActive && (
                        <span
                          className="h-2 w-2 rounded-full bg-primary shrink-0 animate-ping"
                          title="Currently Active"
                        />
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono uppercase tracking-wider shrink-0 border-primary/30 text-primary bg-primary/5"
                    >
                      {themeItem.badge}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {themeItem.description}
                  </p>
                </div>

                {/* Palette Swatches & Price */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  {/* Swatches */}
                  <div className="flex items-center gap-1.5" title="Palette color tokens">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/20 shadow-xs"
                      style={{ background: themeItem.palette?.background || themeItem.bgColor || "#0f172a" }}
                      title="Background"
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/20 shadow-xs"
                      style={{ background: themeItem.palette?.card || "#1e293b" }}
                      title="Card & Surface"
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/20 shadow-xs"
                      style={{ background: themeItem.palette?.primary || themeItem.primaryColor || "#3b82f6" }}
                      title="Primary Highlight"
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/20 shadow-xs"
                      style={{ background: themeItem.palette?.accent || "#60a5fa" }}
                      title="Accent"
                    />
                  </div>

                  {/* Price Tag */}
                  <div>
                    {isAdminOrMaster ? (
                      <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                        <Crown className="h-3 w-3" /> VIP Free
                      </span>
                    ) : themeItem.cost === 0 ? (
                      <span className="text-[11px] font-bold text-emerald-500 font-mono">
                        Free Included
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="h-3 w-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="text-xs font-bold font-mono text-amber-500 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 fill-amber-500" />
                        <span>{themeItem.cost}</span>
                        <span className="text-[10px] text-muted-foreground font-sans">FLUX</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Button */}
                <div>
                  {isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full h-10 sm:h-9 rounded-xl border-primary/40 bg-primary/10 text-primary font-bold gap-1.5 text-xs sm:text-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Active Theme</span>
                    </Button>
                  ) : isUnlocked ? (
                    <Button
                      size="sm"
                      onClick={() => handleEquip(themeItem.id, themeItem.name)}
                      className="w-full h-10 sm:h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-sm cursor-pointer touch-press text-xs sm:text-sm"
                    >
                      <Palette className="h-4 w-4" />
                      <span>Equip Theme</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleUnlockAndEquip(themeItem)}
                      disabled={purchasingId === themeItem.id || !canAfford}
                      className={`w-full h-10 sm:h-9 rounded-xl font-bold gap-1.5 cursor-pointer shadow-sm touch-press text-xs sm:text-sm ${
                        canAfford
                          ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      <span>
                        {purchasingId === themeItem.id
                          ? "Unlocking..."
                          : canAfford
                          ? `Unlock for ⚡ ${themeItem.cost}`
                          : `Need ⚡ ${themeItem.cost - fluxBalance} More`}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
