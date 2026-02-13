import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function QuizPlayer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Timer state
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [startTime, setStartTime] = useState<Date | null>(null);

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState<number | null>(null);

    // Tab switching detection
    const [tabSwitchCount, setTabSwitchCount] = useState(0);

    useEffect(() => {
        if (id) fetchQuizData();
    }, [id]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !isSubmitted && quiz) {
                setTabSwitchCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 3) {
                        // Auto submit on 3rd violation
                        submitQuiz(true);
                        toast({ variant: "destructive", title: "Test Terminated", description: "You switched tabs too many times." });
                    } else {
                        toast({ variant: "destructive", title: "Warning", description: `Don't switch tabs! Warning ${newCount}/3` });
                    }
                    return newCount;
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isSubmitted, quiz, answers]);

    const fetchQuizData = async () => {
        try {
            setLoading(true);
            const { data: quizData, error: quizError } = await supabase
                .from('assignments')
                .select('*')
                .eq('id', id)
                .single();

            if (quizError) throw quizError;
            setQuiz(quizData);

            // Set timer (minutes -> seconds)
            if (quizData.time_limit_minutes) {
                setTimeLeft(quizData.time_limit_minutes * 60);
            }

            const { data: questionsData, error: qError } = await supabase
                .from('assignment_questions')
                .select('id, question_text, type, options, points, order_index') // Exclude correct_answer
                .eq('assignment_id', id)
                .order('order_index', { ascending: true });

            if (qError) throw qError;
            setQuestions(questionsData || []);
            setStartTime(new Date());

            // Check for existing attempt
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: existingAttempt } = await supabase
                    .from('quiz_attempts')
                    .select('*')
                    .eq('assignment_id', id)
                    .eq('student_id', user.id)
                    .maybeSingle();

                if (existingAttempt) {
                    setIsSubmitted(true);
                    // If score is stored, use it. If it's a raw score, we might need to calc percentage.
                    // Let's assume the RPC updates the score correctly as percentage or points.
                    // If we stored max points in assignment, we could calc.
                    // But for now, let's just display what is in `score`.
                    // And maybe fetch answers if we want to show reviews? No, just score for now.

                    // Re-calculate percentage if needed?
                    // The RPC `grade_quiz_attempt` calculates percentage if max > 0.
                    // So `existingAttempt.score` should be percentage.
                    setScore(existingAttempt.score);
                }
            }

            // Check Due Date
            if (quizData.due_date && new Date(quizData.due_date) < new Date()) {
                // If checking due date and NOT submitted, then expired.
                // If submitted, it's fine.
                // But we set submitted above.
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load quiz." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (timeLeft > 0 && !isSubmitted && quiz?.time_limit_minutes) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        submitQuiz(true); // Auto submit on timeout
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft, isSubmitted, quiz]);

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

    const submitQuiz = async (auto = false) => {
        if (isSubmitted) return;
        setIsSubmitted(true);

        try {
            // 1. Calculate Score (Server-side ideally, but client for now as per architecture doc RPC or similar. 
            // Actually the doc says RPC `submit_quiz`. But I don't see it in schema.sql provided.
            // Let's do a client-side calculation by fetching correct answers SECURELY? 
            // No, RLS prevents fetching correct_answer. 
            // We MUST use an RPC function or Edge Function.
            // As I cannot easily deploy Edge Functions here, I will check if there is an RPC.
            // Checking schema.sql... I don't see `submit_quiz` RPC in the file.

            // Allow me to fallback: I will fetch correct answers separately? No RLS blocks it.
            // Use a workaround: I'll assume I am the teacher/admin? NO, I am student.

            // I will implement a client-side check if I can't fetch correct answers? I can't.
            // I must create an RPC function to Grade it.

            // For now, I'll submit the answers to `quiz_answers`.
            // And then I might need to Create an RPC `grade_quiz` if it doesn't exist.

            // Let's try to submit to `quiz_attempts` first.
            const { data: attempt, error: attemptError } = await supabase
                .from('quiz_attempts')
                .insert([{
                    assignment_id: id,
                    student_id: (await supabase.auth.getUser()).data.user?.id,
                    start_time: startTime,
                    end_time: new Date(),
                    score: 0 // Placeholder
                }])
                .select()
                .single();

            if (attemptError) throw attemptError;

            // Insert Answers
            const answersPayload = Object.entries(answers).map(([qId, val]) => ({
                attempt_id: attempt.id,
                question_id: qId,
                answer_text: val
            }));

            if (answersPayload.length > 0) {
                const { error: ansError } = await supabase.from('quiz_answers').insert(answersPayload);
                if (ansError) throw ansError;
            }

            // Call Grading RPC (which I will create next)
            const { data: scoreData, error: gradeError } = await supabase.rpc('grade_quiz_attempt', { attempt_uuid: attempt.id });

            if (gradeError) {
                // Fallback if RPC fails or not exists (during dev)
                console.warn("Grading RPC failed", gradeError);
                toast({ title: "Submitted", description: "Your answers have been recorded." });
            } else {
                setScore(scoreData);
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Submission Error", description: error.message });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-10 pb-10 space-y-6">
                        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                            <CheckCircle className="h-10 w-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-display">Quiz Completed</h1>
                            <p className="text-muted-foreground mt-2">
                                {score !== null ? "You have already submitted this quiz." : "Your answers have been recorded."}
                            </p>
                        </div>

                        {score !== null && (
                            <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-1">Your Score</p>
                                <p className="text-4xl font-bold text-primary">{typeof score === 'number' ? score.toFixed(1) : score}%</p>
                            </div>
                        )}

                        <Button className="w-full" onClick={() => navigate('/student/assignments')}>Return to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (quiz && quiz.due_date && new Date(quiz.due_date) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-10 pb-10 space-y-6">
                        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                            <AlertTriangle className="h-10 w-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-display text-destructive">Quiz Expired</h1>
                            <p className="text-muted-foreground mt-2">The due date for this quiz has passed ({new Date(quiz.due_date).toLocaleDateString()}).</p>
                        </div>
                        <Button className="w-full" onClick={() => navigate('/student/assignments')}>Return to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!quiz || questions.length === 0) return <div className="p-8 text-center">Quiz not found or has no questions.</div>;

    const q = questions[currentQuestion];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 md:px-8 bg-card select-none">
                <h1 className="font-semibold text-lg">{quiz.title}</h1>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 font-mono font-medium ${timeLeft < 60 ? 'text-destructive' : 'text-primary'}`}>
                        <Clock className="h-4 w-4" />
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-1 rounded-none" />

            {/* Question Area */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full space-y-8 animate-fade-in">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Question {currentQuestion + 1} of {questions.length}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground">
                                {q.points} Points
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight">
                            {q.question_text}
                        </h2>
                    </div>

                    <RadioGroup
                        value={answers[q.id] || ""}
                        onValueChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                        className="space-y-4"
                    >
                        {q.options?.map((option: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2 border p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                                <RadioGroupItem value={option} id={`opt-${index}`} />
                                <Label htmlFor={`opt-${index}`} className="flex-1 cursor-pointer font-medium text-base">{option}</Label>
                            </div>
                        ))}
                    </RadioGroup>

                    <div className="flex justify-between pt-8">
                        <Button
                            variant="outline"
                            disabled={currentQuestion === 0}
                            onClick={() => setCurrentQuestion(prev => prev - 1)}
                        >
                            Previous
                        </Button>
                        <Button onClick={handleNext} className="w-32">
                            {currentQuestion === questions.length - 1 ? "Submit" : "Next"}
                        </Button>
                    </div>
                </div>
            </div>

            {tabSwitchCount > 0 && (
                <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
                    <AlertTriangle className="h-4 w-4" />
                    Warning: Tab Switching Detected ({tabSwitchCount}/3)
                </div>
            )}
        </div>
    );
}
