import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Search,
  BookOpen,
  Users,
  FileText,
  Video,
  Sparkles,
  Calendar,
  BarChart2,
  CheckSquare,
  ArrowRight,
  Command,
  Loader2,
  Receipt,
  Award
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SpotlightSearchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SpotlightSearch({ open: externalOpen, onOpenChange }: SpotlightSearchProps) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [onOpenChange]
  );

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>("student");
  const [userId, setUserId] = useState<string | null>(null);

  const [coursesResult, setCoursesResult] = useState<any[]>([]);
  const [certProgramsResult, setCertProgramsResult] = useState<any[]>([]);
  const [lessonsResult, setLessonsResult] = useState<any[]>([]);
  const [studentsResult, setStudentsResult] = useState<any[]>([]);

  // 1. Listen for Cmd+G / Ctrl+G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  // 2. Fetch User Profile & Role
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUser();
  }, []);

  // 3. Perform Role-Aware Search
  useEffect(() => {
    if (!query.trim() || !userId) {
      setCoursesResult([]);
      setCertProgramsResult([]);
      setLessonsResult([]);
      setStudentsResult([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${query.trim()}%`;

      try {
        // --- Certificate Programs Search (Searchable across all roles) ---
        try {
          const { data: certProgs } = await supabase
            .from("certificate_programs")
            .select("id, title, description, total_credits")
            .ilike("title", q)
            .limit(5);

          let matchingCertProgs = certProgs || [];
          if (matchingCertProgs.length === 0) {
            const fallbackProgs = [
              {
                id: "cert-1",
                title: "Full-Stack Software Engineering Mastery Certification",
                description: "Complete 20 Credits across core Web Architecture, React, Node.js, and Cloud Computing.",
                total_credits: 20
              },
              {
                id: "cert-2",
                title: "AI, Data Science & Neural Engineering Specialization",
                description: "Master Machine Learning, Python Neural Networks, and Generative AI Application Engineering.",
                total_credits: 20
              },
              {
                id: "cert-3",
                title: "Cyber Security & Defensive Infrastructure Specialist",
                description: "Comprehensive hands-on training in network defense, ethical hacking, vulnerability management.",
                total_credits: 16
              },
              {
                id: "cert-4",
                title: "Cloud DevOps & Multi-Region Systems Architecture",
                description: "Architect cloud infrastructure, container orchestration, automated CI/CD pipelines.",
                total_credits: 18
              }
            ];
            matchingCertProgs = fallbackProgs.filter(p =>
              p.title.toLowerCase().includes(query.trim().toLowerCase()) ||
              p.description.toLowerCase().includes(query.trim().toLowerCase())
            );
          }
          setCertProgramsResult(matchingCertProgs);
        } catch (cErr) {
          console.warn("Cert search warning:", cErr);
        }

        if (userRole === "teacher") {
          // --- TEACHER ROLE ---
          const { data: teacherCourses } = await supabase
            .from("courses")
            .select("id, title, description, is_published")
            .eq("teacher_id", userId)
            .ilike("title", q)
            .limit(5);
          setCoursesResult(teacherCourses || []);

          const { data: teacherLessons } = await supabase
            .from("section_contents")
            .select("id, title, type, section_id, course_sections!inner(course_id, courses!inner(teacher_id, title))")
            .filter("course_sections.courses.teacher_id", "eq", userId)
            .ilike("title", q)
            .limit(5);

          setLessonsResult(
            (teacherLessons || []).map((l: any) => ({
              id: l.id,
              title: l.title,
              type: l.type,
              courseId: l.course_sections?.course_id,
              courseTitle: l.course_sections?.courses?.title
            }))
          );

          const { data: teacherEnrollments } = await supabase
            .from("enrollments")
            .select("id, course_id, transaction_id, status, users!student_id(full_name, email), courses!inner(teacher_id, title)")
            .filter("courses.teacher_id", "eq", userId)
            .or(`transaction_id.ilike.${q},users.full_name.ilike.${q},users.email.ilike.${q}`)
            .limit(5);

          setStudentsResult(
            (teacherEnrollments || []).map((e: any) => ({
              id: e.id,
              name: e.users?.full_name || "Student",
              email: e.users?.email,
              transactionId: e.transaction_id,
              courseId: e.course_id,
              courseTitle: e.courses?.title,
              status: e.status
            }))
          );

        } else if (userRole === "admin") {
          // --- ADMIN ROLE ---
          const { data: allCourses } = await supabase
            .from("courses")
            .select("id, title, description")
            .ilike("title", q)
            .limit(5);
          setCoursesResult(allCourses || []);

          const { data: allLessons } = await supabase
            .from("section_contents")
            .select("id, title, type, section_id, course_sections!inner(course_id, courses!inner(title))")
            .ilike("title", q)
            .limit(5);

          setLessonsResult(
            (allLessons || []).map((l: any) => ({
              id: l.id,
              title: l.title,
              type: l.type,
              courseId: l.course_sections?.course_id,
              courseTitle: l.course_sections?.courses?.title
            }))
          );

          const { data: allEnrollments } = await supabase
            .from("enrollments")
            .select("id, course_id, transaction_id, status, users!student_id(full_name, email), courses!inner(title)")
            .or(`transaction_id.ilike.${q},users.full_name.ilike.${q},users.email.ilike.${q}`)
            .limit(5);

          setStudentsResult(
            (allEnrollments || []).map((e: any) => ({
              id: e.id,
              name: e.users?.full_name || "User",
              email: e.users?.email,
              transactionId: e.transaction_id,
              courseId: e.course_id,
              courseTitle: e.courses?.title,
              status: e.status
            }))
          );

        } else {
          // --- STUDENT ROLE ---
          const { data: studentCourses } = await supabase
            .from("courses")
            .select("id, title, description")
            .eq("is_published", true)
            .ilike("title", q)
            .limit(5);
          setCoursesResult(studentCourses || []);

          const { data: studentLessons } = await supabase
            .from("section_contents")
            .select("id, title, type, section_id, course_sections!inner(course_id, courses!inner(title))")
            .ilike("title", q)
            .limit(5);

          setLessonsResult(
            (studentLessons || []).map((l: any) => ({
              id: l.id,
              title: l.title,
              type: l.type,
              courseId: l.course_sections?.course_id,
              courseTitle: l.course_sections?.courses?.title
            }))
          );

          setStudentsResult([]);
        }
      } catch (err) {
        console.error("Spotlight search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, userId, userRole]);

  const handleSelectCourse = (courseId: string) => {
    setOpen(false);
    if (userRole === "teacher") {
      navigate(`/teacher/courses/${courseId}`);
    } else if (userRole === "admin") {
      navigate(`/admin/courses/${courseId}`);
    } else {
      navigate(`/student/courses/${courseId}/learn`);
    }
  };

  const handleSelectCertProgram = (title: string) => {
    setOpen(false);
    navigate(`/student/courses?tab=programs&search=${encodeURIComponent(title)}`);
  };

  const handleSelectStudent = (courseId: string) => {
    setOpen(false);
    if (userRole === "teacher") {
      navigate(`/teacher/courses/${courseId}?tab=students`);
    } else if (userRole === "admin") {
      navigate(`/admin/courses/${courseId}?tab=students`);
    }
  };

  const handleQuickNav = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  // Static Quick Nav Shortcuts based on Role
  const quickActions =
    userRole === "teacher"
      ? [
          { title: "My Courses", path: "/teacher/courses", icon: BookOpen },
          { title: "JSON Course Builder", path: "/teacher/courses/json-builder", icon: Sparkles },
          { title: "Mark Attendance", path: "/teacher/attendance", icon: CheckSquare },
          { title: "Analytics & Performance", path: "/teacher/analytics", icon: BarChart2 },
        ]
      : userRole === "admin"
      ? [
          { title: "Admin Dashboard", path: "/admin", icon: BarChart2 },
          { title: "Manage Courses", path: "/admin/courses", icon: BookOpen },
          { title: "Manage Users", path: "/admin/users", icon: Users },
        ]
      : [
          { title: "Course Catalog", path: "/student/courses", icon: BookOpen },
          { title: "Certification Programs", path: "/student/courses?tab=programs", icon: Award },
          { title: "My Attendance", path: "/student/attendance", icon: CheckSquare },
          { title: "Schedule / Calendar", path: "/student/calendar", icon: Calendar },
        ];

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 border-border bg-card shadow-2xl rounded-2xl">
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-border bg-muted/20">
          <Search className="h-5 w-5 text-primary shrink-0 mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${userRole === "teacher" ? "courses, certifications, Tx IDs..." : userRole === "admin" ? "courses, certs, users..." : "courses, certifications & lessons..."} (Press Esc to close)`}
            className="h-14 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/70"
            autoFocus
          />
          {loading && <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0 ml-2" />}
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-1 rounded border">
            <Command className="h-3 w-3" /> K
          </div>
        </div>

        {/* Results Body */}
        <div className="max-h-[380px] overflow-y-auto p-4 space-y-4">
          {/* 1. Certification Programs Section */}
          {certProgramsResult.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-purple-400" /> Certification Pathways
              </p>
              <div className="space-y-1">
                {certProgramsResult.map((cp) => (
                  <div
                    key={cp.id}
                    onClick={() => handleSelectCertProgram(cp.title)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-purple-500/10 border border-purple-500/20 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                        <Award className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground group-hover:text-purple-400 transition-colors">
                            {cp.title}
                          </p>
                          <Badge className="bg-purple-600 text-white text-[10px] py-0 font-mono shrink-0">
                            🎓 {cp.total_credits || 20} Credits
                          </Badge>
                        </div>
                        {cp.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {cp.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Courses Section */}
          {coursesResult.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Courses
              </p>
              <div className="space-y-1">
                {coursesResult.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCourse(c.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {c.title}
                        </p>
                        {c.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Lessons Section */}
          {lessonsResult.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Lessons & Content
              </p>
              <div className="space-y-1">
                {lessonsResult.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => handleSelectCourse(l.courseId)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-secondary/50 flex items-center justify-center text-foreground">
                        {l.type === "video" ? <Video className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {l.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          In {l.courseTitle || "Course"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Students / Enrollments / Tx IDs Section */}
          {studentsResult.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Students & Verifications
              </p>
              <div className="space-y-1">
                {studentsResult.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStudent(s.courseId)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-xs">
                        {s.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                            {s.name}
                          </p>
                          <Badge variant="outline" className="text-[10px] py-0 font-normal">
                            {s.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.email} {s.transactionId ? `• Tx ID: ${s.transactionId}` : ""}
                        </p>
                      </div>
                    </div>
                    <Receipt className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Quick Actions (shown when search query is short or empty) */}
          {(!query.trim() || (coursesResult.length === 0 && lessonsResult.length === 0 && studentsResult.length === 0)) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Quick Navigation
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div
                      key={act.path}
                      onClick={() => handleQuickNav(act.path)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {act.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Branding */}
        <div className="px-4 py-2.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Spotlight powered by SIN Intelligence</span>
          </div>
          <span className="text-[11px] text-muted-foreground/80">Role: <span className="capitalize font-semibold text-foreground">{userRole}</span></span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
