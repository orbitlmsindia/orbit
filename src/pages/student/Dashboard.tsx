import { useEffect, useState, useRef } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, AlertCircle, CheckCircle2, PlayCircle, ArrowRight, Bell, Award, Loader2, Quote, Video, ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function StudentDashboard() {
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [userName, setUserName] = useState("");
    const [notifications, setNotifications] = useState<any[]>([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
    const [liveClasses, setLiveClasses] = useState<any[]>([]);
    const [dailyQuote, setDailyQuote] = useState<string | null>(null);

    // Live Classes Carousel & Modal state
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleSearchQuery, setScheduleSearchQuery] = useState("");
    const [scheduleFilter, setScheduleFilter] = useState<"all" | "upcoming" | "past">("all");
    const carouselRef = useRef<HTMLDivElement>(null);

    const scrollCarousel = (direction: 'left' | 'right') => {
        if (carouselRef.current) {
            const scrollAmount = direction === 'left' ? -340 : 340;
            carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        fetchStudentData();
    }, []);

    const fetchStudentData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserName(user.user_metadata.full_name || "Student");

            // 1. Fetch Enrollments with Course Details
            const { data: enrollments, error } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    status,
                    progress:completed,
                    course:courses (
                        id,
                        title,
                        description,
                        teacher:users!teacher_id (full_name)
                    )
                `)
                .eq('student_id', user.id);

            // 2. Fetch Notifications
            const { data: notifs } = await supabase
                .from('notifications')
                .select('id, title, message, created_at, is_read')
                .eq('user_id', user.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(5);

            setNotifications(notifs || []);

            // 3. Fetch Upcoming Deadlines for APPROVED enrolled courses only
            const approvedEnrollments = enrollments?.filter((e: any) => (e.status === 'approved' || e.status === 'active') && e.course?.id) || [];
            const courseIds = approvedEnrollments.map((e: any) => e.course.id);
            if (courseIds.length > 0) {
                const { data: deadlines } = await supabase
                    .from('assignments')
                    .select(`
                        id,
                        title,
                        type,
                        due_date,
                        course:courses(id, title)
                    `)
                    .in('course_id', courseIds)
                    .not('due_date', 'is', null)
                    .gte('due_date', new Date().toISOString())
                    .lte('due_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
                    .order('due_date', { ascending: true })
                    .limit(5);

                // Filter out already submitted assignments
                const filteredDeadlines = [];
                for (const deadline of (deadlines || [])) {
                    const { data: submission } = await supabase
                        .from(deadline.type === 'quiz' ? 'quiz_attempts' : 'submissions')
                        .select('id')
                        .eq('assignment_id', deadline.id)
                        .eq('student_id', user.id)
                        .maybeSingle();

                    if (!submission) {
                        filteredDeadlines.push(deadline);
                    }
                }

                setUpcomingDeadlines(filteredDeadlines);

                // Fetch Live Classes for enrolled courses
                const { data: lives } = await supabase
                    .from('live_classes')
                    .select(`
                        id,
                        title,
                        meeting_link,
                        scheduled_at,
                        duration_minutes,
                        description,
                        status,
                        course:courses (id, title, teacher:users!teacher_id(full_name))
                    `)
                    .in('course_id', courseIds)
                    .order('scheduled_at', { ascending: true });

                setLiveClasses(lives || []);
            }

            if (error) throw error;

            // 4. Fetch Daily Quote
            const today = new Date().toISOString().split('T')[0];
            const { data: quoteData } = await supabase
                .from('daily_quotes')
                .select('text')
                .eq('date', today);

            if (quoteData && quoteData.length > 0) {
                // Select a random quote from today's saved quotes
                const randomQuote = quoteData[Math.floor(Math.random() * quoteData.length)];
                setDailyQuote(randomQuote.text);
            } else {
                // Fallback: choose a random quote from the entire collection
                const { data: allQuotesData } = await supabase
                    .from('daily_quotes')
                    .select('text');

                if (allQuotesData && allQuotesData.length > 0) {
                    const randomQuote = allQuotesData[Math.floor(Math.random() * allQuotesData.length)];
                    setDailyQuote(randomQuote.text);
                }
            }

            // Transform data
            const formattedCourses = enrollments?.map((e: any) => ({
                id: e.course.id,
                title: e.course.title,
                instructor: e.course.teacher?.full_name || "Unknown",
                progress: e.progress ? 100 : 0, // Simplified progress for now
                status: e.status || 'approved',
                image: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?auto=format&fit=crop&q=80&w=500" // Placeholder
            })) || [];

            setCourses(formattedCourses);

        } catch (error) {
            console.error("Error fetching student dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </StudentLayout>
        );
    }

    // Categorize Live Classes
    const now = new Date();

    // Live Now: started & not exceeded duration (or past start time within duration)
    const liveNowClasses = liveClasses.filter(c => {
        const start = new Date(c.scheduled_at);
        const durationMs = (c.duration_minutes || 120) * 60 * 1000;
        const end = new Date(start.getTime() + durationMs);
        return start <= now && now <= end;
    });

    const upcomingClasses = liveClasses.filter(c => {
        const start = new Date(c.scheduled_at);
        return start > now;
    }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const pastClasses = liveClasses.filter(c => {
        const start = new Date(c.scheduled_at);
        const durationMs = (c.duration_minutes || 120) * 60 * 1000;
        const end = new Date(start.getTime() + durationMs);
        return now > end;
    }).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    // Near / Recent upcoming classes to present in Carousel (Live now + nearest 5 upcoming)
    const carouselLiveClasses = [...liveNowClasses, ...upcomingClasses].slice(0, 6);

    // Modal filtered classes
    const filteredModalClasses = liveClasses.filter((lc) => {
        const start = new Date(lc.scheduled_at);
        const durationMs = (lc.duration_minutes || 120) * 60 * 1000;
        const end = new Date(start.getTime() + durationMs);
        const isLiveNow = start <= now && now <= end;
        const isPast = now > end;
        const isUpcoming = start > now;

        if (scheduleFilter === 'upcoming' && !isLiveNow && !isUpcoming) return false;
        if (scheduleFilter === 'past' && !isPast) return false;

        if (scheduleSearchQuery.trim() !== '') {
            const query = scheduleSearchQuery.toLowerCase();
            const matchesTitle = lc.title?.toLowerCase().includes(query);
            const matchesCourse = lc.course?.title?.toLowerCase().includes(query);
            const matchesTeacher = lc.course?.teacher?.full_name?.toLowerCase().includes(query);
            return matchesTitle || matchesCourse || matchesTeacher;
        }

        return true;
    });

    return (
        <StudentLayout>
            <div className="flex flex-col gap-6 animate-fade-in">
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Welcome back, {userName}! 👋</h1>
                        <p className="text-muted-foreground">Resume where you left off.</p>
                    </div>
                </div>

                {dailyQuote && (
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 flex gap-4 items-start relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Quote className="h-24 w-24 text-primary" />
                        </div>
                        <Quote className="h-8 w-8 text-primary shrink-0 relative z-10" />
                        <div className="relative z-10">
                            <h3 className="font-semibold text-sm text-primary uppercase tracking-wide mb-2">Daily Inspiration</h3>
                            <p className="text-foreground italic text-lg font-serif">"{dailyQuote}"</p>
                        </div>
                    </div>
                )}

                {/* Live Classes Carousel Card */}
                {liveClasses.length > 0 && (
                    <Card className="border-red-500/30 bg-gradient-to-r from-red-950/20 via-background to-background shadow-md overflow-hidden relative">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                                    Live Classes & Interactive Sessions
                                </CardTitle>
                                {liveNowClasses.length > 0 ? (
                                    <Badge className="bg-red-600 text-white font-mono text-[10px] uppercase tracking-wider animate-pulse px-2 py-0.5">
                                        🔴 {liveNowClasses.length} Live Now
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-red-500/30 text-red-400 font-mono text-[10px]">
                                        {liveClasses.length} Scheduled
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                {/* Carousel Navigation Buttons */}
                                {carouselLiveClasses.length > 1 && (
                                    <div className="flex items-center gap-1 mr-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full border-border/60 hover:bg-red-500/10 hover:border-red-500/40"
                                            onClick={() => scrollCarousel('left')}
                                            title="Previous Live Class"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full border-border/60 hover:bg-red-500/10 hover:border-red-500/40"
                                            onClick={() => scrollCarousel('right')}
                                            title="Next Live Class"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}

                                {/* Show Complete Schedule Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsScheduleModalOpen(true)}
                                    className="gap-1.5 text-xs font-semibold border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-foreground transition-all shadow-sm"
                                >
                                    <Calendar className="h-3.5 w-3.5 text-red-400" />
                                    Show Complete Schedule ({liveClasses.length})
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-4 pb-4">
                            <div
                                ref={carouselRef}
                                className="flex gap-4 overflow-x-auto scrollbar-none touch-pan-x pb-2 snap-x snap-mandatory scroll-smooth"
                            >
                                {carouselLiveClasses.map((lc) => {
                                    const start = new Date(lc.scheduled_at);
                                    const durationMs = (lc.duration_minutes || 120) * 60 * 1000;
                                    const end = new Date(start.getTime() + durationMs);
                                    const isLiveNow = start <= now && now <= end;

                                    return (
                                        <div
                                            key={lc.id}
                                            className={`snap-start min-w-[290px] sm:min-w-[340px] max-w-[360px] shrink-0 p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 ${
                                                isLiveNow
                                                    ? "bg-gradient-to-b from-red-950/40 via-red-900/10 to-card border-red-500/60 shadow-lg shadow-red-950/30"
                                                    : "bg-card hover:bg-accent/10 border-border/60 hover:border-red-500/30"
                                            }`}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            isLiveNow
                                                                ? "bg-red-600 text-white border-red-600 font-bold text-[10px] animate-pulse px-2 py-0.5"
                                                                : "bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold"
                                                        }
                                                    >
                                                        {isLiveNow ? "🔴 HAPPENING NOW" : "UPCOMING CLASS"}
                                                    </Badge>
                                                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                                                        ⏱️ {lc.duration_minutes || 60} mins
                                                    </span>
                                                </div>

                                                <div>
                                                    <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-red-400 transition-colors" title={lc.title}>
                                                        {lc.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                        <span className="text-foreground/80 font-medium">{lc.course?.title}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="font-mono flex items-center gap-1 text-[11px]">
                                                        📅 {new Date(lc.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(lc.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                    <span className="text-[11px] text-muted-foreground truncate">
                                                        By <span className="text-primary font-medium">{lc.course?.teacher?.full_name || "Instructor"}</span>
                                                    </span>
                                                    <a
                                                        href={lc.meeting_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="shrink-0"
                                                    >
                                                        <Button
                                                            size="sm"
                                                            className={`gap-1.5 text-xs font-bold shadow-md ${
                                                                isLiveNow
                                                                    ? "bg-red-600 hover:bg-red-700 text-white animate-bounce-short"
                                                                    : "bg-red-600/90 hover:bg-red-600 text-white"
                                                            }`}
                                                        >
                                                            <Video className="h-3.5 w-3.5" /> Join Live ↗
                                                        </Button>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* View Complete Schedule Card at end of carousel */}
                                {liveClasses.length > carouselLiveClasses.length && (
                                    <div
                                        onClick={() => setIsScheduleModalOpen(true)}
                                        className="snap-start min-w-[220px] shrink-0 p-4 rounded-xl border border-dashed border-red-500/40 bg-red-500/5 hover:bg-red-500/10 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.02]"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-2">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <h4 className="font-bold text-sm text-foreground">View All Classes</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            +{liveClasses.length - carouselLiveClasses.length} more sessions scheduled
                                        </p>
                                        <Button variant="ghost" size="sm" className="mt-2 text-xs text-red-400 hover:text-red-300 p-0 h-auto font-semibold">
                                            Open Schedule ↗
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Enrolled Courses */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">My Courses</h2>
                                <Link to="/student/courses">
                                    <Button variant="ghost" size="sm" className="gap-1">View All <ArrowRight className="h-4 w-4" /></Button>
                                </Link>
                            </div>
                            <div className="grid gap-4">
                                {courses.length > 0 ? (
                                    courses.map((course) => {
                                        const isPending = course.status === 'pending';

                                        const CardContent = (
                                            <div className="group flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border bg-card hover:bg-accent/5 transition-all hover:border-primary/50 cursor-pointer relative overflow-hidden shadow-2xs touch-press">
                                                {isPending && (
                                                    <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-semibold px-3 py-1 mt-6">
                                                            Pending Verification
                                                        </Badge>
                                                    </div>
                                                )}
                                                <div className="h-32 sm:h-24 sm:w-36 rounded-lg overflow-hidden shrink-0">
                                                    {/* Using a static placeholder image for now as DB doesn't have image URL yet */}
                                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                                                        <BookOpen className="h-8 w-8" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 flex flex-col justify-between py-1">
                                                    <div>
                                                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{course.title}</h3>
                                                        <p className="text-sm text-muted-foreground">{course.instructor}</p>
                                                    </div>
                                                    <div className="space-y-2 mt-3 sm:mt-0">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground font-medium">
                                                                {isPending ? "Waiting for admin approval..." : `${course.progress}% Completed`}
                                                            </span>
                                                        </div>
                                                        <Progress value={isPending ? 0 : course.progress} className="h-2" />
                                                    </div>
                                                </div>
                                            </div>
                                        );

                                        if (isPending) {
                                            return <div key={course.id}>{CardContent}</div>;
                                        }

                                        return (
                                            <Link key={course.id} to={`/student/courses/${course.id}/learn`}>
                                                {CardContent}
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12 border rounded-xl bg-muted/10">
                                        <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
                                        <Link to="/student/courses">
                                            <Button>Browse Courses</Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        {/* Next Actions - Upcoming Deadlines */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-500" /> Next Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {upcomingDeadlines.length > 0 ? (
                                    <div className="divide-y">
                                        {upcomingDeadlines.map((deadline) => {
                                            const dueDate = new Date(deadline.due_date);
                                            const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                            const isUrgent = daysUntil <= 2;

                                            return (
                                                <Link
                                                    key={deadline.id}
                                                    to={`/student/assignments`}
                                                    className="block p-4 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-lg ${isUrgent ? 'bg-red-500/10' : 'bg-orange-500/10'}`}>
                                                            <Clock className={`h-4 w-4 ${isUrgent ? 'text-red-600' : 'text-orange-600'}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-semibold text-sm line-clamp-1">{deadline.title}</h4>
                                                                <Badge variant={deadline.type === 'quiz' ? 'default' : 'secondary'} className="text-xs">
                                                                    {deadline.type === 'quiz' ? 'Quiz' : 'Assignment'}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                                                {deadline.course?.title}
                                                            </p>
                                                            <p className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                                                                Due in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-muted-foreground">
                                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">All caught up!</p>
                                        <p className="text-xs mt-1">No upcoming deadlines</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Notification Panel */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bell className="h-5 w-5" /> Notifications
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {notifications.length > 0 ? (
                                    <div className="divide-y">
                                        {notifications.map((n) => (
                                            <div key={n.id} className="p-4 hover:bg-muted/50 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-semibold text-sm line-clamp-1">{n.title}</h4>
                                                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(n.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-muted-foreground">
                                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No new notifications</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Stats */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Award className="h-5 w-5" /> Your Progress
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Courses Enrolled</span>
                                    <span className="font-bold text-lg">{courses.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Pending Tasks</span>
                                    <span className="font-bold text-lg text-orange-600">{upcomingDeadlines.length}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Complete Live Class Schedule Modal */}
            <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 gap-4 bg-background border-red-500/20">
                    <DialogHeader className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                            <DialogTitle className="text-xl font-bold">
                                Complete Live Classes & Sessions Schedule
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-sm text-muted-foreground">
                            View all live sessions, upcoming interactive classes, and previous recordings for your enrolled courses.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Filter and Search Controls */}
                    <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
                            <button
                                onClick={() => setScheduleFilter('all')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                    scheduleFilter === 'all'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                All ({liveClasses.length})
                            </button>
                            <button
                                onClick={() => setScheduleFilter('upcoming')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                    scheduleFilter === 'upcoming'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Upcoming ({upcomingClasses.length + liveNowClasses.length})
                            </button>
                            <button
                                onClick={() => setScheduleFilter('past')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                    scheduleFilter === 'past'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Past ({pastClasses.length})
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search classes or course..."
                                value={scheduleSearchQuery}
                                onChange={(e) => setScheduleSearchQuery(e.target.value)}
                                className="pl-8 h-9 text-xs"
                            />
                        </div>
                    </div>

                    {/* Live Classes List in Modal */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[55vh]">
                        {filteredModalClasses.length > 0 ? (
                            filteredModalClasses.map((lc) => {
                                const start = new Date(lc.scheduled_at);
                                const durationMs = (lc.duration_minutes || 120) * 60 * 1000;
                                const end = new Date(start.getTime() + durationMs);
                                const isLiveNow = start <= now && now <= end;
                                const isPast = now > end;

                                return (
                                    <div
                                        key={lc.id}
                                        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                                            isLiveNow
                                                ? "bg-red-950/20 border-red-500/50 shadow-sm"
                                                : "bg-card hover:bg-accent/5 border-border"
                                        }`}
                                    >
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        isLiveNow
                                                            ? "bg-red-600 text-white border-red-600 font-bold text-[10px] animate-pulse"
                                                            : isPast
                                                            ? "bg-muted text-muted-foreground text-[10px]"
                                                            : "bg-primary/10 text-primary border-primary/20 text-[10px]"
                                                    }
                                                >
                                                    {isLiveNow ? "🔴 HAPPENING NOW" : isPast ? "COMPLETED" : "UPCOMING CLASS"}
                                                </Badge>
                                                <h3 className="font-bold text-base text-foreground truncate">{lc.title}</h3>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Course: <span className="font-semibold text-foreground">{lc.course?.title}</span> • Teacher: <span className="font-semibold text-primary">{lc.course?.teacher?.full_name || "Instructor"}</span>
                                            </p>
                                            {lc.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">{lc.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                                                <span>📅 {new Date(lc.scheduled_at).toLocaleString()}</span>
                                                <span>⏱️ {lc.duration_minutes || 60} mins</span>
                                            </div>
                                        </div>
                                        <a
                                            href={lc.meeting_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 w-full sm:w-auto"
                                        >
                                            <Button
                                                size="default"
                                                className={`w-full sm:w-auto gap-2 font-bold ${
                                                    isLiveNow
                                                        ? "bg-red-600 hover:bg-red-700 text-white shadow-md animate-pulse"
                                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                                }`}
                                            >
                                                <Video className="h-4 w-4" /> {isPast ? "View Link / Recording" : "Join Live Class ↗"}
                                            </Button>
                                        </a>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center text-muted-foreground border rounded-xl bg-muted/10">
                                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">No live classes match your filter or search.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </StudentLayout>
    );
}

