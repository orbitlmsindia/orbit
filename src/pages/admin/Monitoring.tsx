import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Users,
  BookOpen,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { StudentReportCardModal } from "@/components/reports/StudentReportCardModal";

export default function Monitoring() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("progress");
  const [selectedCourse, setSelectedCourse] = useState("All Courses");
  const [coursesList, setCoursesList] = useState<string[]>(["All Courses"]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<any>(null);

  const [studentProgressData, setStudentProgressData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>([]);
  const [assignmentsData, setAssignmentsData] = useState<any[]>([]);

  const [stats, setStats] = useState({
    activeStudents: 0,
    avgProgress: 0,
    attendanceRate: 0,
    pendingReviews: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Courses for filter
      const { data: courses } = await supabase.from('courses').select('id, title');
      if (courses) {
        setCoursesList(["All Courses", ...courses.map(c => c.title)]);
      }

      // 2. Fetch all student users from public.users
      const { data: studentUsers } = await supabase
        .from('users')
        .select('id, full_name, email, aura_points, bonus_credits, role, status')
        .eq('role', 'student');

      // 3. Fetch enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, student_id, status, completed, enrolled_at, course:courses(id, title, credit_points)');

      // 4. Fetch submissions
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, student_id, grade, status');

      const pendingCount = (submissions || []).filter(s => s.status === 'pending').length;

      // Combine student user data with enrollments
      const studentList = (studentUsers || []).map((u: any) => {
        const userEnrs = (enrollments || []).filter(e => e.student_id === u.id);
        const approvedEnrs = userEnrs.filter(e => e.status === 'approved');
        const completedEnrs = userEnrs.filter(e => e.status === 'approved' && e.completed === true);
        
        const courseCreds = completedEnrs.reduce((acc, e) => {
          const c = Array.isArray(e.course) ? e.course[0] : e.course;
          return acc + (c?.credit_points || 3);
        }, 0);

        const totalCreds = courseCreds + (u.bonus_credits || 0);

        const courseNames = userEnrs.map(e => {
          const c = Array.isArray(e.course) ? e.course[0] : e.course;
          return c?.title || "Enrolled Course";
        }).join(", ");

        const computedProgress = approvedEnrs.length > 0 ? Math.min(100, approvedEnrs.length * 25 + (u.aura_points || 0)) : (u.aura_points ? Math.min(100, u.aura_points * 5) : 0);

        return {
          id: u.id,
          name: u.full_name || "Student User",
          email: u.email || "No email",
          course: courseNames || "General Learner",
          progress: computedProgress,
          aura: u.aura_points || 0,
          credits: totalCreds,
          completedLessons: approvedEnrs.length,
          totalLessons: Math.max(10, approvedEnrs.length * 3),
          lastActive: "Today",
          status: computedProgress >= 80 ? "completed" : "on-track"
        };
      });

      setStudentProgressData(studentList);

      // 5. Fetch Assignments & Submissions
      const { data: assignmentsList } = await supabase
        .from('assignments')
        .select('id, title, due_date, course_id, courses(title)');

      const formattedAssignments = (assignmentsList || []).map((a: any) => {
        const courseObj = Array.isArray(a.courses) ? a.courses[0] : a.courses;
        const assignSubs = (submissions || []).filter((s: any) => s.assignment_id === a.id);
        const pendingSubs = assignSubs.filter((s: any) => s.status === 'pending').length;
        const gradedSubs = assignSubs.filter((s: any) => s.status === 'graded').length;

        return {
          id: a.id,
          title: a.title || "Course Assignment",
          course: courseObj?.title || "General Course",
          dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString() : "No Due Date",
          submitted: assignSubs.length,
          pending: pendingSubs,
          graded: gradedSubs,
          totalStudents: activeCount
        };
      });

      setAssignmentsData(formattedAssignments);

      setStats({
        activeStudents: activeCount,
        avgProgress: avgProg,
        attendanceRate: 94,
        pendingReviews: pendingCount
      });

    } catch (err) {
      console.error("Monitoring fetch error:", err);
    }
  };

  const handleExportStudentReport = () => {
    if (studentProgressData.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No student records available for export." });
      return;
    }

    const csvRows = [
      ["Student Name", "Email", "Enrolled Courses", "Progress (%)", "Aura Points (XP)", "Earned Credits", "Status"].join(",")
    ];

    studentProgressData.forEach((s) => {
      csvRows.push([
        `"${s.name}"`,
        `"${s.email}"`,
        `"${s.course}"`,
        s.progress,
        s.aura,
        s.credits,
        `"${s.status}"`
      ].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbit_lms_student_progress_report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Report Exported! 📊", description: "Student-wise progress CSV report downloaded." });
  };


  const progressColumns = [
    {
      key: "name",
      header: "Student",
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {row.name.split(" ").map((n: string) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "course",
      header: "Course",
      cell: (row: any) => (
        <Badge variant="outline" className="max-w-[160px] truncate block" title={row.course}>{row.course}</Badge>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      cell: (row: any) => (
        <div className="flex items-center gap-3 w-32">
          <Progress
            value={row.progress}
            size="sm"
            variant={row.progress === 100 ? "success" : row.progress < 30 ? "warning" : "default"}
          />
          <span className="text-sm font-medium w-10">{row.progress}%</span>
        </div>
      ),
    },
    {
      key: "lessons",
      header: "Lessons",
      cell: (row: any) => (
        <span className="text-muted-foreground">
          {row.completedLessons} / {row.totalLessons}
        </span>
      ),
    },
    {
      key: "lastActive",
      header: "Last Active",
      cell: (row: any) => (
        <span className="text-muted-foreground">{row.lastActive}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => {
        const statusConfig: any = {
          "on-track": { label: "On Track", variant: "success", icon: CheckCircle },
          "behind": { label: "Behind", variant: "warning", icon: Clock },
          "at-risk": { label: "At Risk", variant: "destructive", icon: AlertCircle },
          "completed": { label: "Completed", variant: "success", icon: CheckCircle },
        };
        const config = statusConfig[row.status] || statusConfig["on-track"];
        return (
          <Badge variant={config.variant} className="gap-1">
            <config.icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Report Card",
      cell: (row: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedStudentForReport(row);
            setReportModalOpen(true);
          }}
          className="gap-1 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
        >
          <FileText className="h-3.5 w-3.5" /> Report Card
        </Button>
      ),
    },
  ];

  const attendanceColumns = [
    {
      key: "name",
      header: "Student",
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {row.name.split(" ").map((n: string) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "course",
      header: "Course",
      cell: (row: any) => row.course,
    },
    {
      key: "date",
      header: "Date",
      cell: (row: any) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => {
        const statusConfig: any = {
          present: { label: "Present", variant: "success" },
          absent: { label: "Absent", variant: "destructive" },
          late: { label: "Late", variant: "warning" },
        };
        const config = statusConfig[row.status] || { label: row.status, variant: "secondary" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "duration",
      header: "Duration",
      cell: (row: any) => (
        <span className="text-muted-foreground">{row.duration}</span>
      ),
    },
  ];

  const assignmentColumns = [
    {
      key: "title",
      header: "Assignment",
      cell: (row: any) => (
        <div>
          <p className="font-semibold text-foreground">{row.title}</p>
          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
            {row.course}
          </Badge>
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (row: any) => (
        <span className="text-xs font-mono text-muted-foreground">{row.dueDate}</span>
      ),
    },
    {
      key: "submissions",
      header: "Submissions",
      cell: (row: any) => (
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
          <span>{row.submitted}</span>
          <span className="text-muted-foreground font-normal">/ {row.totalStudents || 1} students</span>
        </div>
      ),
    },
    {
      key: "pending",
      header: "Pending Review",
      cell: (row: any) => (
        <Badge variant={row.pending > 0 ? "warning" : "outline"} className="font-mono text-xs">
          {row.pending} pending
        </Badge>
      ),
    },
    {
      key: "graded",
      header: "Graded",
      cell: (row: any) => (
        <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          {row.graded} graded
        </Badge>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Monitoring
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track student progress, attendance, and submissions
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {coursesList.map((course) => (
                  <SelectItem key={course} value={course}>{course}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default" onClick={handleExportStudentReport} className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground font-bold shadow-sm">
              <Download className="h-4 w-4 shrink-0" />
              <span>Export Student Report (CSV)</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeStudents}</p>
                <p className="text-sm text-muted-foreground">Active Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                <p className="text-sm text-muted-foreground">Avg. Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingReviews}</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="progress" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Student Progress
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <Users className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <FileText className="h-4 w-4" />
              Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="mt-6">
            <DataTable
              data={studentProgressData}
              columns={progressColumns}
              searchPlaceholder="Search students..."
            />
          </TabsContent>

          <TabsContent value="attendance" className="mt-6 space-y-6">
            {/* Attendance Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">Weekly Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceChartData.length ? attendanceChartData : [{ day: 'Mon', present: 0 }]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="present" fill="hsl(142, 71%, 45%)" name="Present" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="late" fill="hsl(38, 92%, 50%)" name="Late" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" fill="hsl(0, 72%, 51%)" name="Absent" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <DataTable
              data={attendanceData}
              columns={attendanceColumns}
              searchPlaceholder="Search attendance records..."
            />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <DataTable
              data={assignmentsData}
              columns={assignmentColumns}
              searchPlaceholder="Search assignments..."
            />
          </TabsContent>
        </Tabs>
      </div>
      <StudentReportCardModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        student={selectedStudentForReport}
      />
    </AdminLayout>
  );
}
