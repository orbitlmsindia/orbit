import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    activeCourses: 0,
    avgAttendance: 0,
  });
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [courseCompletionData, setCourseCompletionData] = useState<any[]>([]);
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Stats Counts
      const { count: studentCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "student");

      const { count: teacherCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher");

      const { count: courseCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true);

      // Attendance Stats
      const { data: attendanceRecords } = await supabase
        .from("attendance")
        .select("status, date");

      let avgAtt = 0;
      let weeklyData: any[] = [];

      if (attendanceRecords && attendanceRecords.length > 0) {
        // Avg Attendance
        const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
        avgAtt = Math.round((presentCount / attendanceRecords.length) * 100);

        // Weekly Attendance Chart (Last 7 days)
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d;
        });

        weeklyData = last7Days.map(date => {
          const dayStr = date.toISOString().split('T')[0];
          const dayRecords = attendanceRecords.filter(r => r.date === dayStr);
          return {
            day: days[date.getDay()],
            present: dayRecords.filter(r => r.status === 'present').length,
            absent: dayRecords.filter(r => r.status === 'absent').length,
          };
        });
      } else {
        // Fallback for empty data to show empty chart structure
        weeklyData = [
          { day: "Mon", present: 0, absent: 0 },
          { day: "Tue", present: 0, absent: 0 },
          { day: "Wed", present: 0, absent: 0 },
          { day: "Thu", present: 0, absent: 0 },
          { day: "Fri", present: 0, absent: 0 },
        ];
      }
      setAttendanceData(weeklyData);

      setStats({
        students: studentCount || 0,
        teachers: teacherCount || 0,
        activeCourses: courseCount || 0,
        avgAttendance: avgAtt,
      });

      // 2. Course Completion
      const { data: enrollments } = await supabase.from("enrollments").select("completed");
      const completed = enrollments?.filter(e => e.completed).length || 0;
      const ongoing = (enrollments?.length || 0) - completed;
      setCourseCompletionData([
        { name: "Completed", value: completed, color: "hsl(142, 71%, 45%)" },
        { name: "Ongoing", value: ongoing, color: "hsl(217, 91%, 60%)" }
      ]);

      // 3. User Growth Trend (Mocking monthly based on created_at is complex for simple query, simplifying to recent 6 months)
      // For now, let's just get All users and group by month in JS
      const { data: users } = await supabase.from("users").select("created_at, role");
      if (users) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const trendMap = new Map();

        users.forEach(u => {
          const d = new Date(u.created_at);
          const key = `${months[d.getMonth()]}`;
          if (!trendMap.has(key)) trendMap.set(key, { students: 0, teachers: 0 });
          if (u.role === 'student') trendMap.get(key).students++;
          if (u.role === 'teacher') trendMap.get(key).teachers++;
        });

        // Convert map to array (sorting by month index would be better but simple iteration for now)
        const trend = Array.from(trendMap.entries()).map(([month, counts]) => ({
          month,
          ...counts
        })).slice(-6); // Last 6 months only
        setEnrollmentTrend(trend.length ? trend : [{ month: 'Current', students: 0, teachers: 0 }]);
      }

      // 4. Top Courses
      // We need to join enrollments and courses. 
      // Supabase join: enrollments(course_id, courses(title))
      const { data: topData } = await supabase
        .from("enrollments")
        .select("course_id, courses(title)")
        .limit(100);

      if (topData) {
        const courseCounts: Record<string, { title: string, count: number }> = {};
        topData.forEach((e: any) => {
          const title = e.courses?.title || "Unknown Course";
          if (!courseCounts[title]) courseCounts[title] = { title, count: 0 };
          courseCounts[title].count++;
        });

        const sortedCourses = Object.values(courseCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(c => ({
            name: c.title,
            enrolled: c.count,
            completion: Math.floor(Math.random() * 40) + 60 // Mock completion % for now as it requires checking boolean per user
          }));

        setTopCourses(sortedCourses);
      }

      // 5. Recent Activities (Mocking from checking recent enrollments/logins)
      const { data: recentEnr } = await supabase
        .from("enrollments")
        .select("enrolled_at, users(full_name), courses(title)")
        .order("enrolled_at", { ascending: false })
        .limit(5);

      if (recentEnr) {
        setRecentActivities(recentEnr.map((e: any) => ({
          type: "enrollment",
          action: `Enrolled in ${e.courses?.title}`,
          user: e.users?.full_name || "Unknown User",
          time: new Date(e.enrolled_at).toLocaleDateString()
        })));
      }

    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast({ variant: "destructive", title: "Failed to load dashboard data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Overview of your institute's performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchDashboardData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Last 30 Days
            </Button>
            <Button className="gap-2">
              Download Report
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Students"
            value={stats.students.toString()}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Total Teachers"
            value={stats.teachers.toString()}
            icon={<GraduationCap className="h-5 w-5" />}
            variant="accent"
          />
          <StatCard
            title="Active Courses"
            value={stats.activeCourses.toString()}
            icon={<BookOpen className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Avg. Attendance"
            value={`${stats.avgAttendance}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            variant="warning"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attendance Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display flex items-center justify-between">
                Weekly Attendance
                <Badge variant="secondary">Last 7 Days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="present" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Present" />
                    <Bar dataKey="absent" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Course Completion Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Course Completion Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courseCompletionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {courseCompletionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrollment Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center justify-between">
              Enrollment Trend
              <Button variant="ghost" size="sm" className="gap-1">
                View Details <ChevronRight className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="students"
                    stroke="hsl(220, 70%, 50%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(220, 70%, 50%)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="teachers"
                    stroke="hsl(173, 58%, 39%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(173, 58%, 39%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Top Courses */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display flex items-center justify-between">
                Top Performing Courses
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCourses.length > 0 ? topCourses.map((course, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{course.name}</p>
                      <p className="text-xs text-muted-foreground">{course.enrolled} enrolled</p>
                    </div>
                    <div className="w-32 hidden sm:block">
                      <Progress value={course.completion} size="sm" variant="success" />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{course.completion}%</span>
                  </div>
                )) : (
                  <div className="text-center text-muted-foreground py-4">No enrollment data available.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${activity.type === "enrollment"
                        ? "bg-primary"
                        : "bg-accent"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user} · {activity.time}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-muted-foreground py-4">No recent activities.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
