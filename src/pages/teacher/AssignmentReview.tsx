import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, ExternalLink, CheckCircle, Search, Loader2, BrainCircuit, Eye, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { BulkGradeImporterModal } from "@/components/grading/BulkGradeImporterModal";

export default function AssignmentReview() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("manual");
    const [bulkModalOpen, setBulkModalOpen] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState("all");
    const [assignmentFilter, setAssignmentFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Assignments created by this teacher (via courses)
            const { data: courseData } = await supabase.from('courses').select('id').eq('teacher_id', user.id);
            const courseIds = courseData?.map(c => c.id) || [];

            if (courseIds.length === 0) {
                setLoading(false);
                return;
            }

            const { data: assigns } = await supabase
                .from('assignments')
                .select('id, title, course_id, type')
                .in('course_id', courseIds);

            setAssignments(assigns || []);
            const assignIds = assigns?.map(a => a.id) || [];

            if (assignIds.length === 0) {
                setSubmissions([]);
                setQuizAttempts([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Manual Submissions
            const { data: subs, error: subError } = await supabase
                .from('submissions')
                .select(`
                    *,
                    student:users!student_id(full_name, avatar_url, email),
                    assignment:assignments!assignment_id(title, points)
                `)
                .in('assignment_id', assignIds)
                .order('submitted_at', { ascending: false });

            if (subError) throw subError;
            setSubmissions(subs || []);

            // 3. Fetch Quiz Attempts
            const { data: attempts, error: attemptError } = await supabase
                .from('quiz_attempts')
                .select(`
                    *,
                    student:users!student_id(full_name, avatar_url, email),
                    assignment:assignments!assignment_id(title, points)
                `)
                .in('assignment_id', assignIds)
                .order('start_time', { ascending: false });

            if (attemptError) throw attemptError;
            setQuizAttempts(attempts || []);

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load submissions." });
        } finally {
            setLoading(false);
        }
    };

    const filteredSubmissions = submissions.filter(sub => {
        const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
        const matchesAssignment = assignmentFilter === 'all' || sub.assignment_id === assignmentFilter;
        const matchesSearch = sub.student?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.student?.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesAssignment && matchesSearch;
    });

    const handleUpdateGrade = async (submissionId: string, grade: number, feedback: string) => {
        try {
            const { error } = await supabase
                .from('submissions')
                .update({
                    grade,
                    feedback,
                    status: 'graded',
                    updated_at: new Date()
                })
                .eq('id', submissionId);

            if (error) throw error;

            toast({ title: "Graded", description: "Submission updated successfully." });

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === submissionId ? { ...s, grade, feedback, status: 'graded' } : s
            ));

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
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

    return (
        <TeacherLayout>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">Review & Grading</h1>
                    <p className="text-muted-foreground">Grade quiz attempts and manual assignment submissions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setBulkModalOpen(true)}
                        className="gap-2 font-bold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <FileSpreadsheet className="h-4 w-4" /> Bulk Grade Import (CSV / Excel)
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="mb-6">
                    <TabsTrigger value="manual" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Manual Assignments
                    </TabsTrigger>
                    <TabsTrigger value="quiz" className="gap-2">
                        <BrainCircuit className="h-4 w-4" />
                        Quiz Attempts
                    </TabsTrigger>
                </TabsList>

                {/* Manual Assignment Review Tab */}
                <TabsContent value="manual" className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in delay-75">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search students..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="graded">Graded</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="Assignment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Assignments</SelectItem>
                                {assignments.filter(a => a.type === 'manual' || a.type === 'assignment').map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-xl bg-card animate-fade-in delay-100 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Assignment</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSubmissions.map((sub) => (
                                    <TableRow key={sub.id} className="group hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={sub.student?.avatar_url} />
                                                    <AvatarFallback>{sub.student?.full_name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{sub.student?.full_name}</div>
                                                    <div className="text-xs text-muted-foreground">{sub.student?.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{sub.assignment?.title}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(sub.submitted_at).toLocaleDateString()} {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                sub.status === "graded" ? "success" :
                                                    sub.status === "late" ? "destructive" : "warning"
                                            }>
                                                {sub.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {sub.grade !== null ? <span className="font-bold">{sub.grade} / {sub.assignment?.points}</span> : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ReviewSheet submission={sub} onSave={handleUpdateGrade} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredSubmissions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            No submissions found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* Quiz Attempts Review Tab */}
                <TabsContent value="quiz" className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in delay-75">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search students..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="Quiz" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Quizzes</SelectItem>
                                {assignments.filter(a => a.type === 'quiz').map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-xl bg-card animate-fade-in delay-100 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Quiz</TableHead>
                                    <TableHead>Attempted</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quizAttempts
                                    .filter(attempt => {
                                        const matchesAssignment = assignmentFilter === 'all' || attempt.assignment_id === assignmentFilter;
                                        const matchesSearch = attempt.student?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            attempt.student?.email.toLowerCase().includes(searchQuery.toLowerCase());
                                        return matchesAssignment && matchesSearch;
                                    })
                                    .map((attempt) => {
                                        const duration = attempt.end_time && attempt.start_time
                                            ? Math.round((new Date(attempt.end_time).getTime() - new Date(attempt.start_time).getTime()) / 60000)
                                            : null;

                                        return (
                                            <TableRow key={attempt.id} className="group hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={attempt.student?.avatar_url} />
                                                            <AvatarFallback>{attempt.student?.full_name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{attempt.student?.full_name}</div>
                                                            <div className="text-xs text-muted-foreground">{attempt.student?.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{attempt.assignment?.title}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(attempt.start_time).toLocaleDateString()} {new Date(attempt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {duration ? `${duration} min` : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold font-mono text-lg">
                                                            {attempt.score !== null ? `${typeof attempt.score === 'number' ? attempt.score.toFixed(1) : attempt.score}%` : 'Pending'}
                                                        </span>
                                                        {attempt.score !== null && attempt.score >= 70 && (
                                                            <Badge variant="success" className="text-xs">Pass</Badge>
                                                        )}
                                                        {attempt.score !== null && attempt.score < 70 && (
                                                            <Badge variant="destructive" className="text-xs">Fail</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <QuizAttemptSheet attempt={attempt} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                {quizAttempts.filter(attempt => {
                                    const matchesAssignment = assignmentFilter === 'all' || attempt.assignment_id === assignmentFilter;
                                    const matchesSearch = attempt.student?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        attempt.student?.email.toLowerCase().includes(searchQuery.toLowerCase());
                                    return matchesAssignment && matchesSearch;
                                }).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                No quiz attempts found matching your filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
            <BulkGradeImporterModal
                open={bulkModalOpen}
                onOpenChange={setBulkModalOpen}
                existingSubmissions={submissions}
                onSuccess={fetchData}
            />
        </TeacherLayout>
    );
}

function ReviewSheet({ submission, onSave }: { submission: any, onSave: (id: string, grade: number, feedback: string) => void }) {
    const [grade, setGrade] = useState<string>(submission.grade?.toString() || "");
    const [feedback, setFeedback] = useState(submission.feedback || "");
    const [open, setOpen] = useState(false);

    const handleSubmit = () => {
        let numGrade = parseFloat(grade);
        if (!isNaN(numGrade)) {
            const maxPoints = submission.assignment?.points || 100;
            if (numGrade > maxPoints) numGrade = maxPoints;
            if (numGrade < 0) numGrade = 0;
            onSave(submission.id, numGrade, feedback);
            setOpen(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="sm" variant={submission.status === 'graded' ? "secondary" : "default"}>
                    {submission.status === 'graded' ? "Edit Grade" : "Grade"}
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Review Submission</SheetTitle>
                    <SheetDescription>
                        Grading for <b>{submission.student?.full_name}</b> - {submission.assignment?.title}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Submission Content */}
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className="font-medium">Submission Content</span>
                            </div>
                            {submission.file_url && (
                                <a href={submission.file_url} target="_blank" rel="noreferrer">
                                    <Button variant="outline" size="sm" className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 font-semibold shadow-xs">
                                        <ExternalLink className="h-4 w-4 text-primary" /> Open Student Drive Submission ↗
                                    </Button>
                                </a>
                            )}
                        </div>

                        {submission.text_content && (
                            <div className="bg-background p-3 rounded border text-sm whitespace-pre-wrap">
                                {submission.text_content}
                            </div>
                        )}

                        {!submission.text_content && !submission.file_url && (
                            <div className="text-sm text-muted-foreground italic">No content submitted.</div>
                        )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <Label>Feedback</Label>
                            <Textarea
                                className="h-[200px]"
                                placeholder="Enter feedback for the student..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 border rounded-lg space-y-4">
                                <Label>Grade</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        min={0}
                                        max={submission.assignment?.points || 100}
                                        className="text-lg font-mono"
                                        value={grade}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "") {
                                                setGrade("");
                                                return;
                                            }
                                            const num = parseFloat(val);
                                            const maxPoints = submission.assignment?.points || 100;
                                            if (num > maxPoints) {
                                                setGrade(maxPoints.toString());
                                            } else if (num < 0) {
                                                setGrade("0");
                                            } else {
                                                setGrade(val);
                                            }
                                        }}
                                    />
                                    <span className="text-muted-foreground font-mono">/ {submission.assignment?.points}</span>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <Button className="w-full gap-2" variant="default" onClick={handleSubmit}>
                                        <CheckCircle className="h-4 w-4" /> Submit Grade
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <SheetFooter className="mt-8">
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

function QuizAttemptSheet({ attempt }: { attempt: any }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [questionDetails, setQuestionDetails] = useState<any[]>([]);

    const fetchAttemptDetails = async () => {
        if (!open) return;

        try {
            setLoading(true);
            
            // 1. Fetch all questions for this assignment
            const { data: questions, error: qError } = await supabase
                .from('assignment_questions')
                .select('*')
                .eq('assignment_id', attempt.assignment_id)
                .order('order_index', { ascending: true });

            if (qError) throw qError;

            // 2. Fetch all student answers for this attempt
            const { data: answers, error: aError } = await supabase
                .from('quiz_answers')
                .select('*')
                .eq('attempt_id', attempt.id);

            if (aError) throw aError;

            const answersMap = new Map((answers || []).map(a => [a.question_id, a]));

            // Combine questions with student responses
            const combined = (questions || []).map(q => {
                const ans = answersMap.get(q.id);
                const options = q.options && Array.isArray(q.options) && q.options.length > 0 
                    ? q.options 
                    : (q.type === 'boolean' ? ["True", "False"] : []);
                    
                return {
                    ...q,
                    options,
                    studentAnswer: ans?.answer_text || "No Answer",
                    isCorrect: ans?.is_correct || false,
                    pointsAwarded: ans?.points_awarded || 0
                };
            });

            setQuestionDetails(combined);
        } catch (error) {
            console.error("Error fetching attempt details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttemptDetails();
    }, [open]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                    <Eye className="h-4 w-4" /> View Details
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-3xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Quiz Attempt Details</SheetTitle>
                    <SheetDescription>
                        <b>{attempt.student?.full_name}</b> - {attempt.assignment?.title}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Score Summary */}
                        <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Final Score</p>
                                    <p className="text-3xl font-bold text-primary">
                                        {attempt.score !== null ? `${typeof attempt.score === 'number' ? attempt.score.toFixed(1) : attempt.score}%` : 'Pending'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                                    <Badge variant={attempt.score >= 70 ? "success" : "destructive"} className="text-lg px-3 py-1">
                                        {attempt.score >= 70 ? "Pass" : "Fail"}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Questions and Answers */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Question Breakdown & Responses ({questionDetails.length})</h3>
                            {questionDetails.map((q, idx) => (
                                <div key={q.id || idx} className="p-5 rounded-xl border bg-card space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question {idx + 1}</span>
                                            <h4 className="font-semibold text-base text-foreground mt-0.5">{q.question_text}</h4>
                                        </div>
                                        <Badge variant={q.isCorrect ? "success" : "destructive"} className="shrink-0 font-mono text-xs">
                                            {q.isCorrect ? `+${q.pointsAwarded} pts` : `0 / ${q.points} pts`}
                                        </Badge>
                                    </div>

                                    {/* Options List for MCQ & Boolean */}
                                    {q.options && q.options.length > 0 ? (
                                        <div className="space-y-2 pt-2">
                                            <p className="text-xs font-semibold text-muted-foreground">Options:</p>
                                            <div className="grid gap-2">
                                                {q.options.map((opt: string, optIdx: number) => {
                                                    const isCorrect = String(opt).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
                                                    const isSelected = String(opt).trim().toLowerCase() === String(q.studentAnswer).trim().toLowerCase();

                                                    let optionStyle = "border-border/60 bg-muted/20 text-muted-foreground";
                                                    if (isCorrect) {
                                                        optionStyle = "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold";
                                                    } else if (isSelected && !isCorrect) {
                                                        optionStyle = "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold";
                                                    }

                                                    return (
                                                        <div key={optIdx} className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${optionStyle}`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-[11px] opacity-70">Option {String.fromCharCode(65 + optIdx)}:</span>
                                                                <span>{opt}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {isCorrect && (
                                                                    <Badge className="bg-emerald-600 text-white border-none text-[10px]">
                                                                        ✓ Correct Answer
                                                                    </Badge>
                                                                )}
                                                                {isSelected && !isCorrect && (
                                                                    <Badge variant="destructive" className="text-[10px]">
                                                                        ✗ Student Answer
                                                                    </Badge>
                                                                )}
                                                                {isSelected && isCorrect && (
                                                                    <Badge className="bg-emerald-600 text-white border-none text-[10px]">
                                                                        (Student Selected)
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Text-based Question Response */
                                        <div className="space-y-2 pt-2 text-xs">
                                            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                                                <span className="font-semibold text-muted-foreground">Student Submitted Answer:</span>
                                                <p className="font-medium text-foreground whitespace-pre-wrap">{q.studentAnswer}</p>
                                            </div>
                                            <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-1">
                                                <span className="font-semibold">Model / Correct Answer:</span>
                                                <p className="font-medium whitespace-pre-wrap">{q.correct_answer || "N/A"}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <SheetFooter className="mt-8">
                    <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
