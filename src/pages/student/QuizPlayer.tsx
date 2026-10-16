import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Loader2, AlertTriangle, ShieldCheck, Lock, Maximize2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { DynamicWatermark } from "@/components/security/DynamicWatermark";
import { ExamProctorShield } from "@/components/security/ExamProctorShield";

export default function QuizPlayer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);

    // Student identity for forensic watermark & audit logs
    const [userEmail, setUserEmail] = useState<string>("student@orbitlms.com");
    const [userName, setUserName] = useState<string>("Orbit Student");
    const [studentId, setStudentId] = useState<string>("");

    // Proctoring & Exam state
    const [isExamStarted, setIsExamStarted] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Timer state
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [startTime, setStartTime] = useState<Date | null>(null);

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const [submissionNotice, setSubmissionNotice] = useState<string>("");

    useEffect(() => {
        if (id) fetchQuizData();
    }, [id]);

    const fetchQuizData = async () => {
        try {
            setLoading(true);

            // 1. Fetch current student identity for forensic dynamic watermark
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setStudentId(user.id);
                setUserEmail(user.email || "student@orbitlms.com");
                const { data: profile } = await supabase
                    .from('users')
                    .select('full_name, roll_number')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile?.full_name) {
                    setUserName(profile.full_name);
                }
            }

            // 2. Fetch Quiz Metadata
            const { data: quizData, error: quizError } = await supabase
                .from('assignments')
                .select('id, title, time_limit_minutes, due_date, is_graded')
                .eq('id', id)
                .single();

            if (quizError) throw quizError;
            setQuiz(quizData);

            // Set timer (minutes -> seconds)
            if (quizData.time_limit_minutes) {
                setTimeLeft(quizData.time_limit_minutes * 60);
            }

            // 3. Fetch Questions (Without correct answers to prevent inspection leaks)
            const { data: questionsData, error: qError } = await supabase
                .from('assignment_questions')
                .select('id, question_text, type, options, points, order_index')
                .eq('assignment_id', id)
                .order('order_index', { ascending: true });

            if (qError) throw qError;
            setQuestions(questionsData || []);

            // 4. Check for existing attempt
            if (user) {
                const { data: existingAttempt } = await supabase
                    .from('quiz_attempts')
                    .select('id, score')
                    .eq('assignment_id', id)
                    .eq('student_id', user.id)
                    .maybeSingle();

                if (existingAttempt) {
                    setIsSubmitted(true);
                    setIsExamStarted(true);
                    setScore(existingAttempt.score);
                }
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load examination." });
        } finally {
            setLoading(false);
        }
    };

    // Countdown timer for active exam
    useEffect(() => {
        if (isExamStarted && timeLeft > 0 && !isSubmitted && quiz?.time_limit_minutes) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        submitQuiz(true, "Time expired. Examination automatically submitted.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isExamStarted, timeLeft, isSubmitted, quiz]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            submitQuiz();
        }
    };

    const handleStartExam = () => {
        setIsExamStarted(true);
        setStartTime(new Date());
        toast({
            title: "🛡️ Proctored Exam Mode Active",
            description: "Fullscreen lock and dynamic forensic watermarks are active. Best of luck!",
        });
    };

    const handleViolationLimitReached = (totalViolations: number) => {
        submitQuiz(true, `Proctoring limit exceeded: ${totalViolations} security violations recorded.`);
    };

    const submitQuiz = async (auto = false, reason = "") => {
        if (isSubmitted) return;
        setIsSubmitted(true);
        if (reason) setSubmissionNotice(reason);

        // Exit fullscreen on completion
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                await document.exitFullscreen();
            }
        } catch (_) {}

        try {
            const { data: attempt, error: attemptError } = await supabase
                .from('quiz_attempts')
                .insert([{
                    assignment_id: id,
                    student_id: (await supabase.auth.getUser()).data.user?.id,
                    start_time: startTime || new Date(),
                    end_time: new Date(),
                    score: 0
                }])
                .select('id')
                .single();

            if (attemptError) {
                console.warn("Quiz attempt insertion warning:", attemptError);
            }

            if (attempt?.id) {
                const answersPayload = Object.entries(answers).map(([qId, val]) => ({
                    attempt_id: attempt.id,
                    question_id: qId,
                    answer_text: val
                }));

                if (answersPayload.length > 0) {
                    const { error: ansError } = await supabase.from('quiz_answers').insert(answersPayload);
                    if (ansError) console.warn("Quiz answers insertion warning:", ansError);
                }

                const { data: scoreData, error: gradeError } = await supabase.rpc('x_q_grd', { attempt_uuid: attempt.id });
                if (!gradeError && scoreData !== null) {
                    setScore(scoreData);
                }
            }

            toast({
                title: auto ? "Exam Auto-Submitted" : "Exam Successfully Submitted!",
                description: reason || "Your responses and proctoring telemetry have been recorded.",
            });

        } catch (error: any) {
            console.error("Quiz submission error:", error);
            toast({ title: "Responses Recorded", description: "Your responses have been saved." });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in select-none">
                <Card className="max-w-md w-full text-center border-2 border-primary/20 shadow-xl">
                    <CardContent className="pt-10 pb-10 space-y-6">
                        <div className="h-20 w-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle className="h-10 w-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-display">Examination Completed</h1>
                            <p className="text-muted-foreground mt-2 text-sm">
                                {submissionNotice || (score !== null ? "Your examination has been evaluated." : "Your responses have been recorded.")}
                            </p>
                        </div>

                        {score !== null && (
                            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your Verified Score</p>
                                <p className="text-4xl font-bold font-display text-primary">{typeof score === 'number' ? score.toFixed(1) : score}%</p>
                            </div>
                        )}

                        <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground font-mono">
                            Proctoring Security: Integrity verified • No leaks detected
                        </div>

                        <Button className="w-full font-bold" onClick={() => navigate('/student/assignments')}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (quiz && quiz.due_date && new Date(quiz.due_date) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 select-none">
                <Card className="max-w-md w-full text-center border border-destructive/20 shadow-xl">
                    <CardContent className="pt-10 pb-10 space-y-6">
                        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive shadow-inner">
                            <AlertTriangle className="h-10 w-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-display text-destructive">Examination Expired</h1>
                            <p className="text-muted-foreground mt-2 text-sm">The due date for this assessment has passed ({new Date(quiz.due_date).toLocaleDateString()}).</p>
                        </div>
                        <Button className="w-full font-semibold" onClick={() => navigate('/student/assignments')}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!quiz || questions.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Examination paper not found or has no active questions.</div>;
    }

    const q = questions[currentQuestion];

    return (
        <div className="min-h-screen flex flex-col bg-background select-none exam-protected relative overflow-hidden">
            {/* Proctoring Shield Guard (Handles Fullscreen, Tab-switch, DevTools & Screenshots) */}
            <ExamProctorShield
                examTitle={quiz.title}
                isStarted={isExamStarted}
                isSubmitted={isSubmitted}
                maxViolations={3}
                userEmail={userEmail}
                studentName={userName}
                studentId={studentId}
                onStartExam={handleStartExam}
                onViolationLimitReached={handleViolationLimitReached}
                onViolationLogged={(_, count) => setTabSwitchCount(count)}
            />

            {/* Forensic Dynamic Watermark Tiled & Floating Across Questions */}
            <DynamicWatermark
                userEmail={userEmail}
                userName={userName}
                studentId={studentId}
                opacity={0.07}
            />

            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 md:px-8 bg-card/95 backdrop-blur-xl select-none shrink-0 z-10 pt-[env(safe-area-inset-top,0px)]">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Lock className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="font-bold text-base sm:text-lg leading-tight truncate max-w-[260px] sm:max-w-md">
                            {quiz.title}
                        </h1>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                <ShieldCheck className="h-3 w-3" /> DRM Protected
                            </span>
                            <span>•</span>
                            <span>Candidate: {userEmail}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-5">
                    {/* Proctoring Status Pill */}
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold">
                        <Maximize2 className="h-3.5 w-3.5" /> Fullscreen Proctored
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-2 font-mono font-bold text-sm sm:text-base px-3 py-1.5 rounded-lg border ${timeLeft < 60 ? 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse' : 'bg-primary/5 text-primary border-primary/20'}`}>
                        <Clock className="h-4 w-4" />
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-1 rounded-none bg-muted shrink-0 z-10" />

            {/* Question Area (Encapsulated in DRM Protected Container) */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
                <div className="max-w-2xl w-full space-y-8 animate-fade-in bg-card/70 backdrop-blur-xs p-6 sm:p-8 rounded-2xl border border-border/80 shadow-lg relative">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
                                Question {currentQuestion + 1} of {questions.length}
                            </span>
                            <Badge variant="outline" className="font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                                {quiz?.is_graded === false ? "Practice Quiz • Ungraded" : `${q.points || 10} Marks`}
                            </Badge>
                        </div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold leading-snug text-foreground select-none">
                            {q.question_text}
                        </h2>
                    </div>

                    {/* Question Answer Render with Anti-Paste Enforcement */}
                    {(() => {
                        // 1. Multiple Choice or Boolean
                        if (q.type === "mcq" || q.type === "boolean" || (q.options && q.options.length > 0)) {
                            const optionsList = (q.options && q.options.length > 0)
                                ? q.options
                                : (q.type === "boolean" ? ["True", "False"] : ["Option A", "Option B", "Option C", "Option D"]);

                            return (
                                <RadioGroup
                                    value={answers[q.id] || ""}
                                    onValueChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                                    className="space-y-3 pt-2"
                                >
                                    {optionsList.map((option: string, index: number) => (
                                        <div
                                            key={index}
                                            className="flex items-center space-x-3 border border-border/80 p-4 rounded-xl hover:bg-muted/40 transition-all cursor-pointer [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5 select-none"
                                        >
                                            <RadioGroupItem value={option} id={`opt-${index}`} />
                                            <Label htmlFor={`opt-${index}`} className="flex-1 cursor-pointer font-medium text-sm sm:text-base select-none">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            );
                        }

                        // 2. Short Single-Line Answer Question
                        if (q.type === "short") {
                            return (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Your Written Answer Response:
                                    </Label>
                                    <Input
                                        placeholder="Type your response directly..."
                                        value={answers[q.id] || ""}
                                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            toast({ variant: "destructive", title: "Paste Blocked", description: "Pasting is disabled during proctored exams." });
                                        }}
                                        className="h-12 text-sm sm:text-base px-4 bg-background font-medium"
                                        autoComplete="off"
                                        spellCheck="false"
                                    />
                                </div>
                            );
                        }

                        // 3. Long Essay / Text Area Answer Question
                        if (q.type === "long") {
                            return (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Your Detailed Answer Response:
                                    </Label>
                                    <Textarea
                                        placeholder="Type your essay response directly..."
                                        value={answers[q.id] || ""}
                                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            toast({ variant: "destructive", title: "Paste Blocked", description: "Pasting is disabled during proctored exams." });
                                        }}
                                        className="min-h-[160px] text-sm sm:text-base p-4 bg-background font-medium leading-relaxed"
                                        autoComplete="off"
                                        spellCheck="false"
                                    />
                                </div>
                            );
                        }

                        // 4. Fallback Input Field
                        return (
                            <div className="space-y-2 pt-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Your Answer:
                                </Label>
                                <Input
                                    placeholder="Type your answer directly..."
                                    value={answers[q.id] || ""}
                                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        toast({ variant: "destructive", title: "Paste Blocked", description: "Pasting is disabled during proctored exams." });
                                    }}
                                    className="h-12 text-sm sm:text-base px-4 bg-background"
                                    autoComplete="off"
                                    spellCheck="false"
                                />
                            </div>
                        );
                    })()}

                    <div className="flex justify-between items-center pt-6 border-t border-border/60">
                        <Button
                            variant="outline"
                            disabled={currentQuestion === 0}
                            onClick={() => setCurrentQuestion(prev => prev - 1)}
                            className="font-medium"
                        >
                            Previous
                        </Button>
                        <Button onClick={handleNext} className="min-w-[120px] font-bold">
                            {currentQuestion === questions.length - 1 ? "Submit Examination" : "Next Question"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Persistent Anti-Cheat Warnings Pill if tab-switched */}
            {tabSwitchCount > 0 && (
                <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce z-50 border border-white/20">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Security Alert: Violations Recorded ({tabSwitchCount}/3)</span>
                </div>
            )}
        </div>
    );
}
