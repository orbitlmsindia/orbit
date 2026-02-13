import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Plus, Save, ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function QuizEditor() {
    const { courseId, quizId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [quiz, setQuiz] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);

    useEffect(() => {
        if (quizId) fetchQuizData();
    }, [quizId]);

    const fetchQuizData = async () => {
        try {
            setLoading(true);
            // Fetch Quiz Assignment Details
            const { data: quizData, error: quizError } = await supabase
                .from('assignments')
                .select('*')
                .eq('id', quizId)
                .single();

            if (quizError) throw quizError;
            setQuiz(quizData);

            // Fetch Questions
            const { data: questionsData, error: questionsError } = await supabase
                .from('assignment_questions')
                .select('*')
                .eq('assignment_id', quizId)
                .order('order_index', { ascending: true });

            if (questionsError) throw questionsError;
            setQuestions(questionsData || []);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: "Failed to load quiz data" });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                id: `temp-${Date.now()}`,
                type: 'mcq',
                question_text: '',
                points: 1,
                options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                correct_answer: "Option 1"
            }
        ]);
    };

    const handleRemoveQuestion = async (id: string, index: number) => {
        // If it's a temp question, just remove from state
        if (id.toString().startsWith('temp-')) {
            const newQuestions = [...questions];
            newQuestions.splice(index, 1);
            setQuestions(newQuestions);
            return;
        }

        // If it's existing, delete from DB
        try {
            const { error } = await supabase
                .from('assignment_questions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            const newQuestions = [...questions];
            newQuestions.splice(index, 1);
            setQuestions(newQuestions);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete question" });
        }
    };

    const handleQuestionChange = (index: number, field: string, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
        const newQuestions = [...questions];
        const oldOptionValue = newQuestions[qIndex].options[optIndex];

        // Update the option text
        newQuestions[qIndex].options[optIndex] = value;

        // If this option was the correct answer, update the correct_answer field to match the new text
        if (newQuestions[qIndex].correct_answer === oldOptionValue) {
            newQuestions[qIndex].correct_answer = value;
        }

        setQuestions(newQuestions);
    };

    const saveQuiz = async () => {
        try {
            setSaving(true);

            // 1. Update Quiz Details (optional, if we added fields)

            // 2. Upsert Questions
            const upsertPayload = questions.map((q, idx) => {
                const payload: any = {
                    assignment_id: quizId,
                    question_text: q.question_text,
                    type: q.type,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    points: q.points,
                    order_index: idx
                };
                if (q.id && !q.id.startsWith('temp-')) {
                    payload.id = q.id;
                }
                return payload;
            });

            const { error } = await supabase
                .from('assignment_questions')
                .upsert(upsertPayload);

            if (error) throw error;

            toast({ title: "Success", description: "Quiz saved successfully" });
            fetchQuizData(); // Refresh to get real IDs for new questions
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setSaving(false);
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
            <div className="flex items-center gap-4 mb-6 animate-fade-in">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-display font-bold">Edit Quiz: {quiz.title}</h1>
                    <p className="text-muted-foreground text-sm">Add questions and configure settings.</p>
                </div>
                <Button onClick={saveQuiz} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <div className="space-y-6 max-w-4xl mx-auto pb-10">
                {questions.map((q, index) => (
                    <Card key={q.id || index} className="relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <span className="font-mono text-xl font-bold text-muted-foreground/50">#{index + 1}</span>
                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Label>Question Text</Label>
                                            <Input
                                                className="mt-1"
                                                placeholder="Enter question..."
                                                value={q.question_text}
                                                onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-[120px]">
                                            <Label>Points</Label>
                                            <Input
                                                type="number"
                                                className="mt-1"
                                                value={q.points}
                                                onChange={(e) => handleQuestionChange(index, 'points', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div className="pl-4 border-l-2 border-muted space-y-3">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Answer Options</Label>
                                        <RadioGroup
                                            value={q.correct_answer}
                                            onValueChange={(val) => handleQuestionChange(index, 'correct_answer', val)}
                                        >
                                            {q.options?.map((opt: string, optIdx: number) => (
                                                <div key={optIdx} className="flex items-center gap-2">
                                                    <RadioGroupItem value={opt} id={`q${index}-opt${optIdx}`} />
                                                    <Input
                                                        value={opt}
                                                        onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                                                        className={`h-9 ${q.correct_answer === opt ? 'border-success ring-1 ring-success' : ''}`}
                                                    />
                                                    {q.correct_answer === opt && <CheckCircleIcon className="h-4 w-4 text-success" />}
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveQuestion(q.id, index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Button onClick={handleAddQuestion} variant="outline" className="w-full py-8 border-dashed gap-2 hover:bg-muted/50">
                    <Plus className="h-4 w-4" /> Add Question
                </Button>
            </div>
        </TeacherLayout>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
