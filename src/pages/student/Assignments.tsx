import { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FileText,
    Clock,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    HelpCircle,
    Loader2,
    Hourglass,
    BookOpen,
    ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function StudentAssignments() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("pending");
    const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);
    const [hasEnrollments, setHasEnrollments] = useState(false);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get All Enrolled Courses (Approved & Pending)
            const { data: allEnrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    id, course_id, status, transaction_id,
                    course:courses(title)
                `)
                .eq('student_id', user.id);

            if (enrollError) {
                console.warn("Error fetching enrollments:", enrollError);
            }

            const allList = allEnrollments || [];
            setHasEnrollments(allList.length > 0);

            const approvedList = allList.filter((e: any) => e.status === 'approved' || e.status === 'active');
            const pendingList = allList.filter((e: any) => e.status === 'pending');

            setPendingEnrollments(pendingList);

            const courseIds = approvedList.map((e: any) => e.course_id).filter(Boolean);

            if (courseIds.length === 0) {
                setAssignments([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Assignments for approved courses
            const { data: assigns, error: assignError } = await supabase
                .from('assignments')
                .select(`
                    id, title, due_date, points, type, course_id,
                    course:courses(title)
                `)
                .in('course_id', courseIds)
                .order('due_date', { ascending: true });

            if (assignError) throw assignError;

            // 3. Fetch Submissions (Manual)
            const { data: subs } = await supabase
                .from('submissions')
                .select('assignment_id, status, grade, submitted_at')
                .eq('student_id', user.id);

            // 4. Fetch Quiz Attempts
            const { data: attempts } = await supabase
                .from('quiz_attempts')
                .select('assignment_id, score, start_time')
                .eq('student_id', user.id);

            // Merge Data
            const processed = (assigns || []).map((a: any) => {
                let status = 'pending';
                let grade = null;
                let submittedAt = null;

                if (a.type === 'manual' || a.type === 'assignment') {
                    const sub = subs?.find((s: any) => s.assignment_id === a.id);
                    if (sub) {
                        status = sub.status;
                        grade = sub.grade;
                        submittedAt = sub.submitted_at;
                    } else if (a.due_date && new Date(a.due_date) < new Date()) {
                        status = 'missing';
                    }
                } else if (a.type === 'quiz') {
                    const att = attempts?.find((at: any) => at.assignment_id === a.id);
                    if (att) {
                        status = 'graded';
                        grade = att.score;
                        submittedAt = att.start_time;
                    } else if (a.due_date && new Date(a.due_date) < new Date()) {
                        status = 'missing';
                    }
                }

                return {
                    ...a,
                    status,
                    grade,
                    submittedAt
                };
            });

            setAssignments(processed);

        } catch (error: any) {
            console.error("Error loading assignments:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load assignments." });
        } finally {
            setLoading(false);
        }
    };

    const filteredAssignments = assignments.filter((a: any) => {
        if (activeTab === "pending") {
            return a.status === 'pending' || a.status === 'missing';
        } else {
            return a.status === 'submitted' || a.status === 'graded';
        }
    });

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
            <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Assignments & Quizzes</h1>
                        <p className="text-muted-foreground text-sm">Track your coursework deadlines, submit tasks, and review grades.</p>
                    </div>
                    <Link to="/student/help-center">
                        <Button variant="outline" size="sm" className="gap-2">
                            <HelpCircle className="h-4 w-4" /> Need Help?
                        </Button>
                    </Link>
                </div>

                {/* Pending Course Enrollment Guidance Alert */}
                {pendingEnrollments.length > 0 && (
                    <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                    <Hourglass className="h-5 w-5 animate-pulse" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold text-amber-600 dark:text-amber-400">
                                        Enrollment Verification in Progress ({pendingEnrollments.length} Course{pendingEnrollments.length > 1 ? "s" : ""})
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Your payment/enrollment request has been submitted. Course assignments and quizzes will activate automatically once approved.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                                {pendingEnrollments.map((pe: any) => (
                                    <Badge key={pe.id} variant="outline" className="text-xs bg-background/60 text-foreground border-amber-500/30">
                                        {pe.course?.title || "Pending Course"} (Txn: {pe.transaction_id || "Submitted"})
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs */}
                <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="pending" className="text-xs">
                            To Do ({assignments.filter((a: any) => a.status === 'pending' || a.status === 'missing').length})
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs">
                            Completed ({assignments.filter((a: any) => a.status === 'submitted' || a.status === 'graded').length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredAssignments.map((assign: any) => (
                            <AssignmentCard key={assign.id} assignment={assign} />
                        ))}
                        {filteredAssignments.length === 0 && (
                            <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-card/30 space-y-3">
                                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/40" />
                                <div>
                                    <p className="font-semibold text-foreground">
                                        {!hasEnrollments
                                            ? "No courses enrolled yet"
                                            : pendingEnrollments.length > 0 && assignments.length === 0
                                                ? "Awaiting course enrollment approval"
                                                : "You're all caught up! No pending assignments."}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                                        {!hasEnrollments
                                            ? "Enroll in an active course to access assignments, quizzes, and project evaluations."
                                            : pendingEnrollments.length > 0 && assignments.length === 0
                                                ? "Assignments for your pending courses will become accessible once your enrollment is approved."
                                                : "Great job! Keep checking back for newly published modules and assignments."}
                                    </p>
                                </div>
                                {!hasEnrollments && (
                                    <Link to="/student/courses">
                                        <Button size="sm" className="gap-2 mt-2">
                                            <BookOpen className="h-4 w-4" /> Browse Courses
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredAssignments.map((assign: any) => (
                            <AssignmentCard key={assign.id} assignment={assign} />
                        ))}
                        {filteredAssignments.length === 0 && (
                            <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-card/30">
                                <p className="font-semibold text-foreground">No completed assignments yet</p>
                                <p className="text-xs text-muted-foreground mt-1">Submitted work and graded quizzes will appear here.</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </StudentLayout>
    );
}

function AssignmentCard({ assignment }: { assignment: any }) {
    const isPending = assignment.status === "pending" || assignment.status === "missing";
    const statusColor =
        assignment.status === "graded" ? "default" :
            assignment.status === "submitted" ? "secondary" :
                assignment.status === "missing" ? "destructive" : "outline";

    const statusLabel =
        assignment.status === "graded" ? "Graded" :
            assignment.status === "submitted" ? "Submitted" :
                assignment.status === "missing" ? "Missing" : "Pending";

    const isQuiz = assignment.type === 'quiz';
    const linkTo = isQuiz ? `/student/quiz/${assignment.id}` : `/student/assignments/${assignment.id}`;

    return (
        <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant={isPending ? "outline" : "secondary"} className={isPending ? "bg-background text-xs" : "text-xs"}>
                        {isQuiz ? "Quiz" : "Assignment"}
                    </Badge>
                    <Badge variant={statusColor as any} className="text-[11px]">{statusLabel}</Badge>
                </div>
                <CardTitle className="line-clamp-1 text-base">{assignment.title}</CardTitle>
                <CardDescription className="line-clamp-1 text-xs">{assignment.course?.title || "Course"}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Due: <span className={isPending ? "text-foreground font-medium" : ""}>
                        {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No Deadline"}
                    </span></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{assignment.points || 100} Marks</span>
                </div>

                {!isPending && (
                    <div className="mt-4 p-3 bg-muted/40 rounded-lg flex justify-between items-center text-xs">
                        <span className="font-medium text-muted-foreground">Score</span>
                        <span className="text-base font-bold font-mono text-foreground">
                            {assignment.grade !== null ? `${typeof assignment.grade === 'number' ? assignment.grade.toFixed(0) : assignment.grade}/${assignment.points || 100}` : "Pending Evaluation"}
                        </span>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                {isPending ? (
                    <Link to={linkTo} className="w-full">
                        <Button className="w-full gap-2 text-xs h-9">
                            {assignment.status === 'missing' ? "Submit Late" : "Start Now"} <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                ) : (
                    <Button variant="outline" className="w-full text-xs h-9" disabled>
                        {isQuiz ? "Quiz Taken" : "View Submission"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
