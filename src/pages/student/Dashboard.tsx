import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, AlertCircle, CheckCircle2, PlayCircle, ArrowRight, Bell, Award, Loader2, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function StudentDashboard() {
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [userName, setUserName] = useState("");
    const [notifications, setNotifications] = useState<any[]>([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
    const [dailyQuote, setDailyQuote] = useState<string | null>(null);

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
                .select('*')
                .eq('user_id', user.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(5);

            setNotifications(notifs || []);

            // 3. Fetch Upcoming Deadlines for enrolled courses
            const courseIds = enrollments?.map((e: any) => e.course.id) || [];
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
                        .single();

                    if (!submission) {
                        filteredDeadlines.push(deadline);
                    }
                }

                setUpcomingDeadlines(filteredDeadlines);
            }

            if (error) throw error;

            // 4. Fetch Daily Quote
            const today = new Date().toISOString().split('T')[0];
            const { data: quoteData } = await supabase
                .from('daily_quotes')
                .select('text')
                .eq('date', today)
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (quoteData) setDailyQuote(quoteData.text);

            // Transform data
            const formattedCourses = enrollments?.map((e: any) => ({
                id: e.course.id,
                title: e.course.title,
                instructor: e.course.teacher?.full_name || "Unknown",
                progress: e.progress ? 100 : 0, // Simplified progress for now
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
                                    courses.map((course) => (
                                        <Link key={course.id} to={`/student/courses/${course.id}/learn`}>
                                            <div className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border bg-card hover:bg-accent/5 transition-all hover:border-primary/50 cursor-pointer">
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
                                                            <span className="text-muted-foreground font-medium">{course.progress}% Completed</span>
                                                        </div>
                                                        <Progress value={course.progress} className="h-2" />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
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
                                            const now = new Date();
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
        </StudentLayout>
    );
}
