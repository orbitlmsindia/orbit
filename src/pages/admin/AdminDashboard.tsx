import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  SearchCode,
  Mail,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Sparkles,
  ChevronDown,
  Eye,
  Receipt,
  CreditCard,
  AlertTriangle,
  BellRing,
  Share2,
  CheckCheck
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
import { AdminInstitutionalReportModal } from "@/components/reports/AdminInstitutionalReportModal";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [stats, setStats] = useState({
    students: 0,
    activeStudents: 0,
    teachers: 0,
    activeCourses: 0,
    certificatePrograms: 0,
    avgAttendance: 0,
  });
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [courseCompletionData, setCourseCompletionData] = useState<any[]>([]);
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [selectedEnrollmentForView, setSelectedEnrollmentForView] = useState<any>(null);
  const [recentInquiries, setRecentInquiries] = useState<any[]>([]);
  const [billingReminder, setBillingReminder] = useState<{
    daysRemaining: number | null;
    expiryDate: string | null;
    pendingInvoicesCount: number;
    pendingAmount: number;
    collegeName: string;
    collegeId: string;
    reminderNote?: string | null;
    lastReminderSentAt?: string | null;
    billingReminderActive?: boolean;
  } | null>(null);

  const handleDismissReminder = async () => {
    if (!billingReminder?.collegeId) return;
    try {
      await supabase
        .from("colleges")
        .update({ billing_reminder_active: false })
        .eq("id", billingReminder.collegeId);

      setBillingReminder((prev) => prev ? { ...prev, billingReminderActive: false } : null);
      toast({
        title: "Reminder Acknowledged",
        description: "Directive marked as read.",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 0. Institutional Billing & Subscription Expiry Reminder from Master Admin
      let colId = sessionStorage.getItem("collegeId");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: u } = await supabase.from("users").select("college_id").eq("id", user.id).maybeSingle();
        if (u?.college_id) colId = u.college_id;
      }
      if (!colId) colId = "00000000-0000-0000-0000-000000000001";

      const { data: col } = await supabase
        .from("colleges")
        .select("id, name, subscription_expiry_date, activation_status, reminder_note, last_reminder_sent_at, billing_reminder_active")
        .eq("id", colId)
        .maybeSingle();

      const { data: pendingInvs } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .eq("college_id", colId)
        .eq("status", "pending");

      if (col) {
        const days = col.subscription_expiry_date
          ? Math.ceil((new Date(col.subscription_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        const pendAmt = (pendingInvs || []).reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);

        setBillingReminder({
          daysRemaining: days,
          expiryDate: col.subscription_expiry_date,
          pendingInvoicesCount: (pendingInvs || []).length,
          pendingAmount: pendAmt,
          collegeName: col.name || "Institution",
          collegeId: col.id || colId,
          reminderNote: col.reminder_note,
          lastReminderSentAt: col.last_reminder_sent_at,
          billingReminderActive: col.billing_reminder_active ?? false,
        });
      }

      // 1. Stats Counts
      const { count: studentCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "student");

      const { count: activeStudentCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "student")
        .or("status.eq.active,status.is.null");

      const { count: teacherCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher");

      const { count: courseCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true);

      const { count: certificateProgramsCount } = await supabase
        .from("certificate_programs")
        .select("*", { count: "exact", head: true });

      // Attendance Stats
      const { data: attendanceRecords } = await supabase
        .from("attendance")
        .select("status, date");

      let avgAtt = 0;
      let weeklyData: any[] = [];

      if (attendanceRecords && attendanceRecords.length > 0) {
        // Avg Attendance calculated from actual records
        const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
        const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
        avgAtt = Math.round(((presentCount + lateCount * 0.5) / attendanceRecords.length) * 100);

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
            absent: dayRecords.filter(r => r.status === 'absent' || r.status === 'late').length,
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
        activeStudents: activeStudentCount || 0,
        teachers: teacherCount || 0,
        activeCourses: courseCount || 0,
        certificatePrograms: certificateProgramsCount || 0,
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
      // Supabase join: enrollments(course_id, completed, courses(title))
      const { data: topData } = await supabase
        .from("enrollments")
        .select("course_id, completed, courses(title)")
        .limit(100);

      if (topData) {
        const courseCounts: Record<string, { title: string; count: number; completedCount: number }> = {};
        topData.forEach((e: any) => {
          const title = e.courses?.title || "Unknown Course";
          if (!courseCounts[title]) courseCounts[title] = { title, count: 0, completedCount: 0 };
          courseCounts[title].count++;
          if (e.completed) courseCounts[title].completedCount++;
        });

        const sortedCourses = Object.values(courseCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(c => ({
            name: c.title,
            enrolled: c.count,
            completion: c.count > 0 ? Math.round((c.completedCount / c.count) * 100) : 0
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

      // 6. Enrollments (Pending + All recent for View Details)
      const { data: allEnrs } = await supabase
        .from("enrollments")
        .select("id, transaction_id, enrolled_at, status, users:users!student_id(full_name, email), courses:courses!course_id(title, price)")
        .order("enrolled_at", { ascending: false })
        .limit(50);

      setAllEnrollments(allEnrs || []);
      const pending = (allEnrs || []).filter((e: any) => e.status === 'pending');
      setPendingEnrollments(pending);

      // 7. Get In Touch Recent Inquiries
      const { data: inquiries } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      setRecentInquiries(inquiries || []);

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

  const handleApproveEnrollment = async (enrollmentId: string, userEmail: string) => {
    try {
      const { error } = await supabase
        .from("enrollments")
        .update({ status: 'approved' })
        .eq("id", enrollmentId);
      if (error) throw error;

      toast({ title: "Enrollment Approved", description: `Confirmation email sent to ${userEmail}. Course access granted.` });
      fetchDashboardData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleRejectEnrollment = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from("enrollments")
        .update({ status: 'rejected' })
        .eq("id", enrollmentId);
      if (error) throw error;

      toast({ title: "Enrollment Declined." });
      fetchDashboardData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleQuickExportCSV = () => {
    try {
      const nowStr = new Date().toISOString().split("T")[0];
      let csv = `ORBIT LMS - INSTITUTIONAL PERFORMANCE REPORT\n`;
      csv += `Generated On,${new Date().toLocaleString()}\n`;
      csv += `Total Students,${stats.students}\n`;
      csv += `Total Teachers,${stats.teachers}\n`;
      csv += `Active Courses,${stats.activeCourses}\n`;
      csv += `Average Attendance,${stats.avgAttendance}%\n`;
      csv += `Pending Enrollments,${pendingEnrollments.length}\n\n`;

      csv += `--- TOP COURSES ENROLLMENT MATRIX ---\n`;
      csv += `Course Name,Enrolled Students,Completion Rate\n`;
      topCourses.forEach(c => {
        csv += `"${(c.name || '').replace(/"/g, '""')}",${c.enrolled || 0},${c.completion || 0}%\n`;
      });

      csv += `\n--- WEEKLY ATTENDANCE ---\n`;
      csv += `Day,Present,Absent\n`;
      attendanceData.forEach(a => {
        csv += `${a.day},${a.present || 0},${a.absent || 0}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbit_institutional_report_${nowStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({ title: "Report Downloaded! 📊", description: `Saved as orbit_institutional_report_${nowStr}.csv` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Error", description: e.message });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your institute's performance
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchDashboardData} disabled={loading} title="Refresh Dashboard">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" className="gap-2 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span>Last 30 Days</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 text-xs sm:text-sm font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90">
                  <Download className="h-4 w-4" />
                  <span>Download Report</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 space-y-1">
                <DropdownMenuItem onClick={() => setReportModalOpen(true)} className="cursor-pointer gap-2 font-semibold">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Official Letterhead PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleQuickExportCSV} className="cursor-pointer gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span>Export Excel / CSV Report</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReportModalOpen(true)} className="cursor-pointer gap-2 text-xs text-muted-foreground">
                  <Printer className="h-3.5 w-3.5" />
                  <span>Preview & Print Options</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* INSTITUTIONAL SUBSCRIPTION & BILLING REMINDER BANNER */}
        {billingReminder && (
          billingReminder.billingReminderActive ||
          Boolean(billingReminder.reminderNote) ||
          billingReminder.pendingInvoicesCount > 0 ||
          (billingReminder.daysRemaining !== null && billingReminder.daysRemaining <= 60)
        ) && (
          <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md transition-all ${
            billingReminder.billingReminderActive
              ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
              : billingReminder.daysRemaining !== null && billingReminder.daysRemaining <= 15
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : billingReminder.pendingInvoicesCount > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : "bg-primary/5 border-primary/20 text-foreground"
          }`}>
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                billingReminder.billingReminderActive
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                  : billingReminder.daysRemaining !== null && billingReminder.daysRemaining <= 15
                  ? "bg-rose-500/20 text-rose-400"
                  : billingReminder.pendingInvoicesCount > 0
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-primary/10 text-primary"
              }`}>
                {billingReminder.billingReminderActive ? <BellRing className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                    {billingReminder.billingReminderActive
                      ? "Purchasing & Billing Directive from Master Admin"
                      : "Subscription & Billing Notice from Master Admin"}
                  </h3>
                  {billingReminder.billingReminderActive && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[11px] font-semibold gap-1">
                      <Sparkles className="h-3 w-3" /> Priority Notice
                    </Badge>
                  )}
                  {billingReminder.daysRemaining !== null && (
                    <Badge variant={billingReminder.daysRemaining <= 15 ? "destructive" : "outline"} className="text-[11px] font-mono">
                      <Calendar className="h-3 w-3 mr-1 inline" />
                      {billingReminder.daysRemaining > 0 ? `${billingReminder.daysRemaining} Days Left` : "Renewal Due"}
                    </Badge>
                  )}
                  {billingReminder.pendingInvoicesCount > 0 && (
                    <Badge variant="outline" className="border-rose-500/50 text-rose-400 text-[11px] font-mono bg-rose-950/20">
                      ₹{billingReminder.pendingAmount.toLocaleString('en-IN')} Demand Due
                    </Badge>
                  )}
                </div>

                {billingReminder.reminderNote ? (
                  <div className="p-3 rounded-xl bg-background/80 border border-border/80 text-foreground text-xs leading-relaxed space-y-1 shadow-2xs">
                    <div className="font-semibold text-primary flex items-center gap-1.5 text-[11px] tracking-wide uppercase">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Orbit HQ Master Admin Directive:
                    </div>
                    <p className="font-medium text-foreground whitespace-pre-wrap">{billingReminder.reminderNote}</p>
                    {billingReminder.lastReminderSentAt && (
                      <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" /> Dispatched: {new Date(billingReminder.lastReminderSentAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {billingReminder.pendingInvoicesCount > 0 
                      ? `You have ${billingReminder.pendingInvoicesCount} pending billing invoice(s) issued for seat capacity. Settle via bank transfer or UPI to keep platform active.`
                      : `Your institution's license validity is active until ${billingReminder.expiryDate ? new Date(billingReminder.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'the current cycle'}.`
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
              <Button
                size="sm"
                onClick={() => navigate("/admin/billing")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 gap-1.5 shadow-sm"
              >
                <FileText className="h-3.5 w-3.5" /> View Invoices & Pay
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`https://wa.me/918770233075?text=${encodeURIComponent(`Hello Master Admin, this is ${billingReminder.collegeName} regarding the official billing/renewal directive: "${billingReminder.reminderNote || 'Billing status update'}"`)}`, "_blank")}
                className="text-xs font-semibold h-8 gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <Share2 className="h-3.5 w-3.5" /> WhatsApp HQ
              </Button>
              {billingReminder.billingReminderActive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismissReminder}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Acknowledge
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Active Learners"
            value={stats.activeStudents.toString()}
            icon={<Users className="h-5 w-5" />}
            description={`${stats.students} registered students`}
          />
          <StatCard
            title="Total Teachers"
            value={stats.teachers.toString()}
            icon={<GraduationCap className="h-5 w-5" />}
            variant="accent"
          />
          <StatCard
            title="Certificate Courses"
            value={stats.activeCourses.toString()}
            icon={<BookOpen className="h-5 w-5" />}
            description={`${stats.certificatePrograms} specialization programs`}
            variant="primary"
          />
          <StatCard
            title="Avg. Attendance"
            value={`${stats.avgAttendance}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            description={stats.avgAttendance > 0 ? "Verified from class logs" : "No attendance recorded yet"}
            variant="warning"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSelectedEnrollmentForView(null); setEnrollmentModalOpen(true); }}>
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

        {/* Pending Verifications */}
        <Card className="border-yellow-500/30 shadow-lg">
          <CardHeader className="bg-yellow-500/5 pb-4">
            <CardTitle className="text-lg font-display flex items-center justify-between text-yellow-600 dark:text-yellow-500">
              <span className="flex items-center gap-2">
                <SearchCode className="h-5 w-5" />
                Pending Payment Verifications ({pendingEnrollments.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {pendingEnrollments.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {pendingEnrollments.map((enr, i) => (
                  <div key={enr.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                    <div>
                      <h4 className="font-semibold text-sm">{enr.users?.full_name} <span className="text-muted-foreground font-normal">({enr.users?.email})</span></h4>
                      <p className="text-sm text-foreground my-1">
                        Course: <span className="font-medium">{enr.courses?.title}</span>
                      </p>
                      <Badge variant="outline" className="mt-1 font-mono bg-muted">
                        Tx ID: {enr.transaction_id || "N/A"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">Submitted on {new Date(enr.enrolled_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedEnrollmentForView(enr); setEnrollmentModalOpen(true); }} className="gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" /> Details
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-200" onClick={() => handleRejectEnrollment(enr.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveEnrollment(enr.id, enr.users?.email)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/20 border-2 border-dashed rounded-lg">
                <SearchCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pending payment verifications at the moment.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Get In Touch Inquiries Widget */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Get In Touch Home Page Inquiries
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Recent messages submitted by prospective clients & institutions from the home page.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/inquiries")} className="gap-1 text-xs">
                View All Inquiries <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recentInquiries.map((inq) => (
                <div
                  key={inq.id}
                  onClick={() => navigate("/admin/inquiries")}
                  className="p-3.5 rounded-xl border bg-card/60 hover:bg-accent/40 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs group-hover:text-primary transition-colors">
                      {inq.first_name} {inq.last_name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase px-1.5 py-0.5 ${
                        inq.status === "pending"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          : inq.status === "contacted"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      }`}
                    >
                      {inq.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-primary truncate font-mono">{inq.email}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{inq.message}</p>
                </div>
              ))}
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

      {/* Official Institutional Executive Performance Report Modal */}
      <AdminInstitutionalReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        dashboardStats={stats}
        attendanceData={attendanceData}
        courseCompletionData={courseCompletionData}
        topCourses={topCourses}
        pendingEnrollments={pendingEnrollments}
      />

      {/* 📋 Official Enrollment Details & Payment Verification Modal */}
      <Dialog open={enrollmentModalOpen} onOpenChange={(open) => { setEnrollmentModalOpen(open); if (!open) setSelectedEnrollmentForView(null); }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <SearchCode className="h-5 w-5 text-primary" /> 
              {selectedEnrollmentForView ? "Enrollment Record Details" : "All Enrolled Students & Payment Status"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedEnrollmentForView 
                ? "Review student submission details, course enrollment status, and transaction reference."
                : "Manage and verify course admissions and student transaction receipts."}
            </DialogDescription>
          </DialogHeader>

          {selectedEnrollmentForView ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border text-sm">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Student Name</span>
                  <span className="font-bold text-foreground text-base">{selectedEnrollmentForView.users?.full_name || "Student"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Email Address</span>
                  <span className="font-mono text-foreground">{selectedEnrollmentForView.users?.email || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Course Title</span>
                  <span className="font-semibold text-primary">{selectedEnrollmentForView.courses?.title || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Course Price</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedEnrollmentForView.courses?.price ? `₹${selectedEnrollmentForView.courses.price.toLocaleString('en-IN')}` : "Free Course"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Transaction Reference / UTR</span>
                  <Badge variant="outline" className="font-mono font-bold mt-1 text-xs">
                    {selectedEnrollmentForView.transaction_id || "None (Free / Direct)"}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Current Status</span>
                  <Badge variant={selectedEnrollmentForView.status === 'approved' ? 'default' : 'secondary'} className="mt-1 capitalize">
                    {selectedEnrollmentForView.status || "Pending"}
                  </Badge>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Enrolled / Submitted Timestamp</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedEnrollmentForView.enrolled_at ? new Date(selectedEnrollmentForView.enrolled_at).toLocaleString() : "Recently"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => setSelectedEnrollmentForView(null)} className="text-xs">
                  View All Enrollments
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-red-500 border-red-200 text-xs" onClick={() => { handleRejectEnrollment(selectedEnrollmentForView.id); setEnrollmentModalOpen(false); }}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-semibold text-xs" onClick={() => { handleApproveEnrollment(selectedEnrollmentForView.id, selectedEnrollmentForView.users?.email); setEnrollmentModalOpen(false); }}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve Payment
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {allEnrollments.length > 0 ? (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {allEnrollments.map((item: any) => (
                    <div key={item.id} className="p-3 border rounded-xl flex items-center justify-between hover:bg-muted/30 transition-colors gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{item.users?.full_name || "Student"} <span className="text-xs font-normal text-muted-foreground font-mono">({item.users?.email})</span></p>
                        <p className="text-xs text-primary font-medium truncate">{item.courses?.title}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">Txn: {item.transaction_id || "Free / Direct"} • {new Date(item.enrolled_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={item.status === 'approved' ? 'default' : 'secondary'} className="capitalize text-xs">
                          {item.status}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedEnrollmentForView(item)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <SearchCode className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No enrollment records found.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
