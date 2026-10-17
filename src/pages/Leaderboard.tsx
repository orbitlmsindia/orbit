import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Sparkles, Award, Medal, Crown, Loader2, Flame, UserCheck, Zap, Palette, Eye, Swords } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FeatureGate } from "@/components/common/FeatureGate";
import { PublicStudentProfileModal } from "@/components/profile/PublicStudentProfileModal";
import { WeaponBadge } from "@/components/weapon/WeaponBadge";
import { getStudentEquippedWeapon } from "@/services/weaponService";

interface LeaderboardProps {
  userRole?: "teacher" | "student" | "admin";
}

export default function Leaderboard({ userRole = "student" }: LeaderboardProps) {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [activeRole, setActiveRole] = useState<string>(userRole);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    const detectUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role) {
          setActiveRole(profile.role);
        }
      }
    };
    detectUserRole();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedCourse]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch active courses for filtering
      const { data: courseList } = await supabase.from("courses").select("id, title");
      setCourses(courseList || []);

      // 2. Fetch all student profiles with streak data
      const { data: students, error: studentError } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, aura_points, bonus_credits, current_streak, highest_streak, role")
        .eq("role", "student");

      if (studentError) throw studentError;

      // 3. Fetch course enrollments per student (credits only for COMPLETED courses)
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, course_id, status, completed, courses(domain, credit_points)");

      // 4. Fetch quiz & submission scores per student
      const { data: submissions } = await supabase
        .from("submissions")
        .select("student_id, grade, status")
        .eq("status", "graded");

      // 5. Fetch completed section progress (+10 Aura per completed section)
      let sectionProgressMap: Record<string, number> = {};
      try {
        const { data: compSections } = await supabase
          .from("section_progress")
          .select("user_id, completed")
          .eq("completed", true);

        if (compSections) {
          compSections.forEach((sp: any) => {
            if (sp.user_id) {
              sectionProgressMap[sp.user_id] = (sectionProgressMap[sp.user_id] || 0) + 10;
            }
          });
        }
      } catch (spErr) {
        console.warn("Could not fetch section_progress for leaderboard:", spErr);
      }

      // Calculate total credits & total aura points per student
      const rankList = (students || [])
        .map((st) => {
          const studentEnrollments = (enrollments || []).filter(
            (e) => e.student_id === st.id && (selectedCourse === "all" || e.course_id === selectedCourse)
          );

          // If filtering by specific course, exclude students not enrolled in this course
          if (selectedCourse !== "all" && studentEnrollments.length === 0) {
            return null;
          }

          // CREDITS ONLY FOR COMPLETED COURSES + ADMIN BONUS OVERRIDE
          const completedEnrollments = studentEnrollments.filter((e: any) => e.completed === true);
          const courseCredits = completedEnrollments.reduce((acc, curr: any) => {
            const credits = Array.isArray(curr.courses) ? curr.courses[0]?.credit_points : curr.courses?.credit_points;
            return acc + (credits || 3);
          }, 0);

          const totalCredits = courseCredits + (st.bonus_credits || 0);

          const studentSubmissions = (submissions || []).filter((s) => s.student_id === st.id);
          const totalAssignmentGrade = studentSubmissions.reduce((acc, s) => acc + (s.grade || 0), 0);

          // Derived Aura Points: base aura + section completions (+10 each) + graded assignments
          const sectionAura = sectionProgressMap[st.id] || 0;
          const computedAura = (st.aura_points || 0) + sectionAura + totalAssignmentGrade;
          const currentStreak = st.current_streak || 0;
          const highestStreak = st.highest_streak || currentStreak;

          return {
            id: st.id,
            fullName: st.full_name || "Orbit Student",
            email: st.email,
            avatarUrl: st.avatar_url,
            auraPoints: computedAura,
            totalCredits,
            currentStreak,
            highestStreak,
            isPlacementPriority: totalCredits >= 12 || computedAura >= 100,
            completedCourses: completedEnrollments.length,
            role: st.role || "student",
            bio: st.bio || ""
          };
        })
        .filter(Boolean);

      // Sort by Aura Points desc, then Credits desc, then Streak desc
      rankList.sort((a, b) => b.auraPoints - a.auraPoints || b.totalCredits - a.totalCredits || b.currentStreak - a.currentStreak);

      const ranked = rankList.map((st, idx) => ({ ...st, rank: idx + 1 }));
      setLeaderboard(ranked);

    } catch (err: any) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeForAura = (aura: number) => {
    if (aura >= 200) return { label: "💎 Orbit Legend", color: "bg-purple-500/10 text-purple-500 border-purple-500/30" };
    if (aura >= 100) return { label: "🔥 Aura Master", color: "bg-amber-500/10 text-amber-500 border-amber-500/30" };
    if (aura >= 50) return { label: "⚡ Aura Rising", color: "bg-blue-500/10 text-blue-500 border-blue-500/30" };
    return { label: "✨ Aura Novice", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" };
  };

  const Layout = activeRole === "admin" ? AdminLayout : activeRole === "teacher" ? TeacherLayout : StudentLayout;

  return (
    <Layout>
      <FeatureGate featureId="leaderboard">
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-2">
                <Trophy className="h-8 w-8 text-amber-500 animate-bounce" /> Orbit Global Gamified Leaderboard
              </h1>
            <p className="text-muted-foreground mt-1">
              Real-time student rankings based on ✨ Aura Points, 🎓 Academic Credits, and Course Excellence.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link to="/student/armory">
              <Button
                variant="outline"
                className="h-9 rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs gap-1.5 shadow-2xs"
              >
                <Swords className="h-4 w-4" /> Celestial Armory
              </Button>
            </Link>

            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full sm:w-[220px] bg-background text-xs h-9 rounded-xl">
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌍 All Orbit Courses (Global)</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-bold text-lg">No Leaderboard Data Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Student rankings will populate automatically as students earn ✨ Aura Points and complete course modules!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium Cards */}
            {leaderboard.length >= 1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                {/* 2nd Place (Silver) */}
                {leaderboard[1] && (
                  <Card
                    onClick={() => { setSelectedStudent(leaderboard[1]); setProfileModalOpen(true); }}
                    className="border-2 border-slate-400/40 bg-gradient-to-b from-slate-500/10 to-transparent order-2 md:order-1 relative overflow-hidden cursor-pointer hover:border-slate-300 transition-all hover:scale-[1.02] shadow-sm group"
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto h-16 w-16 rounded-full border-4 border-slate-300 shadow-md relative mb-2">
                        <Avatar className="h-full w-full">
                          <AvatarImage src={leaderboard[1].avatarUrl} />
                          <AvatarFallback className="font-bold text-lg bg-slate-700 text-white">{leaderboard[1].fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-1 bg-slate-400 text-slate-900 rounded-full h-7 w-7 flex items-center justify-center font-extrabold text-xs shadow-md">
                          2nd
                        </div>
                      </div>
                      <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">{leaderboard[1].fullName}</CardTitle>
                      <CardDescription className="text-xs">{leaderboard[1].email}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Badge className={getBadgeForAura(leaderboard[1].auraPoints).color}>
                          {getBadgeForAura(leaderboard[1].auraPoints).label}
                        </Badge>
                        <WeaponBadge
                          weapon={getStudentEquippedWeapon(leaderboard[1].id, 2, leaderboard[1].auraPoints)}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-4 text-xs font-mono pt-2 border-t">
                        <span className="font-bold text-amber-500">✨ {leaderboard[1].auraPoints} Aura</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-bold text-primary">🎓 {leaderboard[1].totalCredits} Credits</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 1st Place (Gold Podium - Prominent) */}
                {leaderboard[0] && (
                  <Card
                    onClick={() => { setSelectedStudent(leaderboard[0]); setProfileModalOpen(true); }}
                    className="border-2 border-amber-500 bg-gradient-to-b from-amber-500/20 to-transparent order-1 md:order-2 shadow-xl scale-105 relative overflow-hidden cursor-pointer hover:border-amber-400 transition-all hover:scale-[1.07] group"
                  >
                    <div className="bg-amber-500 text-amber-950 text-[10px] font-extrabold uppercase tracking-widest text-center py-1 flex items-center justify-center gap-1">
                      <Crown className="h-3.5 w-3.5 fill-amber-950" /> Orbit #1 Leader Champion
                    </div>
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto h-20 w-20 rounded-full border-4 border-amber-400 shadow-xl relative mb-2">
                        <Avatar className="h-full w-full">
                          <AvatarImage src={leaderboard[0].avatarUrl} />
                          <AvatarFallback className="font-bold text-2xl bg-amber-500 text-slate-950">{leaderboard[0].fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-1 bg-amber-400 text-amber-950 rounded-full h-8 w-8 flex items-center justify-center font-extrabold text-sm shadow-md">
                          🥇
                        </div>
                      </div>
                      <CardTitle className="text-lg font-extrabold line-clamp-1 text-foreground group-hover:text-amber-500 transition-colors">{leaderboard[0].fullName}</CardTitle>
                      <CardDescription className="text-xs font-mono">{leaderboard[0].email}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Badge className="bg-amber-500 text-amber-950 font-bold border-amber-400">
                          {getBadgeForAura(leaderboard[0].auraPoints).label}
                        </Badge>
                        <WeaponBadge
                          weapon={getStudentEquippedWeapon(leaderboard[0].id, 1, leaderboard[0].auraPoints)}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-4 text-xs font-mono pt-2 border-t border-amber-500/30">
                        <span className="font-extrabold text-amber-400 text-sm">✨ {leaderboard[0].auraPoints} Aura</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-extrabold text-primary text-sm">🎓 {leaderboard[0].totalCredits} Credits</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 3rd Place (Bronze) */}
                {leaderboard[2] && (
                  <Card
                    onClick={() => { setSelectedStudent(leaderboard[2]); setProfileModalOpen(true); }}
                    className="border-2 border-amber-700/40 bg-gradient-to-b from-amber-700/10 to-transparent order-3 relative overflow-hidden cursor-pointer hover:border-amber-600 transition-all hover:scale-[1.02] shadow-sm group"
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto h-16 w-16 rounded-full border-4 border-amber-700/60 shadow-md relative mb-2">
                        <Avatar className="h-full w-full">
                          <AvatarImage src={leaderboard[2].avatarUrl} />
                          <AvatarFallback className="font-bold text-lg bg-amber-800 text-white">{leaderboard[2].fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-1 bg-amber-700 text-white rounded-full h-7 w-7 flex items-center justify-center font-extrabold text-xs shadow-md">
                          3rd
                        </div>
                      </div>
                      <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">{leaderboard[2].fullName}</CardTitle>
                      <CardDescription className="text-xs">{leaderboard[2].email}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Badge className={getBadgeForAura(leaderboard[2].auraPoints).color}>
                          {getBadgeForAura(leaderboard[2].auraPoints).label}
                        </Badge>
                        <WeaponBadge
                          weapon={getStudentEquippedWeapon(leaderboard[2].id, 3, leaderboard[2].auraPoints)}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-4 text-xs font-mono pt-2 border-t">
                        <span className="font-bold text-amber-500">✨ {leaderboard[2].auraPoints} Aura</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-bold text-primary">🎓 {leaderboard[2].totalCredits} Credits</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Complete Rankings Table */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Medal className="h-5 w-5 text-primary" /> Full Student Leaderboard Standings
                  </CardTitle>
                  <CardDescription>Click any student to view their public profile, points, and theme collection.</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                  💡 Click row to inspect profile & equipped astra
                </Badge>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {leaderboard.map((st, idx) => {
                  const rank = idx + 1;
                  const badgeInfo = getBadgeForAura(st.auraPoints);
                  const stWeapon = getStudentEquippedWeapon(st.id, rank, st.auraPoints);

                  return (
                    <div
                      key={st.id}
                      onClick={() => { setSelectedStudent(st); setProfileModalOpen(true); }}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full font-mono font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 border ${
                          rank === 1 ? 'bg-amber-500 text-amber-950 border-amber-400' :
                          rank === 2 ? 'bg-slate-300 text-slate-900 border-slate-400' :
                          rank === 3 ? 'bg-amber-800 text-white border-amber-700' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>
                          #{rank}
                        </div>

                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border shrink-0">
                          <AvatarImage src={st.avatarUrl} />
                          <AvatarFallback className="font-bold">{st.fullName[0]}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 space-y-0.5">
                          <p className="font-bold text-sm text-foreground truncate flex items-center gap-2 group-hover:text-primary transition-colors">
                            {st.fullName}
                            {rank === 1 && <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500 inline" />}
                            {st.isPlacementPriority && (
                              <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-600/30 text-[10px] py-0 px-1.5 font-sans font-bold">
                                🎓 Placement Priority
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{st.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 font-mono text-xs pl-11 sm:pl-0 flex-wrap">
                        <WeaponBadge weapon={stWeapon} size="sm" />
                        {st.currentStreak > 0 && (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30 font-bold gap-1 text-[11px]">
                            <Flame className="h-3 w-3 fill-orange-500" /> {st.currentStreak} Streak
                          </Badge>
                        )}
                        <Badge variant="outline" className={`hidden sm:inline-flex ${badgeInfo.color}`}>
                          {badgeInfo.label}
                        </Badge>
                        <div className="text-right">
                          <p className="font-bold text-amber-500 text-sm">✨ {st.auraPoints} Aura</p>
                          <p className="text-[11px] text-muted-foreground">🎓 {st.totalCredits} Credits</p>
                        </div>
                        <div className="hidden md:flex items-center text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
        </div>
      </FeatureGate>

      <PublicStudentProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        student={selectedStudent}
        currentUserId={currentUserId}
      />
    </Layout>
  );
}
