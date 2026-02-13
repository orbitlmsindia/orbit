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
    Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function StudentAssignments() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Enrolled Course IDs
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('course_id')
                .eq('student_id', user.id);

            const courseIds = enrollments?.map(e => e.course_id) || [];

            if (courseIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch Assignments
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
            const processed = assigns.map(a => {
                let status = 'pending';
                let grade = null;
                let submittedAt = null;

                if (a.type === 'manual' || a.type === 'assignment') {
                    const sub = subs?.find(s => s.assignment_id === a.id);
                    if (sub) {
                        status = sub.status; // pending, submitted, graded
                        grade = sub.grade;
                        submittedAt = sub.submitted_at;
                    } else if (a.due_date && new Date(a.due_date) < new Date()) {
                        status = 'missing';
                    }
                } else if (a.type === 'quiz') {
                    const att = attempts?.find(at => at.assignment_id === a.id);
                    if (att) {
                        status = 'graded'; // Quizzes are auto-graded usually
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
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load assignments." });
        } finally {
            setLoading(false);
        }
    };

    const filteredAssignments = assignments.filter(a => {
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
            <div className="flex items-center justify-between mb-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">Assignments</h1>
                    <p className="text-muted-foreground">Track your pending work and view past grades.</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <HelpCircle className="h-4 w-4" /> Help
                </Button>
            </div>

            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="space-y-6 animate-fade-in delay-75">
                <TabsList>
                    <TabsTrigger value="pending">To Do</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAssignments.map((assign) => (
                        <AssignmentCard key={assign.id} assignment={assign} />
                    ))}
                    {filteredAssignments.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>You're all caught up! No pending assignments.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="completed" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAssignments.map((assign) => (
                        <AssignmentCard key={assign.id} assignment={assign} />
                    ))}
                    {filteredAssignments.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                            <p>No completed assignments yet.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </StudentLayout>
    );
}

function AssignmentCard({ assignment }: { assignment: any }) {
    const isPending = assignment.status === "pending" || assignment.status === "missing";
    const statusColor =
        assignment.status === "graded" ? "success" :
            assignment.status === "submitted" ? "secondary" :
                assignment.status === "missing" ? "destructive" : "warning";

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
                    <Badge variant={isPending ? "outline" : "secondary"} className={isPending ? "bg-background" : ""}>
                        {isQuiz ? "Quiz" : "Assignment"}
                    </Badge>
                    <Badge variant={statusColor}>{statusLabel}</Badge>
                </div>
                <CardTitle className="line-clamp-1 text-lg">{assignment.title}</CardTitle>
                <CardDescription className="line-clamp-1">{assignment.course?.title}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span>Due: <span className={isPending ? "text-foreground font-medium" : ""}>
                        {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No Deadline"}
                    </span></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{assignment.points} Marks</span>
                </div>

                {!isPending && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-medium">Your Grade</span>
                        <span className="text-lg font-bold font-mono">
                            {assignment.grade !== null ? `${typeof assignment.grade === 'number' ? assignment.grade.toFixed(0) : assignment.grade}/${assignment.points}` : "Pending"}
                        </span>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                {isPending ? (
                    <Link to={linkTo} className="w-full">
                        <Button className="w-full gap-2">
                            {assignment.status === 'missing' ? "Submit Late" : "Start Now"} <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                ) : (
                    <Button variant="outline" className="w-full" disabled>
                        {isQuiz ? "Quiz Taken" : "View Submission"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
