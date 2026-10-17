import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Trophy,
  Palette,
  CheckCircle2,
  Circle,
  ArrowRight,
  Zap,
  Gift,
  X,
  ChevronDown,
  ChevronUp,
  Award
} from "lucide-react";
import { claimDailyFlux, getFluxBalance, hasClaimedFluxToday } from "@/services/themeService";
import { useToast } from "@/hooks/use-toast";

interface ScholarMilestoneCardProps {
  enrolledCoursesCount: number;
  auraPoints?: number;
  totalCredits?: number;
  onOpenThemeStudio?: () => void;
}

export function ScholarMilestoneCard({
  enrolledCoursesCount,
  auraPoints = 0,
  totalCredits = 0,
  onOpenThemeStudio,
}: ScholarMilestoneCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("orbit_milestones_dismissed") === "true";
  });
  const [collapsed, setCollapsed] = useState(false);
  const [fluxBalance, setFluxBalance] = useState(getFluxBalance());
  const [dailyClaimed, setDailyClaimed] = useState(() => hasClaimedFluxToday());

  useEffect(() => {
    const handleFluxUpdate = () => {
      setFluxBalance(getFluxBalance());
      setDailyClaimed(hasClaimedFluxToday());
    };
    window.addEventListener("orbit_flux_updated", handleFluxUpdate);
    return () => window.removeEventListener("orbit_flux_updated", handleFluxUpdate);
  }, []);

  const handleClaim = () => {
    const res = claimDailyFlux(10);
    if (res.success) {
      setFluxBalance(res.newBalance);
      setDailyClaimed(true);
      toast({
        title: "⚡ +10 Orbit Flux Claimed!",
        description: `Your balance is now ${res.newBalance.toLocaleString()} Flux. Check back tomorrow for your next daily reward!`,
      });
    } else {
      toast({
        title: "Already Claimed Today",
        description: res.message || "Daily reward is strictly 10 Flux once per day.",
        variant: "destructive",
      });
    }
  };

  const milestones = [
    {
      id: "claim_flux",
      title: "Claim Daily Orbit Flux (+10 ⚡)",
      description: dailyClaimed
        ? "Daily reward claimed! Resets at midnight (max 10 ⚡/day)."
        : "Build your theme wallet to unlock exclusive palettes.",
      completed: dailyClaimed,
      action: !dailyClaimed ? (
        <Button
          size="sm"
          onClick={handleClaim}
          className="h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1 shadow-xs touch-press cursor-pointer"
        >
          <Gift className="h-3.5 w-3.5" /> Claim +10 Flux
        </Button>
      ) : (
        <Badge
          variant="outline"
          className="h-7 px-2.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[11px] font-semibold gap-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Claimed Today (10 ⚡)
        </Badge>
      ),
    },
    {
      id: "equip_theme",
      title: "Explore 10 Visual Themes",
      description: "Obsidian, Cyberpunk, Sapphire, Doomsday & more.",
      completed: localStorage.getItem("orbit-theme") !== null,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (onOpenThemeStudio) onOpenThemeStudio();
            else navigate("/profile");
          }}
          className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10 touch-press"
        >
          <Palette className="h-3.5 w-3.5" /> Theme Studio
        </Button>
      ),
    },
    {
      id: "course_progress",
      title: "Enroll & Learn in Courses",
      description: "Watch video lectures and interactive slides.",
      completed: enrolledCoursesCount > 0,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/student/courses")}
          className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 touch-press"
        >
          Browse Courses <ArrowRight className="h-3 w-3" />
        </Button>
      ),
    },
    {
      id: "leaderboard",
      title: "Inspect Global Leaderboard",
      description: "Rank among peers and view verified public scholar profiles.",
      completed: auraPoints > 0,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/student/leaderboard")}
          className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 touch-press"
        >
          <Trophy className="h-3.5 w-3.5" /> Leaderboard
        </Button>
      ),
    },
  ];

  const completedCount = milestones.filter((m) => m.completed).length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  if (dismissed) return null;

  return (
    <Card className="rounded-2xl border-2 border-primary/25 bg-gradient-to-r from-primary/10 via-card to-accent/10 shadow-sm overflow-hidden animate-in fade-in transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                Scholar Launchpad & Academic Milestones
              </h3>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono">
                {completedCount}/{milestones.length} Done
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete these orientation milestones to jumpstart your Aura rank and unlock theme rewards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDismissed(true);
              localStorage.setItem("orbit_milestones_dismissed", "true");
            }}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            title="Dismiss launchpad"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable Body */}
      {!collapsed && (
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Progress Indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">Scholar Orientation Progress</span>
              <span className="text-primary font-mono">{progressPercent}% Completed</span>
            </div>
            <Progress value={progressPercent} className="h-2 rounded-full" />
          </div>

          {/* Milestones List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {milestones.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  m.completed
                    ? "bg-emerald-500/5 border-emerald-500/25"
                    : "bg-background/80 border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {m.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        m.completed ? "text-foreground line-through opacity-80" : "text-foreground"
                      }`}
                    >
                      {m.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.description}</p>
                  </div>
                </div>

                {m.action && <div className="shrink-0">{m.action}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
