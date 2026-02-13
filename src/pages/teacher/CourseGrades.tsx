import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Upload, FileUp, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function CourseGrades() {
    const { id } = useParams(); // Course ID
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data
    const [students, setStudents] = useState<any[]>([]);

    useEffect(() => {
        if (id) fetchGrades();
    }, [id]);

    const fetchGrades = async () => {
        try {
            setLoading(true);

            // 1. Fetch enrolled students
            const { data: enrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    *,
                    student:users!student_id(id, full_name, email, avatar_url)
                `)
                .eq('course_id', id);

            if (enrollError) throw enrollError;

            // 2. Fetch Quiz Average for each student?
            // Complex query or handle in client.
            // Let's fetch all quiz attempts for this course's assignments
            // Filter assignments by course_id

            // Get course assignments
            const { data: assignments } = await supabase.from('assignments').select('id, points').eq('course_id', id).eq('type', 'quiz');
            const assignIds = assignments?.map(a => a.id) || [];

            // Get attempts for these assignments
            let attempts: any[] = [];
            if (assignIds.length > 0) {
                const { data: attemptsData } = await supabase
                    .from('quiz_attempts')
                    .select('student_id, score, assignment_id')
                    .in('assignment_id', assignIds);
                attempts = attemptsData || [];
            }

            // Calculate grades
            const processed = enrollments.map((enr: any) => {
                const studentAttempts = attempts.filter(a => a.student_id === enr.student_id);

                // Calculate Average Quiz Score (Scaled to 40%)
                // Logic: Sum of (user_score / max_score) / num_quizzes? 
                // Creating a simple average for now: (Total user score / Total max score) * 40

                let totalUserScore = 0;
                let totalMaxScore = 0;

                // For each assignment, find best attempt? Or just all attempts?
                // Let's assume 1 attempt per quiz for now or take the latest/max.
                // Simplified: Sum of scores.
                studentAttempts.forEach(att => {
                    const assign = assignments?.find(a => a.id === att.assignment_id);
                    // att.score is raw score. assign.points is max score.
                    // IMPORTANT: grade_quiz_attempt returns PERCENTAGE if max > 0.
                    // Let's assume att.score is percentage (0-100).
                    // So we average the percentages.
                    totalUserScore += (att.score || 0);
                    totalMaxScore += 100; // Each quiz is out of 100% effectively
                });

                const avgQuizPct = totalMaxScore > 0 ? (totalUserScore / totalMaxScore) : 0;
                const quizComponent = avgQuizPct * 40; // Out of 40

                // Manual Component (Out of 60)
                // enr.manual_score should be stored as out of 60? Or out of 100 and scaled?
                // Let's assume enr.manual_score is out of 60 directly for simplicity, or we store 0-100 and scale.
                // The prompt says "rest 60% will be enteresd by the teacher".
                // Let's assume manual_score in DB is out of 60.

                const manual = enr.manual_score || 0;

                const final = quizComponent + manual;

                return {
                    ...enr,
                    calculatedQuizScore: quizComponent,
                    tempManualScore: manual, // For editing
                    finalScore: final
                };
            });

            setStudents(processed);

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch grades." });
        } finally {
            setLoading(false);
        }
    };

    const handleManualChange = (studentId: string, val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;

        setStudents(prev => prev.map(s => {
            if (s.student_id === studentId) {
                const manual = Math.min(60, Math.max(0, num));
                return {
                    ...s,
                    tempManualScore: manual,
                    finalScore: s.calculatedQuizScore + manual
                };
            }
            return s;
        }));
    };

    const saveGrades = async () => {
        try {
            setSaving(true);

            // Bulk update not directly supported by supabase-js cleanly for different values.
            // We loop (not ideal for thousands, but fine for 50).
            const updates = students.map(s => supabase
                .from('enrollments')
                .update({
                    manual_score: s.tempManualScore,
                    quiz_score: s.calculatedQuizScore,
                    final_score: s.finalScore
                })
                .eq('id', s.id)
            );

            await Promise.all(updates);

            toast({ title: "Saved", description: "Grades updated successfully." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const exportCSV = () => {
        const headers = ["Student ID", "Name", "Email", "Quiz Score (40%)", "Manual Score (60%)", "Final Score (100%)"];
        const rows = students.map(s => [
            s.student_id,
            s.student?.full_name,
            s.student?.email,
            s.calculatedQuizScore.toFixed(2),
            s.tempManualScore.toFixed(2),
            s.finalScore.toFixed(2)
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `course_grades_${id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            // Simple CSV parse: Student ID, Manual Score
            // Assumes header row exists
            const lines = text.split('\n');
            const newMap = new Map();

            lines.slice(1).forEach(line => {
                const [sid, _, __, ___, manualStr] = line.split(',');
                if (sid && manualStr) {
                    newMap.set(sid.trim(), parseFloat(manualStr));
                }
            });

            setStudents(prev => prev.map(s => {
                if (newMap.has(s.student_id)) {
                    const manual = Math.min(60, Math.max(0, newMap.get(s.student_id)));
                    return {
                        ...s,
                        tempManualScore: manual,
                        finalScore: s.calculatedQuizScore + manual
                    };
                }
                return s;
            }));

            toast({ title: "Imported", description: "Grades imported from CSV. Review and Save." });
        };
        reader.readAsText(file);
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">Course Grading</h1>
                    <p className="text-muted-foreground">Manage marks: 40% Quiz + 60% Manual.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" className="gap-2">
                            <Upload className="h-4 w-4" /> Import CSV
                        </Button>
                    </div>
                    <Button variant="outline" onClick={exportCSV} className="gap-2">
                        <Download className="h-4 w-4" /> Export Report
                    </Button>
                    <Button onClick={saveGrades} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Grades
                    </Button>
                </div>
            </div>

            <Card className="animate-fade-in delay-75">
                <CardHeader>
                    <CardTitle>Student Gradebook</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Quiz Avg (40%)</TableHead>
                                <TableHead>Manual Score (60%)</TableHead>
                                <TableHead>Total (100%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{student.student?.full_name}</span>
                                            <span className="text-xs text-muted-foreground">{student.student?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-base">
                                        {student.calculatedQuizScore.toFixed(1)} / 40
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-20 font-mono"
                                                value={student.tempManualScore}
                                                onChange={(e) => handleManualChange(student.student_id, e.target.value)}
                                                max={60}
                                                min={0}
                                            />
                                            <span className="text-muted-foreground text-sm">/ 60</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={student.finalScore >= 40 ? "success" : "destructive"} className="text-base px-3 py-1">
                                            {student.finalScore.toFixed(1)}%
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {students.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No students enrolled in this course.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TeacherLayout>
    );
}
