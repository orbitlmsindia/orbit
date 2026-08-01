import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles, Award, BookOpen, CheckCircle2, ArrowRight, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface AuraLedgerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}

export function AuraLedgerSheet({ open, onOpenChange, userRole = "student" }: AuraLedgerSheetProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [auraPoints, setAuraPoints] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchLedgerData();
    }
  }, [open]);

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user aura points & bonus credits
      const { data: userProfile } = await supabase
        .from("users")
        .select("aura_points, bonus_credits, role")
        .eq("id", user.id)
        .single();

      const baseAura = userProfile?.aura_points || 0;
      const bonusCreds = userProfile?.bonus_credits || 0;

      // 2. Fetch student enrollments and calculate credits (CREDITS ONLY FOR COMPLETED COURSES)
      const { data: enrs } = await supabase
        .from("enrollments")
        .select("id, status, completed, enrolled_at, course:courses(id, title, credit_points)")
        .eq("student_id", user.id);

      const approvedEnrollments = (enrs || []).filter((e) => e.status === "approved");
      const completedEnrollments = (enrs || []).filter((e: any) => e.status === "approved" && e.completed === true);
      
      const courseCredits = completedEnrollments.reduce((sum, e) => {
        const creds = Array.isArray(e.course) ? e.course[0]?.credit_points : e.course?.credit_points;
        return sum + (creds || 3);
      }, 0);

      const computedCredits = courseCredits + bonusCreds;

      // 3. Fetch completed lesson sessions
      const { data: compSections } = await supabase
        .from("section_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("completed", true);

      const sectionAura = (compSections || []).length * 10;

      // 4. Fetch submissions for extra aura
      const { data: subs } = await supabase
        .from("submissions")
        .select("grade")
        .eq("student_id", user.id)
        .eq("status", "graded");

      const subAura = (subs || []).reduce((acc, s) => acc + (s.grade || 0), 0);
      const computedAura = baseAura + sectionAura + subAura;

      setAuraPoints(computedAura);
      setTotalCredits(computedCredits);
      setEnrollments(approvedEnrollments);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRankInfo = (aura: number) => {
    if (aura >= 200) return { title: "💎 Orbit Legend", desc: "Top 1% Orbit Champion", next: "MAX LEVEL" };
    if (aura >= 100) return { title: "🔥 Aura Master", desc: "Advanced Learning Excellence", next: "200 pts for Orbit Legend" };
    if (aura >= 50) return { title: "⚡ Aura Rising", desc: "Consistent Course Scaler", next: "100 pts for Aura Master" };
    return { title: "✨ Aura Novice", desc: "Beginner Explorer", next: "50 pts for Aura Rising" };
  };

  const rank = getRankInfo(auraPoints);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl font-display">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Gamified Ledger & Credits
          </SheetTitle>
          <SheetDescription>
            Your personal record of accumulated ✨ Aura Points and 🎓 Academic Credits.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 my-6">
          {/* Main Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 space-y-1">
              <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Aura Points
              </span>
              <p className="text-2xl font-extrabold font-mono text-amber-400">✨ {auraPoints}</p>
              <p className="text-[10px] text-muted-foreground">Gamified XP</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/30 space-y-1">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> Academic Credits
              </span>
              <p className="text-2xl font-extrabold font-mono text-primary">🎓 {totalCredits}</p>
              <p className="text-[10px] text-muted-foreground">Course Credits</p>
            </div>
          </div>

          {/* Level Rank Badge */}
          <div className="p-4 rounded-xl bg-muted/40 border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Current Rank</span>
              <h4 className="font-bold text-base text-foreground">{rank.title}</h4>
              <p className="text-xs text-muted-foreground">{rank.desc}</p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] bg-background">
              {rank.next}
            </Badge>
          </div>

          {/* Enrolled Courses Credits Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Active Course Credits Ledger
            </h4>
            {enrollments.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 border rounded-xl text-center bg-muted/20">
                No active courses enrolled yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {enrollments.map((e) => {
                  const courseObj = Array.isArray(e.course) ? e.course[0] : e.course;
                  return (
                    <div key={e.id} className="p-3 rounded-lg border bg-background flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-semibold text-foreground truncate max-w-[200px]">{courseObj?.title || "Course"}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[11px] bg-primary/10 text-primary border-primary/30">
                        +{courseObj?.credit_points || 3} Credits
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="pt-2 border-t">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate(userRole === "teacher" ? "/teacher/leaderboard" : "/student/leaderboard");
            }}
            className="w-full gap-2 font-bold shadow-md bg-primary text-primary-foreground"
          >
            <Trophy className="h-4 w-4 text-amber-400" /> View Global Leaderboard <ArrowRight className="h-4 w-4" />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
