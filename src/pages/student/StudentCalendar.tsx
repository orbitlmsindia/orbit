import { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { format, isSameDay } from "date-fns";
import {
    Loader2,
    Calendar as CalendarIcon,
    Video,
    FileText,
    HelpCircle,
    PartyPopper,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Hourglass,
    ExternalLink,
    Download,
    BookOpen,
    ShieldAlert,
    Sparkles,
    CalendarDays,
    ChevronRight,
    GraduationCap
} from "lucide-react";
import { Link } from "react-router-dom";

interface CalendarEventItem {
    id: string;
    title: string;
    description?: string;
    date: Date;
    type: "event" | "live_class" | "assignment" | "quiz" | "exam" | "holiday" | "deadline" | "announcement";
    courseName?: string;
    courseId?: string;
    meetingLink?: string;
    durationMinutes?: number;
    points?: number;
    isGeneral?: boolean;
}

export default function StudentCalendar() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<CalendarEventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Admission & Course Approval State
    const [userAdmissionStatus, setUserAdmissionStatus] = useState<"active" | "pending" | "suspended" | null>(null);
    const [pendingCourseEnrollments, setPendingCourseEnrollments] = useState<any[]>([]);
    const [approvedCourses, setApprovedCourses] = useState<any[]>([]);

    useEffect(() => {
        fetchStudentCalendarData();
    }, []);

    const fetchStudentCalendarData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Verify Student User Admission Status in public.users
            const { data: userProfile } = await supabase
                .from('users')
                .select('id, full_name, status, role')
                .eq('id', user.id)
                .maybeSingle();

            const currentStatus = userProfile?.status || 'active';
            setUserAdmissionStatus(currentStatus as any);

            // If Student Admission is pending admin approval, stop here and protect calendar schedules
            if (currentStatus === 'pending') {
                setEvents([]);
                setLoading(false);
                return;
            }

            // 2. Fetch All Enrollments with Course Details
            const { data: allEnrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    course_id,
                    status,
                    transaction_id,
                    enrolled_at,
                    course:courses (
                        id,
                        title,
                        start_date,
                        end_date,
                        exam_date,
                        exam_reg_end_date,
                        teacher:users!teacher_id(full_name)
                    )
                `)
                .eq('student_id', user.id);

            if (enrollError) {
                console.warn("Error querying student enrollments:", enrollError);
            }

            // Partition into Approved vs Pending enrollments
            const approvedList = allEnrollments?.filter(
                (e: any) => e.status === 'approved' || e.status === 'active'
            ) || [];

            const pendingList = allEnrollments?.filter(
                (e: any) => e.status === 'pending'
            ) || [];

            setApprovedCourses(approvedList);
            setPendingCourseEnrollments(pendingList);

            const approvedCourseIds = approvedList.map((e: any) => e.course_id).filter(Boolean);
            const approvedCourseMap = new Map<string, string>();
            approvedList.forEach((e: any) => {
                if (e.course?.id && e.course?.title) {
                    approvedCourseMap.set(e.course.id, e.course.title);
                }
            });

            const aggregatedEvents: CalendarEventItem[] = [];

            // 3. Fetch Academic Calendar Events (Strictly enforce course approval for all course-related events)
            const { data: calEvents } = await supabase
                .from('calendar_events')
                .select('id, title, description, event_date, type, visibility, course_id')
                .or(`visibility.eq.all,visibility.eq.students`);

            if (calEvents && calEvents.length > 0) {
                calEvents.forEach((ce: any) => {
                    const isCourseRelated = Boolean(
                        ce.course_id ||
                        ce.type === 'live_class' ||
                        ce.type === 'quiz' ||
                        ce.type === 'assignment' ||
                        ce.type === 'exam' ||
                        ce.title?.toLowerCase().includes('module') ||
                        ce.title?.toLowerCase().includes('live session') ||
                        ce.title?.toLowerCase().includes('live class') ||
                        ce.title?.toLowerCase().includes('lecture')
                    );

                    // If it is a course-related item, ONLY display if the student's enrollment in that course is APPROVED
                    if (isCourseRelated) {
                        if (ce.course_id && approvedCourseIds.includes(ce.course_id)) {
                            aggregatedEvents.push({
                                id: `cal-${ce.id}`,
                                title: ce.title,
                                description: ce.description || undefined,
                                date: new Date(ce.event_date),
                                type: (ce.type as any) || 'event',
                                courseName: approvedCourseMap.get(ce.course_id) || "Enrolled Course",
                                courseId: ce.course_id,
                                isGeneral: false
                            });
                        }
                    } else if (!ce.course_id && (ce.type === 'holiday' || ce.type === 'event' || ce.type === 'announcement')) {
                        // Genuine campus-wide non-course events (e.g. Campus Holidays, Institutional announcements)
                        aggregatedEvents.push({
                            id: `cal-${ce.id}`,
                            title: ce.title,
                            description: ce.description || undefined,
                            date: new Date(ce.event_date),
                            type: (ce.type as any) || 'event',
                            isGeneral: true
                        });
                    }
                });
            }

            // 4. If student has Approved Courses, fetch Course Assignments & Quizzes
            if (approvedCourseIds.length > 0) {
                const { data: assigns } = await supabase
                    .from('assignments')
                    .select('id, title, description, due_date, type, points, course_id')
                    .in('course_id', approvedCourseIds)
                    .not('due_date', 'is', null);

                if (assigns && assigns.length > 0) {
                    assigns.forEach((a: any) => {
                        aggregatedEvents.push({
                            id: `assign-${a.id}`,
                            title: a.title,
                            description: a.description || undefined,
                            date: new Date(a.due_date),
                            type: a.type === 'quiz' ? 'quiz' : 'assignment',
                            courseName: approvedCourseMap.get(a.course_id) || "Enrolled Course",
                            courseId: a.course_id,
                            points: a.points || undefined
                        });
                    });
                }

                // 5. Fetch Live Classes for Approved Courses
                const { data: liveClasses } = await supabase
                    .from('live_classes')
                    .select('id, title, description, scheduled_at, duration_minutes, meeting_link, course_id')
                    .in('course_id', approvedCourseIds)
                    .not('scheduled_at', 'is', null);

                if (liveClasses && liveClasses.length > 0) {
                    liveClasses.forEach((lc: any) => {
                        // Avoid duplicates if live class was also synced in calendar_events
                        const isDup = aggregatedEvents.some(
                            e => e.type === 'live_class' && e.title.includes(lc.title) && isSameDay(e.date, new Date(lc.scheduled_at))
                        );

                        if (!isDup) {
                            aggregatedEvents.push({
                                id: `live-${lc.id}`,
                                title: `🔴 Live Class: ${lc.title}`,
                                description: lc.description || undefined,
                                date: new Date(lc.scheduled_at),
                                type: 'live_class',
                                courseName: approvedCourseMap.get(lc.course_id) || "Live Lecture",
                                courseId: lc.course_id,
                                meetingLink: lc.meeting_link,
                                durationMinutes: lc.duration_minutes || 60
                            });
                        }
                    });
                }

                // 6. Fetch Official Course Exam Dates (if scheduled)
                approvedList.forEach((e: any) => {
                    const c = e.course;
                    if (c && c.exam_date) {
                        const examDate = new Date(c.exam_date);
                        if (!isNaN(examDate.getTime())) {
                            aggregatedEvents.push({
                                id: `exam-${c.id}`,
                                title: `🎓 Final Examination: ${c.title}`,
                                description: `Official proctored examination for ${c.title}. Registration closes on ${c.exam_reg_end_date || 'scheduled date'}.`,
                                date: examDate,
                                type: 'exam',
                                courseName: c.title,
                                courseId: c.id
                            });
                        }
                    }
                });
            }

            // Sort chronologically
            aggregatedEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
            setEvents(aggregatedEvents);

        } catch (error) {
            console.error("Error fetching student calendar events:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter events by selected category
    const categoryFilteredEvents = events.filter(e => {
        if (selectedCategory === "all") return true;
        if (selectedCategory === "live") return e.type === "live_class";
        if (selectedCategory === "assignments") return e.type === "assignment";
        if (selectedCategory === "quizzes") return e.type === "quiz";
        if (selectedCategory === "exams") return e.type === "exam" || e.type === "deadline";
        if (selectedCategory === "general") return e.type === "holiday" || e.type === "event" || e.type === "announcement";
        return true;
    });

    // Filter events for currently selected date
    const selectedDateEvents = date
        ? categoryFilteredEvents.filter(e => isSameDay(e.date, date))
        : [];

    // Export selected events to iCal format (.ics)
    const handleExportICal = () => {
        if (events.length === 0) return;

        let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//OrbitLMS//Student Academic Calendar//EN\nCALSCALE:GREGORIAN\n";

        events.forEach(e => {
            const dtStart = format(e.date, "yyyyMMdd'T'HHmmss'Z'");
            const summary = (e.title || "Academic Event").replace(/[,;\n]/g, " ");
            const desc = (e.description || e.courseName || "").replace(/[,;\n]/g, " ");

            icsContent += "BEGIN:VEVENT\n";
            icsContent += `UID:${e.id}@orbitlms.edu\n`;
            icsContent += `DTSTAMP:${dtStart}\n`;
            icsContent += `DTSTART:${dtStart}\n`;
            icsContent += `SUMMARY:${summary}\n`;
            if (desc) icsContent += `DESCRIPTION:${desc}\n`;
            if (e.meetingLink) icsContent += `LOCATION:${e.meetingLink}\n`;
            icsContent += "END:VEVENT\n";
        });

        icsContent += "END:VCALENDAR";

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `OrbitLMS_Academic_Calendar_${format(new Date(), "yyyy-MM-dd")}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case "live_class":
                return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
            case "assignment":
                return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
            case "quiz":
                return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
            case "exam":
                return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
            case "holiday":
                return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
            default:
                return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "live_class":
                return <Video className="h-4 w-4 text-red-500 shrink-0" />;
            case "assignment":
                return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
            case "quiz":
                return <HelpCircle className="h-4 w-4 text-purple-500 shrink-0" />;
            case "exam":
                return <GraduationCap className="h-4 w-4 text-amber-500 shrink-0" />;
            case "holiday":
                return <PartyPopper className="h-4 w-4 text-emerald-500 shrink-0" />;
            default:
                return <CalendarDays className="h-4 w-4 text-sky-500 shrink-0" />;
        }
    };

    return (
        <StudentLayout>
            <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
                {/* Header with Title & Quick Export */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-3">
                            <CalendarDays className="h-8 w-8 text-primary" />
                            Academic Calendar & Schedule
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Real-time lectures, assignment deadlines, quizzes, and campus academic events.
                        </p>
                    </div>
                    {userAdmissionStatus === 'active' && events.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportICal}
                                className="gap-2 border-primary/20 hover:bg-primary/5 text-foreground"
                            >
                                <Download className="h-4 w-4 text-primary" />
                                Export Schedule (.ics)
                            </Button>
                        </div>
                    )}
                </div>

                {/* 1. ADMISSION PENDING STATE BANNER */}
                {userAdmissionStatus === 'pending' && (
                    <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                    <ShieldAlert className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                        Admission Approval Pending
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                            Admin Review
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription className="text-sm text-foreground/80 mt-1">
                                        Your student admission is currently under verification by the administrative office.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <p>
                                In accordance with OrbitLMS security and accreditation standards, academic schedules, live lecture streaming, and coursework access are locked until an administrator approves your admission.
                            </p>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Link to="/student/help-center">
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <HelpCircle className="h-4 w-4" />
                                        Contact Administration
                                    </Button>
                                </Link>
                                <Link to="/student/courses">
                                    <Button variant="secondary" size="sm" className="gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        Browse Course Catalog
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 2. PENDING COURSE ENROLLMENTS STATUS TRANSPARENCY BANNER */}
                {userAdmissionStatus === 'active' && pendingCourseEnrollments.length > 0 && (
                    <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                        <Hourglass className="h-5 w-5 animate-pulse" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold text-blue-600 dark:text-blue-400">
                                            Course Verification Pending ({pendingCourseEnrollments.length} Course{pendingCourseEnrollments.length > 1 ? "s" : ""})
                                        </CardTitle>
                                        <CardDescription className="text-xs text-muted-foreground">
                                            Transaction details submitted. Live sessions & assignments will activate upon teacher approval.
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
                                    Pending Teacher Review
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                                {pendingCourseEnrollments.map((pe: any) => (
                                    <div key={pe.id} className="p-2.5 rounded-lg border bg-background/50 flex flex-col justify-between text-xs space-y-1">
                                        <span className="font-semibold text-foreground truncate">
                                            {pe.course?.title || "Enrolled Course"}
                                        </span>
                                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                            <span>Txn: <span className="font-mono">{pe.transaction_id || "Submitted"}</span></span>
                                            <span className="text-amber-500 font-medium">Pending Approval</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 3. CATEGORY FILTER CHIPS */}
                {userAdmissionStatus === 'active' && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {[
                            { id: "all", label: "All Events", count: events.length },
                            { id: "live", label: "🔴 Live Classes", count: events.filter(e => e.type === "live_class").length },
                            { id: "assignments", label: "📝 Assignments", count: events.filter(e => e.type === "assignment").length },
                            { id: "quizzes", label: "❓ Quizzes", count: events.filter(e => e.type === "quiz").length },
                            { id: "exams", label: "🎓 Exams & Deadlines", count: events.filter(e => e.type === "exam" || e.type === "deadline").length },
                            { id: "general", label: "🎉 Campus & Holidays", count: events.filter(e => e.type === "holiday" || e.type === "event" || e.type === "announcement").length }
                        ].map(cat => (
                            <Button
                                key={cat.id}
                                size="sm"
                                variant={selectedCategory === cat.id ? "default" : "outline"}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`rounded-full text-xs shrink-0 transition-all ${
                                    selectedCategory === cat.id
                                        ? "shadow-sm font-semibold"
                                        : "hover:bg-muted text-muted-foreground"
                                }`}
                            >
                                {cat.label}
                                {cat.count > 0 && (
                                    <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                                        selectedCategory === cat.id
                                            ? "bg-white/20 text-white"
                                            : "bg-muted text-foreground"
                                    }`}>
                                        {cat.count}
                                    </span>
                                )}
                            </Button>
                        ))}
                    </div>
                )}

                {/* 4. MAIN CALENDAR & SCHEDULE GRID */}
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left Column: Calendar Picker */}
                    <div className="lg:col-span-5 space-y-4">
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                                    <span>Monthly Schedule</span>
                                    {date && (
                                        <Badge variant="secondary" className="text-xs">
                                            {format(date, "MMMM yyyy")}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center p-4">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-xl border shadow-sm p-3 bg-card"
                                    modifiers={{
                                        hasEvent: (d) => categoryFilteredEvents.some(e => isSameDay(e.date, d)),
                                        hasLive: (d) => categoryFilteredEvents.some(e => e.type === "live_class" && isSameDay(e.date, d)),
                                        hasDeadline: (d) => categoryFilteredEvents.some(e => (e.type === "assignment" || e.type === "quiz" || e.type === "exam") && isSameDay(e.date, d)),
                                    }}
                                    modifiersStyles={{
                                        hasEvent: { fontWeight: "bold", textDecoration: "underline", color: "var(--primary)" },
                                        hasLive: { color: "#ef4444", fontWeight: "bold" },
                                        hasDeadline: { color: "#8b5cf6", fontWeight: "bold" }
                                    }}
                                />
                            </CardContent>
                            <div className="px-6 pb-4 flex flex-wrap items-center justify-between text-xs text-muted-foreground border-t pt-3 gap-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Live Lecture
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Task/Quiz
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Campus Event
                                </span>
                            </div>
                        </Card>

                        {/* Approved Enrollment Summary */}
                        {userAdmissionStatus === 'active' && (
                            <Card className="border bg-muted/20">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">Approved Enrolled Courses</p>
                                            <p className="text-xs text-muted-foreground">
                                                {approvedCourses.length} active course{approvedCourses.length === 1 ? "" : "s"}
                                            </p>
                                        </div>
                                    </div>
                                    <Link to="/student/courses">
                                        <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
                                            View Courses <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Events for Selected Date & Timeline */}
                    <div className="lg:col-span-7 space-y-4">
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-primary" />
                                        {date ? format(date, "EEEE, MMMM d, yyyy") : "Upcoming Schedule"}
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        {date
                                            ? `${selectedDateEvents.length} event${selectedDateEvents.length === 1 ? "" : "s"} scheduled for this date`
                                            : "Select a date on the calendar to view scheduled lectures and deadlines"}
                                    </CardDescription>
                                </div>
                                {selectedDateEvents.length > 0 && (
                                    <Badge variant="outline" className="text-xs font-semibold">
                                        {selectedDateEvents.length} Active
                                    </Badge>
                                )}
                            </CardHeader>

                            <CardContent className="p-4 space-y-3 max-h-[550px] overflow-y-auto">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-sm font-medium">Loading verified schedule...</p>
                                    </div>
                                ) : userAdmissionStatus === 'pending' ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
                                        <ShieldAlert className="h-10 w-10 text-amber-500/70" />
                                        <p className="text-sm font-semibold text-foreground">Admission Pending Approval</p>
                                        <p className="text-xs max-w-sm">
                                            Calendar entries and lecture links will appear once your admission is verified by the admin.
                                        </p>
                                    </div>
                                ) : (date ? selectedDateEvents : categoryFilteredEvents).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground space-y-3">
                                        <div className="p-3 rounded-full bg-muted/60">
                                            <CalendarIcon className="h-7 w-7 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">No events on this date</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {pendingCourseEnrollments.length > 0
                                                    ? "More course events may unlock once your pending enrollments are verified."
                                                    : "Select another date or switch categories above."}
                                            </p>
                                        </div>
                                        {pendingCourseEnrollments.length > 0 && (
                                            <Link to="/student/courses">
                                                <Button variant="outline" size="sm" className="text-xs gap-1.5 mt-2">
                                                    Check Course Status <ChevronRight className="h-3 w-3" />
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {(date ? selectedDateEvents : categoryFilteredEvents).map((event) => (
                                            <div
                                                key={event.id}
                                                className="group p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                                            >
                                                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                                    <div className="p-2.5 rounded-xl bg-muted/60 shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                                                        {getTypeIcon(event.type)}
                                                    </div>
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
                                                                {event.title}
                                                            </h4>
                                                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 capitalize border ${getBadgeStyle(event.type)}`}>
                                                                {event.type.replace('_', ' ')}
                                                            </Badge>
                                                        </div>

                                                        {event.description && (
                                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                                {event.description}
                                                            </p>
                                                        )}

                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                                                            <span className="flex items-center gap-1 font-medium text-foreground">
                                                                <Clock className="h-3 w-3 text-primary" />
                                                                {format(event.date, "hh:mm a")}
                                                            </span>

                                                            {event.courseName && (
                                                                <span className="flex items-center gap-1 text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md font-medium truncate max-w-[200px]">
                                                                    <BookOpen className="h-3 w-3" />
                                                                    {event.courseName}
                                                                </span>
                                                            )}

                                                            {event.points && (
                                                                <span className="text-purple-600 dark:text-purple-400 font-semibold">
                                                                    {event.points} Points
                                                                </span>
                                                            )}

                                                            {event.durationMinutes && (
                                                                <span>{event.durationMinutes} mins</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons for Events */}
                                                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-muted/50">
                                                    {event.type === 'live_class' && event.meetingLink && (
                                                        <a
                                                            href={event.meetingLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs h-8">
                                                                <Video className="h-3.5 w-3.5" />
                                                                Join Live
                                                            </Button>
                                                        </a>
                                                    )}

                                                    {event.type === 'assignment' && (
                                                        <Link to="/student/assignments">
                                                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 hover:bg-blue-500/10 hover:text-blue-600">
                                                                <FileText className="h-3.5 w-3.5" />
                                                                Submit Work
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    {event.type === 'quiz' && (
                                                        <Link to="/student/assignments">
                                                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 hover:bg-purple-500/10 hover:text-purple-600">
                                                                <HelpCircle className="h-3.5 w-3.5" />
                                                                Take Quiz
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    {event.type === 'exam' && event.courseId && (
                                                        <Link to={`/student/courses`}>
                                                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 hover:bg-amber-500/10 hover:text-amber-600">
                                                                <GraduationCap className="h-3.5 w-3.5" />
                                                                Exam Portal
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
}
