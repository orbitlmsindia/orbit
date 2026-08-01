import { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { StudentReportCardModal } from "@/components/reports/StudentReportCardModal";
import { Award, FileText, Printer } from "lucide-react";

export default function StudentGrades() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [currentStudentObj, setCurrentStudentObj] = useState<any>(null);

    useEffect(() => {
        fetchGrades();
    }, []);

    const fetchGrades = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setCurrentStudentObj({
                id: user.id,
                name: user.user_metadata?.full_name || "Student User",
                email: user.email || ""
            });

            // Fetch Enrollments with Course Info
            const { data, error } = await supabase
                .from('enrollments')
                .select(`
                    *,
                    course:courses(title)
                `)
                .eq('student_id', user.id);

            if (error) throw error;
            setEnrollments(data || []);
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load grades." });
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">Academic Grades & Orbit Mission Milestones</h1>
                    <p className="text-muted-foreground mt-1">Inspect your weekly assessment performance, flight progress, quiz scores, and official transcript.</p>
                </div>
                <Button
                    onClick={() => setReportModalOpen(true)}
                    className="gap-2 bg-slate-900 text-white font-bold shrink-0 shadow-md"
                >
                    <Award className="h-4 w-4 text-amber-400" /> View Orbit Academic Transcript & Report Card
                </Button>
            </div>

            <Card className="animate-fade-in delay-75">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead>Quiz Score (40%)</TableHead>
                            <TableHead>Manual Score (60%)</TableHead>
                            <TableHead>Final Score</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrollments.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium text-foreground">
                                    {item.course?.title}
                                </TableCell>
                                <TableCell className="font-mono text-muted-foreground">
                                    {item.quiz_score !== null ? item.quiz_score.toFixed(1) : '-'} / 40
                                </TableCell>
                                <TableCell className="font-mono text-muted-foreground">
                                    {item.manual_score !== null ? item.manual_score.toFixed(1) : '-'} / 60
                                </TableCell>
                                <TableCell className="font-bold font-mono">
                                    {item.final_score !== null ? item.final_score.toFixed(1) : '-'}%
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={item.final_score >= 40 ? "success" : item.final_score > 0 ? "warning" : "secondary"}
                                        className="font-normal text-xs px-2 py-0.5 h-auto"
                                    >
                                        {item.final_score >= 40 ? "Passed" :
                                            item.final_score > 0 ? "In Progress" : "Not Graded"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {enrollments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    You are not enrolled in any courses yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <StudentReportCardModal
                open={reportModalOpen}
                onOpenChange={setReportModalOpen}
                student={currentStudentObj}
            />
        </StudentLayout>
    );
}
