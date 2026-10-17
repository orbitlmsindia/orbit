import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Sparkles,
  Trophy,
  CheckCircle2,
  Zap,
  ArrowRight,
  Share2,
  FileCheck,
  Star,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface CourseCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  creditsEarned?: number;
  auraBonus?: number;
  fluxBonus?: number;
}

export function CourseCelebrationModal({
  open,
  onOpenChange,
  courseTitle,
  creditsEarned = 3,
  auraBonus = 200,
  fluxBonus = 100,
}: CourseCelebrationModalProps) {
  const navigate = useNavigate();

  const handleShareAchievement = () => {
    const text = `🎓 I just graduated from "${courseTitle}" on Orbit LMS! Earned +${auraBonus} Aura XP and +${creditsEarned} Degree Credits!`;
    if (navigator.share) {
      navigator.share({
        title: "Course Graduation - Orbit LMS",
        text,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Achievement copied to clipboard! 📋 Share with friends and recruiters.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.25rem)] sm:w-full max-w-lg p-0 overflow-hidden border-2 border-amber-500/40 rounded-3xl bg-card shadow-2xl animate-in zoom-in-95">
        {/* Glowing Top Banner */}
        <div className="relative bg-gradient-to-br from-amber-500 via-primary to-purple-600 p-6 text-white text-center overflow-hidden">
          {/* Ambient Particles */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_70%)]" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg animate-bounce">
              <Trophy className="h-10 w-10 text-amber-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
              Course Completed! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-white/90 max-w-sm mx-auto font-medium">
              Congratulations, Scholar! You've successfully mastered all modules, video lectures, and assessments.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Course Name Card */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-center space-y-1">
            <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-wider">
              Accredited Course Curriculum
            </span>
            <h3 className="font-bold text-base text-foreground leading-snug">
              {courseTitle}
            </h3>
          </div>

          {/* Gamified Rewards Ledger Summary */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Credits */}
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 text-center flex flex-col justify-between">
              <Award className="h-5 w-5 text-primary mx-auto" />
              <div className="mt-1">
                <span className="text-lg font-bold font-mono text-primary">+{creditsEarned}</span>
                <span className="text-[10px] text-muted-foreground block font-sans">Degree Credits</span>
              </div>
            </div>

            {/* Aura XP */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center flex flex-col justify-between">
              <Sparkles className="h-5 w-5 text-amber-500 mx-auto fill-amber-500/20" />
              <div className="mt-1">
                <span className="text-lg font-bold font-mono text-amber-500">+{auraBonus}</span>
                <span className="text-[10px] text-muted-foreground block font-sans">Aura XP</span>
              </div>
            </div>

            {/* Orbit Flux */}
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-center flex flex-col justify-between">
              <Zap className="h-5 w-5 text-purple-500 mx-auto fill-purple-500/20" />
              <div className="mt-1">
                <span className="text-lg font-bold font-mono text-purple-500">+{fluxBonus}</span>
                <span className="text-[10px] text-muted-foreground block font-sans">Orbit Flux</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground/90 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Official Academic Transcript & Certificate issued with verification QR.</span>
            </div>
            <div className="flex items-center gap-2 text-foreground/90 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Your achievement and equipped theme are now spotlighted on the Leaderboard.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate("/student/grades");
              }}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md gap-2 cursor-pointer touch-press"
            >
              <FileCheck className="h-4 w-4" /> View Official Certificate & Transcript
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareAchievement}
                className="h-10 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer touch-press"
              >
                <Share2 className="h-3.5 w-3.5 text-primary" /> Share Achievement
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/student/courses");
                }}
                className="h-10 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer touch-press"
              >
                <span>Browse Courses</span> <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
