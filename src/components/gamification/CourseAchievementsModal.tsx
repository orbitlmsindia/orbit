import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Sparkles,
  Award,
  Flame,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Medal,
  Star,
  Zap,
  Code,
  Lightbulb,
  Users,
  Target,
  BookOpen,
  Crown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface CourseAchievementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
}

export function CourseAchievementsModal({
  open,
  onOpenChange,
  courseId,
  courseTitle,
}: CourseAchievementsModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [courseAwards, setCourseAwards] = useState<any[]>([]);
  const [courseLeaderboard, setCourseLeaderboard] = useState<any[]>([]);
  const [completedContentsCount, setCompletedContentsCount] = useState<number>(0);
  const [totalContentsCount, setTotalContentsCount] = useState<number>(0);

  useEffect(() => {
    if (open && courseId) {
      loadData();
    }
  }, [open, courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user profile
      const { data: prof } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, aura_points, current_streak, highest_streak")
        .eq("id", user.id)
        .maybeSingle();
      setUserProfile(prof);

      // 2. Fetch aura awards for this course and student
      let awards: any[] = [];
      try {
        const { data: dbAwards } = await supabase
          .from("aura_awards")
          .select("*")
          .eq("course_id", courseId)
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });

        if (dbAwards && dbAwards.length > 0) {
          awards = dbAwards;
        }
      } catch (e) {}

      // Fallback check to localStorage orbit_aura_awards
      const localStr = localStorage.getItem("orbit_aura_awards");
      if (localStr) {
        try {
          const localAwards = JSON.parse(localStr);
          const filtered = localAwards.filter(
            (a: any) =>
              (a.course_id === courseId || !a.course_id) &&
              (a.student_id === user.id || !a.student_id)
          );
          // Merge unique by id
          const idSet = new Set(awards.map((a) => a.id));
          filtered.forEach((fa: any) => {
            if (!idSet.has(fa.id)) {
              awards.push(fa);
            }
          });
        } catch (e) {}
      }
      setCourseAwards(awards);

      // 3. Fetch course completion stats
      try {
        const { data: contents } = await supabase
          .from("section_contents")
          .select("id, section:course_sections!inner(course_id)")
          .eq("section.course_id", courseId);

        const totalC = contents?.length || 0;
        setTotalContentsCount(totalC);

        const { data: progress } = await supabase
          .from("section_progress")
          .select("content_id")
          .eq("user_id", user.id)
          .eq("completed", true);

        const contentIds = new Set((contents || []).map((c) => c.id));
        const compCount = (progress || []).filter((p) => contentIds.has(p.content_id)).length;
        setCompletedContentsCount(compCount);
      } catch (e) {}

      // 4. Fetch Course Peers Leaderboard
      try {
        const { data: enrs } = await supabase
          .from("enrollments")
          .select("student_id, student:users!student_id(id, full_name, avatar_url, aura_points)")
          .eq("course_id", courseId)
          .eq("status", "approved");

        if (enrs) {
          const peers = enrs
            .map((e: any) => {
              const st = e.student;
              if (!st) return null;
              return {
                id: st.id,
                name: st.full_name || "Student",
                avatar_url: st.avatar_url,
                aura: st.aura_points || 0,
              };
            })
            .filter(Boolean);

          peers.sort((a: any, b: any) => b.aura - a.aura);
          setCourseLeaderboard(peers.slice(0, 5));
        }
      } catch (e) {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRankInfo = (aura: number) => {
    if (aura >= 200)
      return {
        title: "💎 Orbit Legend",
        color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
        desc: "Top Tier Champion",
      };
    if (aura >= 100)
      return {
        title: "🔥 Aura Master",
        color: "text-amber-500 border-amber-500/40 bg-amber-500/10",
        desc: "Advanced Academic Excellence",
      };
    if (aura >= 50)
      return {
        title: "⚡ Aura Rising",
        color: "text-purple-500 border-purple-500/40 bg-purple-500/10",
        desc: "Consistent Course Scaler",
      };
    return {
      title: "✨ Aura Novice",
      color: "text-blue-500 border-blue-500/40 bg-blue-500/10",
      desc: "Course Explorer",
    };
  };

  const currentAura = userProfile?.aura_points || 0;
  const rank = getRankInfo(currentAura);
  const completionPct =
    totalContentsCount > 0 ? Math.round((completedContentsCount / totalContentsCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-amber-500/30">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-transparent shrink-0">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Trophy className="h-4 w-4" /> Course Achievements & Gamification
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-display font-bold flex items-center justify-between">
            <span className="truncate">{courseTitle}</span>
            <Badge className={`${rank.color} font-mono font-bold text-xs shrink-0 ml-2`}>
              {rank.title}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Track your earned Aura Points, teacher commendations, milestones, and peer ranking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 max-h-[calc(90vh-140px)]">
          {/* Main KPI Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-transparent space-y-1">
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Total Aura
              </span>
              <p className="text-2xl font-extrabold font-mono text-amber-400">
                ✨ {currentAura}
              </p>
              <p className="text-[10px] text-muted-foreground">Gamified XP</p>
            </div>

            <div className="p-3.5 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent space-y-1">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> Progress
              </span>
              <p className="text-2xl font-extrabold font-mono text-foreground">
                {completionPct}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                {completedContentsCount}/{totalContentsCount} Lessons Done
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-transparent space-y-1">
              <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> Study Streak
              </span>
              <p className="text-2xl font-extrabold font-mono text-orange-400">
                {userProfile?.current_streak || 1} Days
              </p>
              <p className="text-[10px] text-muted-foreground">
                Best: {userProfile?.highest_streak || 1} Days
              </p>
            </div>
          </div>

          <Tabs defaultValue="awards" className="space-y-4">
            <TabsList className="bg-muted p-1">
              <TabsTrigger value="awards" className="text-xs font-semibold gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Teacher Commendations ({courseAwards.length})
              </TabsTrigger>
              <TabsTrigger value="badges" className="text-xs font-semibold gap-1.5">
                <Medal className="h-3.5 w-3.5 text-primary" />
                Earned Badges
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="text-xs font-semibold gap-1.5">
                <Crown className="h-3.5 w-3.5 text-yellow-500" />
                Course Rank
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TEACHER COMMENDATIONS */}
            <TabsContent value="awards" className="space-y-3">
              {courseAwards.length === 0 ? (
                <div className="p-6 rounded-xl border-2 border-dashed border-border text-center space-y-2 bg-muted/20">
                  <Sparkles className="h-8 w-8 text-amber-500/50 mx-auto" />
                  <p className="font-semibold text-sm text-foreground">No Teacher Awards Yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Participate actively in class, submit top-tier assignments, or build creative capstone projects. Your teacher and admin can award you custom Aura Points!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {courseAwards.map((award) => (
                    <div
                      key={award.id}
                      className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-background to-amber-500/5 flex items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-sm mt-0.5">
                          ✨
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {award.reason}
                            </span>
                            <Badge className="bg-amber-500 text-black font-extrabold text-[10px]">
                              +{award.points} XP
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Awarded by: <span className="font-semibold text-foreground">{award.awarded_by_name || "Instructor"}</span> •{" "}
                            {award.created_at ? new Date(award.created_at).toLocaleDateString() : "Recent"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: COURSE BADGES */}
            <TabsContent value="badges" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border bg-card flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center justify-center font-bold">
                    🎯
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-foreground">Mission Enrolled</h5>
                    <p className="text-[11px] text-muted-foreground">Joined curriculum mission</p>
                  </div>
                  <Badge className="ml-auto bg-emerald-600 text-white text-[10px]">Unlocked</Badge>
                </div>

                <div className={`p-3 rounded-xl border flex items-center gap-3 ${completionPct >= 25 ? "bg-card" : "opacity-60 bg-muted/20"}`}>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/30 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-foreground">Curriculum Scaler</h5>
                    <p className="text-[11px] text-muted-foreground">Completed 25%+ of modules</p>
                  </div>
                  <Badge className={`ml-auto text-[10px] ${completionPct >= 25 ? "bg-blue-600 text-white" : "border"}`}>
                    {completionPct >= 25 ? "Unlocked" : `${completionPct}%/25%`}
                  </Badge>
                </div>

                <div className={`p-3 rounded-xl border flex items-center gap-3 ${completionPct >= 100 ? "bg-card" : "opacity-60 bg-muted/20"}`}>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/30 flex items-center justify-center font-bold">
                    🎓
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-foreground">Mastery Champion</h5>
                    <p className="text-[11px] text-muted-foreground">Completed 100% of modules</p>
                  </div>
                  <Badge className={`ml-auto text-[10px] ${completionPct >= 100 ? "bg-purple-600 text-white" : "border"}`}>
                    {completionPct >= 100 ? "Unlocked" : `${completionPct}%/100%`}
                  </Badge>
                </div>

                <div className={`p-3 rounded-xl border flex items-center gap-3 ${courseAwards.length > 0 ? "bg-card" : "opacity-60 bg-muted/20"}`}>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center justify-center font-bold">
                    🌟
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-foreground">Instructor's Star</h5>
                    <p className="text-[11px] text-muted-foreground">Awarded merit Aura by teacher</p>
                  </div>
                  <Badge className={`ml-auto text-[10px] ${courseAwards.length > 0 ? "bg-amber-500 text-black font-bold" : "border"}`}>
                    {courseAwards.length > 0 ? "Unlocked" : "Locked"}
                  </Badge>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: COURSE PEER RANK */}
            <TabsContent value="leaderboard" className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Top learners enrolled in this course ranked by Aura Points:</p>
                {courseLeaderboard.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 border rounded-xl text-center bg-muted/20">
                    No leaderboard data available yet.
                  </p>
                ) : (
                  courseLeaderboard.map((peer, idx) => {
                    const isMe = peer.id === userProfile?.id;
                    return (
                      <div
                        key={peer.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isMe
                            ? "border-primary bg-primary/10 shadow-sm font-bold"
                            : "bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 text-center font-bold font-mono ${
                              idx === 0
                                ? "text-amber-500 text-sm"
                                : idx === 1
                                ? "text-slate-400 text-sm"
                                : idx === 2
                                ? "text-amber-700 text-sm"
                                : "text-muted-foreground"
                            }`}
                          >
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </span>
                          <Avatar className="h-7 w-7 border">
                            <AvatarImage src={peer.avatar_url} />
                            <AvatarFallback>{peer.name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-foreground">
                            {peer.name} {isMe && "(You)"}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-amber-500">
                          ✨ {peer.aura} XP
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-4 sm:p-5 bg-muted/30 border-t shrink-0 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              navigate("/student/leaderboard");
            }}
            className="text-xs font-bold gap-1 text-primary hover:bg-primary/10"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" /> Open Full Leaderboard
          </Button>

          <Button
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold px-4"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
