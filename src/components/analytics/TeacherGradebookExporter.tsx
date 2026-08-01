import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Printer, Search, Award, GraduationCap, ShieldCheck, CheckCircle2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { StudentIdCardModal } from "@/components/idcard/StudentIdCardModal";

interface TeacherGradebookExporterProps {
  courseId?: string;
  courseTitle?: string;
}

export function TeacherGradebookExporter({ courseId, courseTitle = "All Enrolled Courses" }: TeacherGradebookExporterProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentForIdCard, setSelectedStudentForIdCard] = useState<any>(null);
  const [idCardOpen, setIdCardOpen] = useState(false);

  useEffect(() => {
    fetchStudentPerformanceData();
  }, [courseId]);

  const fetchStudentPerformanceData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch teacher courses
      let query = supabase.from("enrollments").select(`
        id,
        student_id,
        enrolled_at,
        progress,
        status,
        completed,
        course:courses(id, title, domain, credit_points),
        student:users!student_id(id, full_name, email, avatar_url)
      `);

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data: enrollmentsData, error } = await query;
      if (error) throw error;

      // 2. Fetch submissions for marks
      const { data: submissions } = await supabase
        .from("submissions")
        .select("student_id, grade, status");

      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("student_id, score, percentage");

      const studentMap: Record<string, any> = {};

      (enrollmentsData || []).forEach((e: any) => {
        const studentObj = Array.isArray(e.student) ? e.student[0] : e.student;
        const courseObj = Array.isArray(e.course) ? e.course[0] : e.course;
        if (!studentObj) return;

        const sId = studentObj.id;
        const studentSubs = (submissions || []).filter((s) => s.student_id === sId);
        const studentQuizzes = (quizAttempts || []).filter((q) => q.student_id === sId);

        const gradedSubs = studentSubs.filter(s => s.grade !== null && s.grade !== undefined);
        const avgSubGrade = gradedSubs.length
          ? Math.round(gradedSubs.reduce((acc, s) => acc + Number(s.grade), 0) / gradedSubs.length)
          : null;

        const validQuizzes = studentQuizzes.filter(q => q.percentage !== null || q.score !== null);
        const avgQuizScore = validQuizzes.length
          ? Math.round(validQuizzes.reduce((acc, q) => acc + Number(q.percentage ?? q.score), 0) / validQuizzes.length)
          : null;

        let overallPercent = 0;
        if (avgSubGrade !== null && avgQuizScore !== null) {
          overallPercent = Math.round((avgSubGrade * 0.4) + (avgQuizScore * 0.6));
        } else if (avgSubGrade !== null) {
          overallPercent = avgSubGrade;
        } else if (avgQuizScore !== null) {
          overallPercent = avgQuizScore;
        } else {
          overallPercent = 0;
        }

        const studentProgress = e.progress !== null && e.progress !== undefined ? e.progress : (e.completed ? 100 : 0);

        if (!studentMap[sId]) {
          studentMap[sId] = {
            id: sId,
            name: studentObj.full_name || "Student User",
            email: studentObj.email || "",
            avatar: studentObj.avatar_url || "",
            domain: courseObj?.domain || "Orbit Engineering",
            courseTitle: courseObj?.title || courseTitle,
            enrolledAt: new Date(e.enrolled_at || Date.now()).toLocaleDateString(),
            progress: studentProgress,
            assignmentMarks: avgSubGrade !== null ? avgSubGrade : 0,
            hasAssignments: avgSubGrade !== null,
            quizMarks: avgQuizScore !== null ? avgQuizScore : 0,
            hasQuizzes: avgQuizScore !== null,
            totalGrade: overallPercent,
            creditsEarned: e.completed ? (courseObj?.credit_points || 3) : 0,
            status: e.completed ? "Elite (Completed)" : (overallPercent >= 75 ? "On Track" : "In Progress")
          };
        }
      });

      setStudents(Object.values(studentMap));
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error loading gradebook", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.courseTitle.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      toast({ variant: "destructive", title: "No data to export" });
      return;
    }

    const headers = [
      "Student ID",
      "Full Name",
      "Email Address",
      "Course Title",
      "Progress (%)",
      "Assignment Score (%)",
      "Quiz Score (%)",
      "Overall Grade (%)",
      "Status",
      "Enrolled Date"
    ];

    const csvRows = filteredStudents.map((s) => [
      `"${s.id}"`,
      `"${s.name}"`,
      `"${s.email}"`,
      `"${s.courseTitle}"`,
      `"${s.progress}"`,
      `"${s.assignmentMarks}"`,
      `"${s.quizMarks}"`,
      `"${s.totalGrade}"`,
      `"${s.status}"`,
      `"${s.enrolledAt}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Gradebook_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Gradebook CSV Exported! 📊", description: `Downloaded details for ${filteredStudents.length} students.` });
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleViewIdCard = (studentObj: any) => {
    setSelectedStudentForIdCard(studentObj);
    setIdCardOpen(true);
  };

  return (
    <Card className="shadow-md border">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Student Gradebook & Class Performance Matrix
          </CardTitle>
          <CardDescription>
            Inspect weekly progress, assignment scores, quiz marks, and export official reports.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2 border border-emerald-600/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white font-bold transition-colors">
            <FileSpreadsheet className="h-4 w-4" /> Download Excel (.CSV)
          </Button>
          <Button onClick={handlePrintReport} size="sm" className="gap-2 bg-primary text-primary-foreground font-bold">
            <Printer className="h-4 w-4" /> Print PDF Gradebook
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Search Filter */}
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs h-9"
          />
        </div>

        {/* PRINTABLE GRADEBOOK TABLE */}
        <div id="printable-gradebook-table" className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-xs">Student</TableHead>
                <TableHead className="font-bold text-xs">Course</TableHead>
                <TableHead className="font-bold text-xs text-center">Progress %</TableHead>
                <TableHead className="font-bold text-xs text-center">Assign Score</TableHead>
                <TableHead className="font-bold text-xs text-center">Quiz Score</TableHead>
                <TableHead className="font-bold text-xs text-center">Overall Grade</TableHead>
                <TableHead className="font-bold text-xs text-right">ID Card & Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                    No student records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs overflow-hidden shrink-0">
                          {s.avatar ? <img src={s.avatar} alt={s.name} className="h-full w-full object-cover" /> : s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground leading-snug">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <span className="font-semibold text-foreground">{s.courseTitle}</span>
                      <p className="text-[10px] text-muted-foreground">Enrolled: {s.enrolledAt}</p>
                    </TableCell>

                    <TableCell className="text-center text-xs font-mono font-bold">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                        {s.progress}%
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      {s.hasAssignments ? `${s.assignmentMarks}%` : <span className="text-muted-foreground text-[10px]">No Submissions</span>}
                    </TableCell>

                    <TableCell className="text-center text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      {s.hasQuizzes ? `${s.quizMarks}%` : <span className="text-muted-foreground text-[10px]">No Attempts</span>}
                    </TableCell>

                    <TableCell className="text-center text-xs font-mono font-bold">
                      <span className={`px-2 py-1 rounded text-xs ${s.totalGrade >= 85 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold' : s.totalGrade >= 60 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                        {s.totalGrade}%
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10"
                        onClick={() => handleViewIdCard(s)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Verify ID Card
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Student ID Card Modal Triggered from Gradebook */}
        <StudentIdCardModal
          open={idCardOpen}
          onOpenChange={setIdCardOpen}
          student={selectedStudentForIdCard}
        />
      </CardContent>
    </Card>
  );
}
