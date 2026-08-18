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
                .select('id, title')
                .eq('id', quizId)
                .single();

            if (quizError) throw quizError;
            setQuiz(quizData);

            // Fetch Questions
            const { data: questionsData, error: questionsError } = await supabase
                .from('assignment_questions')
                .select('id, type, question_text, points, options, correct_answer')
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
                points: 10,
                options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                correct_answer: "Option 1"
            }
        ]);
    };

    const handleRemoveQuestion = async (id: string, index: number) => {
        if (id.toString().startsWith('temp-')) {
            const newQuestions = [...questions];
            newQuestions.splice(index, 1);
            setQuestions(newQuestions);
            return;
        }

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
        const currentQ = { ...newQuestions[index], [field]: value };

        if (field === 'type') {
            if (value === 'boolean') {
                currentQ.options = ["True", "False"];
                currentQ.correct_answer = "True";
            } else if (value === 'mcq' && (!currentQ.options || currentQ.options.length === 0)) {
                currentQ.options = ["Option 1", "Option 2", "Option 3", "Option 4"];
                currentQ.correct_answer = "Option 1";
            } else if (value === 'short' || value === 'long') {
                currentQ.options = null;
            }
        }

        newQuestions[index] = currentQ;
        setQuestions(newQuestions);
    };

    const handleAddOption = (qIndex: number) => {
        const newQuestions = [...questions];
        const opts = [...(newQuestions[qIndex].options || [])];
        opts.push(`Option ${opts.length + 1}`);
        newQuestions[qIndex].options = opts;
        setQuestions(newQuestions);
    };

    const handleRemoveOption = (qIndex: number, optIndex: number) => {
        const newQuestions = [...questions];
        const opts = [...(newQuestions[qIndex].options || [])];
        const removedOpt = opts[optIndex];
        opts.splice(optIndex, 1);
        newQuestions[qIndex].options = opts;
        if (newQuestions[qIndex].correct_answer === removedOpt) {
            newQuestions[qIndex].correct_answer = opts[0] || '';
        }
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
        const newQuestions = [...questions];
        const oldOptionValue = newQuestions[qIndex].options[optIndex];

        newQuestions[qIndex].options[optIndex] = value;

        if (newQuestions[qIndex].correct_answer === oldOptionValue) {
            newQuestions[qIndex].correct_answer = value;
        }

        setQuestions(newQuestions);
    };

    const saveQuiz = async () => {
        try {
            setSaving(true);

            // 1. Upsert Questions into assignment_questions
            const upsertPayload = questions.map((q, idx) => {
                const qType = q.type || 'mcq';
                const payload: any = {
                    assignment_id: quizId,
                    question_text: q.question_text || 'Question',
                    type: qType,
                    options: (qType === 'mcq' || qType === 'boolean') ? (q.options || (qType === 'boolean' ? ["True", "False"] : ["Option 1", "Option 2"])) : null,
                    correct_answer: q.correct_answer || null,
                    points: q.points !== undefined ? Number(q.points) : 10,
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

            toast({ title: "Quiz Saved! ✅", description: `Successfully updated ${questions.length} question(s).` });
            fetchQuizData();
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
                    <h1 className="text-2xl font-display font-bold">Edit Quiz: {quiz?.title}</h1>
                    <p className="text-muted-foreground text-sm">Add and configure Multiple Choice (MCQs), Boolean (True/False), and open-ended questions.</p>
                </div>
                <Button onClick={saveQuiz} disabled={saving} className="gap-2 font-bold bg-primary hover:bg-primary/90">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <div className="space-y-6 max-w-4xl mx-auto pb-10">
                {questions.map((q, index) => {
                    const qType = q.type || 'mcq';
                    const isOptionsType = qType === 'mcq' || qType === 'boolean';

                    return (
                        <Card key={q.id || index} className="relative overflow-hidden border">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-start gap-4">
                                    <span className="font-mono text-xl font-bold text-muted-foreground/50">#{index + 1}</span>
                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                            <div className="md:col-span-7">
                                                <Label className="text-xs font-bold">Question Text</Label>
                                                <Input
                                                    className="mt-1"
                                                    placeholder="e.g., Which prompt gives the clearest task?"
                                                    value={q.question_text}
                                                    onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <Label className="text-xs font-bold">Question Type</Label>
                                                <Select
                                                    value={qType}
                                                    onValueChange={(val) => handleQuestionChange(index, 'type', val)}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                                                        <SelectItem value="boolean">True / False (Boolean)</SelectItem>
                                                        <SelectItem value="short">Short Answer</SelectItem>
                                                        <SelectItem value="long">Long Answer / Essay</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="md:col-span-2">
                                                <Label className="text-xs font-bold">Points</Label>
                                                <Input
                                                    type="number"
                                                    className="mt-1 font-mono"
                                                    value={q.points !== undefined ? q.points : 10}
                                                    onChange={(e) => handleQuestionChange(index, 'points', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>

                                        {isOptionsType && (
                                            <div className="pl-4 border-l-2 border-primary/20 space-y-3 bg-muted/20 p-3 rounded-r-xl">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                                        {qType === 'boolean' ? 'True / False Options (Select Correct Answer)' : 'Answer Options (Select Radio for Correct Answer)'}
                                                    </Label>
                                                    {qType === 'mcq' && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleAddOption(index)}
                                                            className="text-xs h-7 text-primary hover:text-primary/80 gap-1 font-semibold"
                                                        >
                                                            <Plus className="h-3 w-3" /> Add Option
                                                        </Button>
                                                    )}
                                                </div>

                                                <RadioGroup
                                                    value={q.correct_answer}
                                                    onValueChange={(val) => handleQuestionChange(index, 'correct_answer', val)}
                                                    className="space-y-2"
                                                >
                                                    {(q.options || (qType === 'boolean' ? ["True", "False"] : ["Option 1", "Option 2"])).map((opt: string, optIdx: number) => (
                                                        <div key={optIdx} className="flex items-center gap-2">
                                                            <RadioGroupItem value={opt} id={`q${index}-opt${optIdx}`} />
                                                            <Input
                                                                value={opt}
                                                                readOnly={qType === 'boolean'}
                                                                onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                                                                className={`h-9 flex-1 ${q.correct_answer === opt ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-500/5' : ''}`}
                                                            />
                                                            {q.correct_answer === opt && <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                            {qType === 'mcq' && (q.options?.length || 0) > 2 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveOption(index, optIdx)}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                                    title="Remove option"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>
                                        )}

                                        {!isOptionsType && (
                                            <div className="pl-4 border-l-2 border-muted space-y-2">
                                                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Sample / Correct Solution (Optional)</Label>
                                                <Input
                                                    placeholder="Expected answer or grading rubric guidelines..."
                                                    value={q.correct_answer || ''}
                                                    onChange={(e) => handleQuestionChange(index, 'correct_answer', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveQuestion(q.id, index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                <Button onClick={handleAddQuestion} variant="outline" className="w-full py-6 border-dashed gap-2 hover:bg-muted/50 font-bold">
                    <Plus className="h-4 w-4" /> Add Question (MCQ / True-False)
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
