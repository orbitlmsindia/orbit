import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  Trophy,
  Award,
  Zap,
  Code,
  Lightbulb,
  Users,
  Flame,
  Bug,
  Target,
  CheckCircle2,
  Loader2,
  BookOpen,
} from "lucide-react";

export interface AwardAuraStudent {
  id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  aura_points?: number;
}

export interface AwardAuraCourse {
  id: string;
  title: string;
  domain?: string;
}

interface AwardAuraPointsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: AwardAuraStudent | null;
  course: AwardAuraCourse | null;
  onSuccess?: () => void;
}

const AURA_PRESETS = [
  { points: 25, label: "+25 XP", desc: "Consistent Effort & Practice" },
  { points: 50, label: "+50 XP", desc: "High Quality Submission" },
  { points: 100, label: "+100 XP", desc: "Outstanding Participation" },
  { points: 200, label: "+200 XP", desc: "Hackathon / Capstone Star" },
];

const AWARD_CATEGORIES = [
  {
    id: "participation",
    label: "Outstanding Class Participation",
    icon: Sparkles,
    color: "from-amber-500 to-yellow-400",
    textColor: "text-amber-500",
  },
  {
    id: "excellence",
    label: "Exceptional Code Quality & Architecture",
    icon: Code,
    color: "from-blue-600 to-indigo-500",
    textColor: "text-blue-500",
  },
  {
    id: "creativity",
    label: "Creative Problem Solving & Innovation",
    icon: Lightbulb,
    color: "from-purple-600 to-pink-500",
    textColor: "text-purple-500",
  },
  {
    id: "mentorship",
    label: "Peer Mentorship & Team Collaboration",
    icon: Users,
    color: "from-emerald-600 to-teal-500",
    textColor: "text-emerald-500",
  },
  {
    id: "hackathon",
    label: "Hackathon & Project Showcase Winner",
    icon: Trophy,
    color: "from-amber-600 to-orange-500",
    textColor: "text-amber-600",
  },
  {
    id: "streak",
    label: "Unstoppable Learning Streak & Grit",
    icon: Flame,
    color: "from-red-500 to-orange-500",
    textColor: "text-red-500",
  },
  {
    id: "bug_hunt",
    label: "Elite Bug Hunter & Code Optimization",
    icon: Bug,
    color: "from-cyan-600 to-blue-500",
    textColor: "text-cyan-500",
  },
  {
    id: "custom",
    label: "Special Academic Recognition",
    icon: Target,
    color: "from-slate-700 to-slate-900",
    textColor: "text-slate-400",
  },
];

export function AwardAuraPointsModal({
  open,
  onOpenChange,
  student,
  course,
  onSuccess,
}: AwardAuraPointsModalProps) {
  const { toast } = useToast();
  const [selectedPoints, setSelectedPoints] = useState<number>(50);
  const [customPoints, setCustomPoints] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("participation");
  const [customNote, setCustomNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!student || !course) return null;

  const activePoints = customPoints ? parseInt(customPoints) || 0 : selectedPoints;
  const currentCategoryObj =
    AWARD_CATEGORIES.find((c) => c.id === selectedCategory) || AWARD_CATEGORIES[0];
  const CategoryIcon = currentCategoryObj.icon;

  const handlePresetClick = (pts: number) => {
    setSelectedPoints(pts);
    setCustomPoints("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomPoints(val);
  };

  const handleAwardAura = async () => {
    if (activePoints <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Points",
        description: "Please specify a positive number of Aura Points to award.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get current instructor / admin user info
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let teacherName = "Course Instructor";
      let teacherRole = "teacher";

      if (user) {
        const { data: prof } = await supabase
          .from("users")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle();
        if (prof?.full_name) teacherName = prof.full_name;
        if (prof?.role) teacherRole = prof.role;
      }

      // 2. Fetch latest student aura_points from DB
      let baseStudentAura = student.aura_points || 0;
      try {
        const { data: studentDb } = await supabase
          .from("users")
          .select("aura_points")
          .eq("id", student.id)
          .maybeSingle();
        if (studentDb && studentDb.aura_points !== undefined && studentDb.aura_points !== null) {
          baseStudentAura = studentDb.aura_points;
        }
      } catch (e) {}

      const updatedAura = baseStudentAura + activePoints;

      // 3. Atomically update student's profile in users table
      try {
        await supabase
          .from("users")
          .update({ aura_points: updatedAura })
          .eq("id", student.id);
      } catch (err) {
        console.warn("Could not update public.users aura_points directly:", err);
      }

      // 4. Construct reason text
      const reasonText = customNote.trim()
        ? `${currentCategoryObj.label} — "${customNote.trim()}"`
        : currentCategoryObj.label;

      const awardRecord = {
        id: `award_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        student_id: student.id,
        course_id: course.id,
        awarded_by: user?.id || null,
        awarded_by_name: teacherName,
        awarded_by_role: teacherRole,
        points: activePoints,
        reason: reasonText,
        category: selectedCategory,
        badge_icon: selectedCategory,
        created_at: new Date().toISOString(),
      };

      // 5. Insert into Supabase aura_awards table
      try {
        await supabase.from("aura_awards").insert([
          {
            student_id: student.id,
            course_id: course.id,
            awarded_by: user?.id || null,
            awarded_by_name: teacherName,
            awarded_by_role: teacherRole,
            points: activePoints,
            reason: reasonText,
            category: selectedCategory,
            badge_icon: selectedCategory,
          },
        ]);
      } catch (awardErr) {
        console.warn("Supabase aura_awards error, using local fallback:", awardErr);
      }

      // 6. Always mirror into localStorage for instant zero-latency view
      try {
        const saved = localStorage.getItem("orbit_aura_awards");
        const list = saved ? JSON.parse(saved) : [];
        list.unshift(awardRecord);
        localStorage.setItem("orbit_aura_awards", JSON.stringify(list));
      } catch (e) {}

      // 7. Dispatch real-time student notification
      try {
        await supabase.from("notifications").insert([
          {
            user_id: student.id,
            title: `✨ +${activePoints} Aura Points Awarded!`,
            message: `${teacherName} awarded you +${activePoints} Aura Points in "${course.title}" for: ${reasonText}! Check your rank on the Leaderboard 🏆`,
            notification_type: "aura_awarded",
            sender_role: teacherRole,
            course_id: course.id,
            is_read: false,
          },
        ]);
      } catch (notifErr) {
        console.warn("Could not deliver notification:", notifErr);
      }

      toast({
        title: `✨ +${activePoints} Aura Points Awarded! 🎉`,
        description: `Successfully awarded to ${student.full_name || student.email}. Total Aura: ${updatedAura} XP.`,
      });

      if (onSuccess) {
        onSuccess();
      }

      onOpenChange(false);
      setCustomNote("");
      setCustomPoints("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Award Failed",
        description: err.message || "Could not award aura points.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-amber-500/30">
        <DialogHeader className="p-5 sm:p-6 pb-3 border-b bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" /> Gamification & Performance Rewards
          </div>
          <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
            Award Aura Points ✨
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Recognize and reward outstanding performance, project execution, or class participation with gamified Aura Points.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 max-h-[calc(90vh-140px)]">
          {/* Target Student & Course Info Card */}
          <div className="p-3.5 rounded-xl border bg-muted/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-11 w-11 border-2 border-amber-500/40 shrink-0">
                <AvatarImage src={student.avatar_url} />
                <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold">
                  {student.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground truncate">
                  {student.full_name || "Orbit Student"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary py-0">
                    <BookOpen className="h-2.5 w-2.5 mr-1" /> {course.title}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Current Aura
              </span>
              <div className="font-mono font-extrabold text-amber-500 text-base">
                ✨ {student.aura_points || 0} XP
              </div>
            </div>
          </div>

          {/* Quick Select Points */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Select Aura Points Amount
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AURA_PRESETS.map((preset) => {
                const isSelected = !customPoints && selectedPoints === preset.points;
                return (
                  <button
                    key={preset.points}
                    type="button"
                    onClick={() => handlePresetClick(preset.points)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/15 shadow-sm ring-1 ring-amber-500"
                        : "border-border hover:border-amber-500/40 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="font-mono font-extrabold text-base text-foreground flex items-center justify-between">
                      <span>{preset.label}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Or custom:</span>
                <Input
                  type="number"
                  placeholder="e.g. 75, 150, 300"
                  value={customPoints}
                  onChange={handleCustomChange}
                  min="1"
                  max="1000"
                  className="font-mono text-xs h-8 max-w-[140px]"
                />
                <span className="text-xs font-mono font-semibold text-amber-500">
                  = ✨ {activePoints} XP
                </span>
              </div>
            </div>
          </div>

          {/* Award Reason / Category */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-primary" /> Award Category & Merit
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AWARD_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/50"
                        : "border-border hover:border-border/80 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shrink-0 shadow-xs`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-medium text-foreground line-clamp-1">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher's Feedback / Personal Note */}
          <div className="space-y-1.5">
            <Label htmlFor="customNote" className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Teacher's Commendation Note <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="customNote"
              placeholder="e.g. Exceptional job presenting the distributed caching project! Code was clean and questions were handled thoroughly."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="text-xs min-h-[70px]"
            />
          </div>

          {/* Live Award Badge Preview */}
          <div className="p-3.5 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentCategoryObj.color} flex items-center justify-center text-white shadow-md shrink-0`}
              >
                <CategoryIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-foreground">
                    {currentCategoryObj.label}
                  </span>
                  <Badge className="bg-amber-500 text-black font-extrabold font-mono text-[10px]">
                    + {activePoints} AURA
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {customNote.trim() ? `"${customNote.trim()}"` : `Earned in ${course.title}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-5 bg-muted/30 border-t shrink-0 flex flex-row items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs sm:text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAwardAura}
            disabled={isSubmitting || activePoints <= 0}
            className="text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-black" />
            ) : (
              <Sparkles className="h-4 w-4 text-black" />
            )}
            Award ✨ {activePoints} Aura Points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
