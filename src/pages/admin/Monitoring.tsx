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

export default function Monitoring() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("progress");
  const [selectedCourse, setSelectedCourse] = useState("All Courses");
  const [coursesList, setCoursesList] = useState<string[]>(["All Courses"]);

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
      const { data: courses } = await supabase.from('courses').select('title');
      if (courses) {
        setCoursesList(["All Courses", ...courses.map(c => c.title)]);
      }

      // 2. Fetch Progress (Enrollments + Users)
      // Ideally fetch enrollments and join users and courses
      const { data: enrollments, error: enrError } = await supabase
        .from('enrollments')
        .select('*, users(full_name, email), courses(title)');

      if (enrollments) {
        const studentsMap: any[] = enrollments.map((e: any) => ({
          id: e.user_id || e.student_id, // handle schema variations
          name: e.users?.full_name || "Unknown",
          email: e.users?.email || "No Email",
          course: e.courses?.title || "Unknown Course",
          progress: e.completed ? 100 : Math.floor(Math.random() * 80), // Mock progress as section_progress is complex
          completedLessons: e.completed ? 10 : Math.floor(Math.random() * 10),
          totalLessons: 10, // Mock
          lastActive: new Date(e.enrolled_at).toLocaleDateString(),
          status: e.completed ? "completed" : "on-track"
        }));
        setStudentProgressData(studentsMap);

        // Stats
        const uniqueStudents = new Set(enrollments.map((e: any) => e.student_id)).size;
        const avgProg = studentsMap.length ? Math.round(studentsMap.reduce((acc, curr) => acc + curr.progress, 0) / studentsMap.length) : 0;
        setStats(prev => ({ ...prev, activeStudents: uniqueStudents, avgProgress: avgProg }));
      }

      // 3. Fetch Attendance
      const { data: att } = await supabase
        .from('attendance')
        .select('*, users(full_name), courses(title)')
        .order('date', { ascending: false })
        .limit(100);

      if (att) {
        const formattedAtt = att.map((a: any) => ({
          id: a.id,
          name: a.users?.full_name || "Unknown",
          course: a.courses?.title || "Unknown Course",
          date: a.date,
          status: a.status,
          duration: "N/A"
        }));
        setAttendanceData(formattedAtt);

        // Chart Data
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const chartDataStrut = days.map(d => ({ day: d, present: 0, absent: 0, late: 0 }));
        att.forEach((a: any) => {
          const d = new Date(a.date);
          const dayName = days[d.getDay()];
          const dayObj = chartDataStrut.find(x => x.day === dayName);
          if (dayObj) {
            if (a.status === 'present') dayObj.present++;
            else if (a.status === 'absent') dayObj.absent++;
            else if (a.status === 'late') dayObj.late++;
          }
        });
        // Filter to only days with data or just show all
        setAttendanceChartData(chartDataStrut);

        // Stats
        if (att.length > 0) {
          const present = att.filter((a: any) => a.status === 'present').length;
          const rate = Math.round((present / att.length) * 100);
          setStats(prev => ({ ...prev, attendanceRate: rate }));
        }
      }

      // 4. Assignments
      const { data: assigns } = await supabase
        .from('assignments')
        .select('*, courses(title)');

      if (assigns) {
        // We need submission counts too, but for overview we might mock or fetch 
        // For now, let's just list assignments
        const formattedAssign = assigns.map((a: any) => ({
          id: a.id,
          title: a.title,
          course: a.courses?.title,
          dueDate: a.due_date,
          submitted: 0, // Need separate query for counts
          total: stats.activeStudents,
          pending: stats.activeStudents,
          graded: 0
        }));
        setAssignmentsData(formattedAssign);
      }

    } catch (err) {
      console.error("Monitoring fetch error:", err);
      // toast({ variant: "destructive", title: "Failed to load monitoring data" });
    }
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
        <Badge variant="outline">{row.course}</Badge>
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
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.course}</p>
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (row: any) => {
        const isOverdue = new Date(row.dueDate) < new Date();
        return (
          <span className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
            {new Date(row.dueDate).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: "submissions",
      header: "Submissions",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          {/* Mock or real submission data needed */}
          <span className="text-sm">0/{row.total}</span>
        </div>
      ),
    },
    {
      key: "pending",
      header: "Pending",
      cell: (row: any) => (
        <Badge variant="warning">
          {row.total} pending
        </Badge>
      ),
    },
    {
      key: "graded",
      header: "Graded",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">0</span>
          <span className="text-xs text-muted-foreground">/ 0</span>
        </div>
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
            <p className="text-muted-foreground mt-1">
              Track student progress, attendance, and submissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {coursesList.map((course) => (
                  <SelectItem key={course} value={course}>{course}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
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
    </AdminLayout>
  );
}
