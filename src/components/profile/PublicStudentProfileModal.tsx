import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Award,
  Flame,
  Zap,
  Palette,
  CheckCircle2,
  Lock,
  Crown,
  Share2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Check
} from "lucide-react";
import {
  getStudentProfileThemeData,
  StudentProfileThemeData,
  purchaseTheme
} from "@/services/themeService";
import { THEMES_CATALOG, ThemeCatalogItem } from "@/types/theme";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ThemeStudioModal } from "@/components/theme/ThemeStudioModal";

export interface StudentProfileData {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  auraPoints?: number;
  totalCredits?: number;
  currentStreak?: number;
  highestStreak?: number;
  bio?: string;
  domain?: string;
  role?: string;
  rank?: number;
}

interface PublicStudentProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentProfileData | null;
  currentUserId?: string | null;
}

export function PublicStudentProfileModal({
  open,
  onOpenChange,
  student,
  currentUserId,
}: PublicStudentProfileModalProps) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { toast } = useToast();

  const [themeData, setThemeData] = useState<StudentProfileThemeData | null>(null);
  const [themeStudioOpen, setThemeStudioOpen] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      const data = getStudentProfileThemeData(
        student.id,
        currentUserId,
        student.auraPoints || 0,
        student.totalCredits || 0,
        student.role
      );
      setThemeData(data);
    }
  }, [student, currentUserId, open]);

  if (!student || !themeData) return null;

  const getRankBadge = (rank?: number) => {
    if (!rank) return null;
    if (rank === 1)
      return (
        <Badge className="bg-amber-500 text-slate-950 font-bold border-amber-400 gap-1 shadow-sm">
          <Crown className="h-3 w-3 fill-slate-950" /> Rank #1 Champion
        </Badge>
      );
    if (rank === 2)
      return (
        <Badge className="bg-slate-300 text-slate-900 font-bold border-slate-400 gap-1 shadow-sm">
          🥈 Rank #2 Runner-Up
        </Badge>
      );
    if (rank === 3)
      return (
        <Badge className="bg-amber-800 text-white font-bold border-amber-700 gap-1 shadow-sm">
          🥉 Rank #3 Podium
        </Badge>
      );
    return (
      <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
        Rank #{rank}
      </Badge>
    );
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/profile/${student.id}`;
    const text = `Explore ${student.fullName}'s verified scholar profile on Orbit LMS! ✨ Aura: ${student.auraPoints || 0}, 🎓 Credits: ${student.totalCredits || 0}.`;
    if (navigator.share) {
      navigator.share({
        title: `${student.fullName} - Orbit LMS Scholar Profile`,
        text,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Profile Link Copied! 📋",
        description: "Public scholar profile URL copied to clipboard.",
      });
    }
  };

  const handleQuickUnlockAndEquip = (themeItem: ThemeCatalogItem) => {
    setUnlockingId(themeItem.id);
    const res = purchaseTheme(themeItem.id, student.role);
    setUnlockingId(null);

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Unlock Failed",
        description: res.message,
      });
      return;
    }

    setTheme(themeItem.id);
    // Refresh theme data
    const updated = getStudentProfileThemeData(
      student.id,
      currentUserId,
      student.auraPoints || 0,
      student.totalCredits || 0,
      student.role
    );
    setThemeData(updated);

    toast({
      title: "🎉 Theme Unlocked & Equipped!",
      description: res.message,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1.25rem)] sm:w-full max-w-3xl max-h-[92vh] overflow-y-auto p-3.5 sm:p-6 rounded-2xl border-border bg-background shadow-2xl overscroll-contain">
          {/* Header Profile Identity */}
          <div className="relative p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-accent/10 overflow-hidden shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left relative z-10">
              <div className="relative">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-md">
                  <AvatarImage src={student.avatarUrl} alt={student.fullName} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {student.fullName
                      ? student.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                      : "S"}
                  </AvatarFallback>
                </Avatar>
                {themeData.isSelf && (
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background" />
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    {student.fullName}
                  </h3>
                  {getRankBadge(student.rank)}
                  {themeData.isSelf && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      Your Profile
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground truncate font-mono">
                  {student.email}
                </p>

                <p className="text-xs text-foreground/80 pt-0.5 leading-relaxed max-w-xl">
                  {student.bio ||
                    "Dedicated learner pursuing mastery across software engineering, data, and system design."}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Orbit Scholar
                  </span>
                  {student.domain && (
                    <>
                      <span>•</span>
                      <span>Domain: {student.domain}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-row sm:flex-col gap-2 shrink-0 self-center sm:self-start">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShareProfile}
                  className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer touch-press text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/profile/${student.id}`);
                  }}
                  className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer touch-press"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Full Page
                </Button>
              </div>
            </div>
          </div>

          {/* Gamified Points & Flux Balance Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {/* Aura Points */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Aura Points</span>
                <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/30" />
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold font-mono text-amber-500">
                  {student.auraPoints || 0}
                </p>
                <span className="text-[10px] text-amber-600/80 font-medium">
                  Academic Aura Rank
                </span>
              </div>
            </div>

            {/* Academic Credits */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Academic Credits</span>
                <Award className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold font-mono text-primary">
                  {student.totalCredits || 0}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {student.totalCredits && student.totalCredits >= 12
                    ? "Placement Ready 🎓"
                    : "Course Progress"}
                </span>
              </div>
            </div>

            {/* Learning Streak */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Daily Streak</span>
                <Flame className="h-4 w-4 text-orange-500 fill-orange-500/30" />
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold font-mono text-orange-500">
                  {student.currentStreak || 0} <span className="text-xs font-sans">Days</span>
                </p>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Best: {student.highestStreak || student.currentStreak || 0}d
                </span>
              </div>
            </div>

            {/* Orbit Flux Points (New Theme Currency) */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-card to-amber-500/5 p-3.5 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground font-bold">Orbit Flux</span>
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold font-mono text-foreground flex items-center gap-1">
                  <span>{themeData.fluxBalance.toLocaleString()}</span>
                  <span className="text-[11px] text-amber-500 font-sans">FLUX</span>
                </p>
                <span className="text-[10px] text-amber-500 font-bold">
                  Theme Currency Wallet
                </span>
              </div>
            </div>
          </div>

          {/* Signature Equipped Theme Showcase */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-sm text-foreground">
                  {themeData.isSelf ? "Your Equipped Theme" : `${student.fullName}'s Signature Theme`}
                </h4>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5 uppercase"
              >
                Active Signature
              </Badge>
            </div>

            <div
              className="rounded-2xl p-4 border border-border shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden"
              style={{ background: themeData.equippedTheme?.palette?.background || themeData.equippedTheme?.bgColor || "#0f172a" }}
            >
              <div className="flex items-center gap-3.5 z-10">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md border border-white/20 shrink-0"
                  style={{
                    background: themeData.equippedTheme?.palette?.card || "#1e293b",
                    color: themeData.equippedTheme?.palette?.primary || themeData.equippedTheme?.primaryColor || "#3b82f6",
                  }}
                >
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5
                      className="font-bold text-base tracking-wide"
                      style={{ color: themeData.equippedTheme?.palette?.foreground || "#f8fafc" }}
                    >
                      {themeData.equippedTheme?.name || "Equipped Theme"}
                    </h5>
                    <Badge
                      className="text-[9px] font-mono uppercase"
                      style={{
                        background: themeData.equippedTheme?.palette?.primary || themeData.equippedTheme?.primaryColor || "#3b82f6",
                        color: themeData.equippedTheme?.isDark ? "#ffffff" : "#000000",
                      }}
                    >
                      {themeData.equippedTheme?.badge || "THEME"}
                    </Badge>
                  </div>
                  <p
                    className="text-xs opacity-80 line-clamp-1 max-w-md pt-0.5"
                    style={{ color: themeData.equippedTheme?.palette?.foreground || "#f8fafc" }}
                  >
                    {themeData.equippedTheme?.description || ""}
                  </p>
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 z-10 shrink-0">
                <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-black/40 border border-white/10">
                  <span
                    className="h-3 w-3 rounded-full border border-black/20"
                    style={{ background: themeData.equippedTheme?.palette?.background || themeData.equippedTheme?.bgColor || "#0f172a" }}
                    title="Background"
                  />
                  <span
                    className="h-3 w-3 rounded-full border border-black/20"
                    style={{ background: themeData.equippedTheme?.palette?.card || "#1e293b" }}
                    title="Card Surface"
                  />
                  <span
                    className="h-3 w-3 rounded-full border border-black/20"
                    style={{ background: themeData.equippedTheme?.palette?.primary || themeData.equippedTheme?.primaryColor || "#3b82f6" }}
                    title="Primary"
                  />
                  <span
                    className="h-3 w-3 rounded-full border border-black/20"
                    style={{ background: themeData.equippedTheme?.palette?.accent || "#60a5fa" }}
                    title="Accent"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => setThemeStudioOpen(true)}
                  className="h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-bold gap-1.5 border border-white/20 shadow-xs cursor-pointer"
                >
                  <Palette className="h-3.5 w-3.5" /> Theme Studio
                </Button>
              </div>

              {/* Gradient Bottom Floor Line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1.5"
                style={{ background: themeData.equippedTheme.previewGradient }}
              />
            </div>
          </div>

          {/* Themes This Student Can Purchase with Current Flux */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                  Themes This Student Can Purchase Right Now
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on current wallet balance of ⚡{" "}
                  <span className="font-bold text-foreground">
                    {themeData.fluxBalance.toLocaleString()} Flux
                  </span>
                  .
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-500 bg-amber-500/10">
                {themeData.affordableThemes.length} Affordable Themes
              </Badge>
            </div>

            {themeData.affordableThemes.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                All themes matching this balance have already been unlocked, or claim +250 Flux to reach higher tiers!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {themeData.affordableThemes.slice(0, 4).map((themeItem) => (
                  <div
                    key={themeItem.id}
                    className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="h-9 w-9 rounded-lg border border-white/20 flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: themeItem.palette?.background || themeItem.bgColor || "#0f172a" }}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full"
                          style={{ background: themeItem.palette?.primary || themeItem.primaryColor || "#3b82f6" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h6 className="font-bold text-xs text-foreground truncate">
                            {themeItem.name}
                          </h6>
                          <Badge variant="outline" className="text-[8px] font-mono py-0 px-1 border-primary/30 text-primary">
                            {themeItem.badge}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-mono text-amber-500 font-bold flex items-center gap-1">
                          <Zap className="h-3 w-3 fill-amber-500" /> ⚡ {themeItem.cost} FLUX
                          <span className="text-[10px] text-emerald-500 font-sans font-semibold">
                            (Can Afford)
                          </span>
                        </p>
                      </div>
                    </div>

                    {themeData.isSelf ? (
                      <Button
                        size="sm"
                        onClick={() => handleQuickUnlockAndEquip(themeItem)}
                        disabled={unlockingId === themeItem.id}
                        className="h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] shrink-0 gap-1 cursor-pointer"
                      >
                        <Lock className="h-3 w-3" />
                        <span>{unlockingId === themeItem.id ? "Unlocking..." : "Unlock"}</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setThemeStudioOpen(true)}
                        className="h-7 px-2.5 rounded-lg text-primary hover:bg-primary/10 font-bold text-[11px] shrink-0 gap-1 cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming High-Tier Theme Milestones */}
          {themeData.upcomingThemes.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-border/50">
              <h5 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-muted-foreground" /> Next Milestone Theme Unlocks
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {themeData.upcomingThemes.slice(0, 2).map(({ theme: tItem, fluxNeeded }) => (
                  <div
                    key={tItem.id}
                    className="p-2.5 rounded-xl border border-muted bg-muted/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ background: tItem.palette.primary }}
                      />
                      <span className="font-semibold text-foreground truncate">{tItem.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                      Need ⚡ <span className="font-bold text-amber-500">{fluxNeeded}</span> more
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Embedded Theme Studio for Instant Unlock Exploration */}
      <ThemeStudioModal
        open={themeStudioOpen}
        onOpenChange={setThemeStudioOpen}
        userRole={student.role}
      />
    </>
  );
}
