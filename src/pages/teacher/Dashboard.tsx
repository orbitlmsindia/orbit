import { useEffect, useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
    Users,
    FileText,
    Clock,
    CheckCircle,
    Loader2
} from "lucide-react";
import { Link } from "react-router-dom";

export default function TeacherDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        students: 0,
        courses: 0,
        assignments: 0,
        avgCompletion: 0
    });
    const [courses, setCourses] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Courses assigned to this teacher
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('id, title, created_at, is_published')
                .eq('teacher_id', user.id)
                .order('created_at', { ascending: false });

            if (coursesError) throw coursesError;
            setCourses(coursesData || []);

            const courseIds = coursesData?.map(c => c.id) || [];

            // 2. Calculate Stats

            // Total Students Enrolled
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('student_id, completed')
                .in('course_id', courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']);

            const uniqueStudents = new Set(enrollments?.map(e => e.student_id)).size;

            // Avg Completion
            const totalEnrolled = enrollments?.length || 0;
            const completedCount = enrollments?.filter(e => e.completed).length || 0;
            const avgCompletion = totalEnrolled > 0 ? (completedCount / totalEnrolled) * 100 : 0;

            // Pending Assignments (Manual Submissions)
            // Fetch assignments for these courses
            const { data: assignments } = await supabase
                .from('assignments')
                .select('id')
                .in('course_id', courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000'])
                .eq('type', 'manual');

            const assignIds = assignments?.map(a => a.id) || [];

            let pendingCount = 0;
            if (assignIds.length > 0) {
                const { count } = await supabase
                    .from('submissions')
                    .select('*', { count: 'exact', head: true })
                    .in('assignment_id', assignIds)
                    .eq('status', 'pending');
                pendingCount = count || 0;
            }

            setStats({
                students: uniqueStudents,
                courses: coursesData?.length || 0,
                assignments: pendingCount,
                avgCompletion: Math.round(avgCompletion)
            });

            // 3. Recent Activity (Recent Submissions or Enrollments)
            // Let's fetch recent submissions
            if (assignIds.length > 0) {
                const { data: recentSubs } = await supabase
                    .from('submissions')
                    .select(`
                        id, submitted_at, status,
                        student:users!student_id(full_name),
                        assignment:assignments!assignment_id(title)
                    `)
                    .in('assignment_id', assignIds)
                    .order('submitted_at', { ascending: false })
                    .limit(5);

                const formattedActivity = recentSubs?.map(s => ({
                    id: s.id,
                    type: 'submission',
                    title: `Submission for ${s.assignment?.title}`,
                    user: s.student?.full_name,
                    date: s.submitted_at,
                    status: s.status
                })) || [];

                setRecentActivity(formattedActivity);
            }

        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <TeacherLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </TeacherLayout>
        );
    }

    const statCards = [
        { title: "Active Students", value: stats.students, icon: <Users className="h-5 w-5" /> },
        { title: "My Courses", value: stats.courses, icon: <FileText className="h-5 w-5" /> },
        { title: "Pending Assignments", value: stats.assignments, icon: <Clock className="h-5 w-5" />, variant: "warning" as const },
        { title: "Avg. Completion", value: `${stats.avgCompletion}%`, icon: <CheckCircle className="h-5 w-5" />, variant: "success" as const },
    ];

    return (
        <TeacherLayout>
            <div className="flex justify-between items-center animate-fade-in mb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Teacher Dashboard</h1>
                    <p className="text-muted-foreground">Overview of your courses and students.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in delay-75 mb-6">
                {statCards.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3 animate-fade-in delay-150">
                {/* Assigned Courses */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xl font-display">My Courses</CardTitle>
                            <Link to="/teacher/courses">
                                <Button variant="ghost" size="sm">View All</Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            {courses.slice(0, 4).map((course) => (
                                <div key={course.id} className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xl">
                                            📚
                                        </div>
                                        <Badge variant={course.is_published ? "success" : "secondary"}>
                                            {course.is_published ? "Published" : "Draft"}
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold text-lg line-clamp-1">{course.title}</h3>
                                    <div className="mt-4 text-xs text-muted-foreground">
                                        Created: {new Date(course.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {courses.length === 0 && (
                                <div className="col-span-2 text-center py-8 text-muted-foreground">
                                    No courses assigned yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div className="space-y-6">
                    <Card className="h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl font-display">
                                Recent Submission Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentActivity.length > 0 ? (
                                <div className="space-y-4">
                                    {recentActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <FileText className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{activity.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    by {activity.user} • {new Date(activity.date).toLocaleDateString()}
                                                </p>
                                                <Badge variant={activity.status === 'pending' ? 'warning' : 'secondary'} className="mt-1 text-[10px] px-1.5 py-0 h-auto">
                                                    {activity.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground text-sm">
                                    No recent submissions found.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TeacherLayout>
    );
}
