import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
    Plus,
    Video,
    FileText,
    Type,
    MoreVertical,
    Edit2,
    Trash2,
    UploadCloud,
    ChevronLeft,
    Loader2,
    CheckCircle,
    XCircle,
    Download,
    Eye,
    Sparkles
} from "lucide-react";
import { AwardAuraPointsModal, AwardAuraStudent } from "@/components/gamification/AwardAuraPointsModal";
import { StudentAttendanceDossierModal, StudentDossierData } from "@/components/attendance/StudentAttendanceDossierModal";
import { ExamAttendanceSlipModal, ExamSlipData } from "@/components/attendance/ExamAttendanceSlipModal";

export default function AdminCourseDetail() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "curriculum");
    const [sections, setSections] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [auraModalOpen, setAuraModalOpen] = useState(false);
    const [selectedAuraStudent, setSelectedAuraStudent] = useState<AwardAuraStudent | null>(null);
    const [dossierModalOpen, setDossierModalOpen] = useState(false);
    const [selectedDossierData, setSelectedDossierData] = useState<StudentDossierData | null>(null);
    const [examSlipModalOpen, setExamSlipModalOpen] = useState(false);
    const [selectedExamSlipData, setSelectedExamSlipData] = useState<ExamSlipData | null>(null);

    useEffect(() => {
        if (id) fetchCourseData();
    }, [id]);

    const fetchCourseData = async () => {
        setLoading(true);
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('id, title, description, domain, credit_points, is_published, price, original_price, organization_name, is_deletion_requested, deletion_requested_at')
            .eq('id', id)
            .single();

        if (courseError) {
            console.error(courseError);
            toast({ variant: "destructive", title: "Error", description: "Failed to load course" });
            setLoading(false);
            return;
        }

        setCourse({
            ...courseData,
            credit_points: courseData.credit_points !== undefined && courseData.credit_points !== null ? courseData.credit_points : 3
        });

        // Fetch enrollments with student details
        const { data: enrollmentData } = await supabase
            .from('enrollments')
            .select(`
                *,
                student:users!student_id(id, full_name, email, avatar_url, aura_points)
            `)
            .eq('course_id', id);

        if (enrollmentData) {
            setEnrollments(enrollmentData);
        }

        // Fetch sections and content
        const { data: sectionData, error: sectionError } = await supabase
            .from('course_sections')
            .select(`
                id, title, order_index,
                section_contents (id, title, video_url, pdf_url, content_text, order_index)
            `)
            .eq('course_id', id)
            .order('order_index', { ascending: true });

        if (sectionError) console.error(sectionError);

        // Sort contents manually if needed, or rely on fetch order if we add order logic to query
        const sortedSections = sectionData?.map(section => ({
            ...section,
            items: section.section_contents?.sort((a: any, b: any) => a.order_index - b.order_index) || []
        })) || [];

        setSections(sortedSections);
        setLoading(false);
    };

    const handleCreateSection = async (title: string) => {
        const { error } = await supabase
            .from('course_sections')
            .insert([{ course_id: id, title, order_index: sections.length }]);

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Section added" });
            fetchCourseData();
        }
    };

    const handleApproveEnrollment = async (enrollmentId: string) => {
        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ status: 'approved' })
                .eq('id', enrollmentId);

            if (error) throw error;

            try {
                const enrObj = enrollments.find(e => e.id === enrollmentId);
                const studentName = enrObj?.student?.full_name;
                const txnId = enrObj?.transaction_id;

                await supabase
                    .from('notifications')
                    .delete()
                    .eq('enrollment_id', enrollmentId);

                if (studentName) {
                    await supabase
                        .from('notifications')
                        .delete()
                        .eq('course_id', id)
                        .ilike('message', `%${studentName}%`);

                    await supabase
                        .from('notifications')
                        .delete()
                        .ilike('message', `%${studentName}%`)
                        .eq('notification_type', 'enrollment');
                }

                if (txnId) {
                    await supabase
                        .from('notifications')
                        .delete()
                        .ilike('message', `%${txnId}%`)
                        .eq('notification_type', 'enrollment');
                }

                const studentId = enrObj?.student_id || enrObj?.student?.id;
                if (studentId) {
                    await supabase.from('notifications').insert([{
                        user_id: studentId,
                        title: "Enrollment Approved! 🎉",
                        message: `Congratulations! Your enrollment in "${course?.title || 'the course'}" has been approved by the administration. You now have full access to curriculum and calendar schedules.`,
                        notification_type: "enrollment_approved",
                        sender_role: "admin",
                        course_id: id,
                        is_read: false
                    }]);
                }
            } catch (e) {}

            toast({ title: "Enrollment Approved ✅", description: "The student now has access to the course." });
            fetchCourseData(); // Refresh list
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to approve enrollment." });
        }
    };

    const handleDeclineEnrollment = async (enrollmentId: string) => {
        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ status: 'rejected' })
                .eq('id', enrollmentId);

            if (error) throw error;

            try {
                await supabase
                    .from('notifications')
                    .delete()
                    .eq('enrollment_id', enrollmentId);
            } catch (e) {}

            toast({ title: "Enrollment Declined", description: "The student's enrollment request has been declined." });
            fetchCourseData(); // Refresh list
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to decline enrollment." });
        }
    };

    const handleDeleteEnrollment = async (enrollmentId: string) => {
        if (!confirm("Are you sure you want to remove this student from the course?")) return;

        try {
            const { error } = await supabase
                .from('enrollments')
                .delete()
                .eq('id', enrollmentId);

            if (error) throw error;

            toast({ title: "Student Removed", description: "The student has been removed from this course." });
            fetchCourseData(); // Refresh list
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to remove student." });
        }
    };

    const exportToCSV = () => {
        if (!enrollments.length) {
            toast({ description: "No students to export." });
            return;
        }

        const csvRows = [];
        const headers = ["Student Name", "Email", "Course Enrolled", "Date of Request", "UPI / Transaction ID", "Status"];
        csvRows.push(headers.join(','));

        enrollments.forEach(enrollment => {
            const row = [
                `"${(enrollment.student?.full_name || 'Unknown Student').replace(/"/g, '""')}"`,
                `"${(enrollment.student?.email || 'N/A').replace(/"/g, '""')}"`,
                `"${(course?.title || 'Unknown Course').replace(/"/g, '""')}"`,
                `"${new Date(enrollment.enrolled_at).toLocaleDateString()}"`,
                `"${(enrollment.transaction_id || 'N/A').replace(/"/g, '""')}"`,
                `"${enrollment.status}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvData = csvRows.join('\n');
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${(course?.title || 'course').replace(/\s+/g, '_')}_enrollments.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const [savingSettings, setSavingSettings] = useState(false);

    const handleSaveCourseSettings = async () => {
        if (!course || !id) return;
        setSavingSettings(true);
        try {
            const { error } = await supabase
                .from('courses')
                .update({
                    title: course.title,
                    description: course.description,
                    domain: course.domain || "Software Engineering",
                    credit_points: parseInt(course.credit_points) || 3,
                })
                .eq('id', id);

            if (error) throw error;
            toast({
                title: "Course Settings Saved! ✅",
                description: `Updated details and set Academic Credits to ${course.credit_points || 3} Credits.`
            });
            fetchCourseData();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Update Failed", description: err.message });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleDeleteCourseAdmin = async () => {
        if (!confirm(`Are you sure you want to permanently delete "${course.title}"?\n\nAs Admin, this will immediately delete the course and all associated data.`)) return;

        try {
            const { error } = await supabase.from('courses').delete().eq('id', id);
            if (error) throw error;

            toast({ title: "Course Permanently Deleted by Admin 🗑️" });
            navigate('/admin/courses');
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleApproveDeletion = async () => {
        if (!confirm(`Approve deletion request for "${course.title}"?\n\nThis will permanently delete the course.`)) return;

        try {
            const { error } = await supabase.from('courses').delete().eq('id', id);
            if (error) throw error;

            toast({ title: "Deletion Approved & Course Removed 🗑️" });
            navigate('/admin/courses');
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleRejectDeletion = async () => {
        try {
            const { error } = await supabase.from('courses').update({
                is_deletion_requested: false,
                deletion_requested_at: null
            }).eq('id', id);
            if (error) throw error;

            toast({ title: "Deletion Request Rejected", description: "The course remains active." });
            setCourse((prev: any) => ({ ...prev, is_deletion_requested: false, deletion_requested_at: null }));
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    if (loading) return <AdminLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div></AdminLayout>;

    return (
        <AdminLayout>
            {course.is_deletion_requested && (
                <div className="mx-6 mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        <div>
                            <p className="font-bold text-sm text-amber-600 dark:text-amber-400">Teacher Requested Course Deletion ⚠️</p>
                            <p className="text-xs text-muted-foreground">The instructor submitted a request to delete this course. Approve to delete permanently or reject to keep active.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleApproveDeletion}>
                            Approve & Delete 🗑️
                        </Button>
                        <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400" onClick={handleRejectDeletion}>
                            Reject Request
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 mb-6 animate-fade-in p-6 pb-0">
                <Link to="/admin/courses">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-display font-bold">{course.title}</h1>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 font-mono font-bold text-xs">
                            🎓 {course.credit_points || 3} Credits
                        </Badge>
                        {course.is_deletion_requested && (
                            <Badge className="bg-amber-500 text-slate-900 font-bold">Deletion Requested ⚠️</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">{course.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link to={`/student/courses/${id}/learn`} target="_blank">
                        <Button variant="secondary" className="gap-1.5 font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 shadow-xs">
                            <Eye className="h-4 w-4" /> Preview Student View ↗
                        </Button>
                    </Link>
                    <Button variant="destructive" className="gap-1.5 font-bold" onClick={handleDeleteCourseAdmin}>
                        <Trash2 className="h-4 w-4" /> Delete Course (Admin)
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in delay-75 p-6 pt-0">
                <TabsList className="mb-6">
                    <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                    <TabsTrigger value="overview">Details</TabsTrigger>
                    <TabsTrigger value="students">Enrolled Students</TabsTrigger>
                </TabsList>

                <TabsContent value="curriculum" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Modules & Content</h2>
                        <AddSectionDialog onCreate={handleCreateSection} />
                    </div>

                    <Accordion type="multiple" className="space-y-4">
                        {sections.map((section) => (
                            <AccordionItem key={section.id} value={section.id} className="border rounded-xl bg-card px-4">
                                <div className="flex items-center py-4">
                                    <AccordionTrigger className="hover:no-underline flex-1 py-0">
                                        <span className="font-semibold text-lg">{section.title}</span>
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2 ml-4">
                                        <AddContentDialog sectionId={section.id} onAdded={fetchCourseData} />
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <AccordionContent className="pt-2 pb-4 space-y-2">
                                    {section.items.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded bg-background flex items-center justify-center border text-muted-foreground">
                                                    {item.video_url && <Video className="h-4 w-4 text-blue-500" />}
                                                    {item.pdf_url && <FileText className="h-4 w-4 text-red-500" />}
                                                    {item.content_text && <Type className="h-4 w-4 text-green-500" />}
                                                    {!item.video_url && !item.pdf_url && !item.content_text && <FileText className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{item.title}</p>
                                                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                                                        {item.video_url && <span className="flex items-center gap-0.5"><Video className="h-3 w-3" /> Video</span>}
                                                        {item.pdf_url && <span className="flex items-center gap-0.5"><FileText className="h-3 w-3" /> PDF</span>}
                                                        {item.content_text && <span className="flex items-center gap-0.5"><Type className="h-3 w-3" /> Text</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {section.items.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                            No content. Add lessons.
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </TabsContent>

                <TabsContent value="overview">
                    <Card className="border border-border shadow-xs">
                        <CardContent className="pt-6 space-y-5">
                            <div className="flex items-center justify-between pb-2 border-b">
                                <div>
                                    <h3 className="font-bold text-base text-foreground">Course Configuration & Academic Settings</h3>
                                    <p className="text-xs text-muted-foreground">Admin can override course title, category domain, and academic credit point values.</p>
                                </div>
                                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 font-mono font-bold text-xs">
                                    Current: {course.credit_points || 3} Credits
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Course Title</Label>
                                    <Input
                                        value={course.title || ""}
                                        onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                        placeholder="Course Title"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Domain / Category</Label>
                                    <Input
                                        value={course.domain || "Software Engineering"}
                                        onChange={(e) => setCourse({ ...course, domain: e.target.value })}
                                        placeholder="e.g. Software Engineering, Data Science & AI"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                                        🎓 Academic Credit Points (Credits)
                                    </Label>
                                    <Input
                                        type="number"
                                        value={course.credit_points !== undefined && course.credit_points !== null ? course.credit_points : 3}
                                        onChange={(e) => setCourse({ ...course, credit_points: parseInt(e.target.value) || 0 })}
                                        placeholder="3"
                                        min="1"
                                        max="30"
                                        className="font-bold font-mono"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Number of academic credits awarded upon completion (e.g. 3, 4, 5 credits).
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Course Pricing (₹ INR)</Label>
                                    <Input
                                        type="number"
                                        value={course.price || 0}
                                        onChange={(e) => setCourse({ ...course, price: parseFloat(e.target.value) || 0 })}
                                        placeholder="1499"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Description</Label>
                                <Textarea
                                    className="min-h-[120px] text-sm"
                                    value={course.description || ""}
                                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                    placeholder="Comprehensive course description..."
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={handleSaveCourseSettings}
                                    disabled={savingSettings}
                                    className="gap-2 font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                                >
                                    {savingSettings ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4" /> Save Course Settings & Credits (Admin)
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="students">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                        <h2 className="text-xl font-bold">Student Enrollments</h2>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    const firstApproved = enrollments.find((e: any) => e.status === "approved");
                                    if (firstApproved) {
                                        setSelectedAuraStudent({
                                            id: firstApproved.student?.id || firstApproved.student_id,
                                            full_name: firstApproved.student?.full_name,
                                            email: firstApproved.student?.email,
                                            avatar_url: firstApproved.student?.avatar_url,
                                            aura_points: firstApproved.student?.aura_points || 0
                                        });
                                        setAuraModalOpen(true);
                                    } else {
                                        toast({ title: "No Approved Students", description: "Approve student enrollments first to award Aura points." });
                                    }
                                }} 
                                className="gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold"
                            >
                                <Sparkles className="h-4 w-4 text-amber-500" /> Award Course Aura ✨
                            </Button>
                            <Button variant="outline" onClick={exportToCSV} className="gap-2">
                                <Download className="h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {enrollments.length > 0 ? (
                            enrollments.map((enrollment: any) => (
                                <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                                            {enrollment.student?.avatar_url ? (
                                                <img src={enrollment.student.avatar_url} alt={enrollment.student.full_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-primary">{enrollment.student?.full_name?.[0] || "?"}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{enrollment.student?.full_name || "Unknown Student"}</p>
                                            <p className="text-sm text-muted-foreground">{enrollment.student?.email}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {enrollment.transaction_id && (
                                                    <p className="text-xs font-mono bg-muted px-2 py-0.5 rounded inline-block">
                                                        UPI/Txn: <span className="font-bold text-foreground">{enrollment.transaction_id}</span>
                                                    </p>
                                                )}
                                                <Badge variant="outline" className="text-amber-500 border-amber-500/40 bg-amber-500/10 font-mono text-[11px] font-bold gap-1 py-0.5">
                                                    <Sparkles className="h-3 w-3" /> {enrollment.student?.aura_points || 0} XP
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center justify-end gap-2.5">
                                        {enrollment.status === 'pending' ? (
                                            <>
                                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Pending</Badge>
                                                <Button size="sm" onClick={() => handleApproveEnrollment(enrollment.id)} className="gap-2">
                                                    <CheckCircle className="h-4 w-4" /> Approve
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDeclineEnrollment(enrollment.id)} className="gap-2">
                                                    <XCircle className="h-4 w-4" /> Decline
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Badge variant={enrollment.status === 'rejected' ? "destructive" : (enrollment.completed ? "success" : "default")} className={enrollment.status === 'rejected' ? "bg-red-500/10 text-red-600 hover:bg-red-500/20" : "bg-green-500/10 text-green-600 hover:bg-green-500/20"}>
                                                    {enrollment.status === 'rejected' ? "Declined" : (enrollment.completed ? "Completed" : "Active")}
                                                </Badge>
                                                {enrollment.status !== 'rejected' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedDossierData({
                                                                    studentId: enrollment.student?.id || enrollment.student_id,
                                                                    studentName: enrollment.student?.full_name || "Student",
                                                                    studentEmail: enrollment.student?.email || "",
                                                                    studentAvatar: enrollment.student?.avatar_url,
                                                                    courseId: course?.id,
                                                                    courseTitle: course?.title || "Course",
                                                                    mentorName: course?.teacher?.full_name || "Course Mentor",
                                                                    collegeName: course?.organization_name || "Orbit Institute",
                                                                    parentName: `Parent / Guardian of ${enrollment.student?.full_name || 'Student'}`
                                                                });
                                                                setDossierModalOpen(true);
                                                            }}
                                                            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs"
                                                            title="Export Attendance Dossier for Student & Parent"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" /> Dossier 📋
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedExamSlipData({
                                                                    studentId: enrollment.student?.id || enrollment.student_id,
                                                                    studentName: enrollment.student?.full_name || "Student",
                                                                    studentEmail: enrollment.student?.email || "",
                                                                    avatarUrl: enrollment.student?.avatar_url,
                                                                    courseId: course?.id,
                                                                    courseTitle: course?.title || "Course",
                                                                    mentorName: course?.teacher?.full_name || "Course Mentor",
                                                                    collegeName: course?.organization_name || "Orbit Institute"
                                                                });
                                                                setExamSlipModalOpen(true);
                                                            }}
                                                            className="gap-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-bold text-xs"
                                                            title="Issue Examination Admit Slip & Attendance Clearance"
                                                        >
                                                            <span>Admit Slip 🎫</span>
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedAuraStudent({
                                                                    id: enrollment.student?.id || enrollment.student_id,
                                                                    full_name: enrollment.student?.full_name,
                                                                    email: enrollment.student?.email,
                                                                    avatar_url: enrollment.student?.avatar_url,
                                                                    aura_points: enrollment.student?.aura_points || 0
                                                                });
                                                                setAuraModalOpen(true);
                                                            }}
                                                            className="gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs"
                                                            title="Award Aura Points (Admin)"
                                                        >
                                                            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Award Aura ✨
                                                        </Button>
                                                    </>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-1" onClick={() => handleDeleteEnrollment(enrollment.id)} title="Remove Student">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        <div className="flex flex-col ml-2">
                                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                                Requested: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                No students enrolled yet.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ✨ Gamified Award Aura Points Modal (Admin) */}
            <AwardAuraPointsModal
                open={auraModalOpen}
                onOpenChange={setAuraModalOpen}
                student={selectedAuraStudent}
                course={course ? { id: course.id, title: course.title, domain: course.domain } : null}
                onSuccess={fetchCourseData}
            />

            {/* 📋 Official Student & Parent Attendance Dossier Modal */}
            <StudentAttendanceDossierModal
                open={dossierModalOpen}
                onOpenChange={setDossierModalOpen}
                dossierData={selectedDossierData}
                userRole="admin"
            />

            {/* 🎫 Official Examination Hall Ticket & Attendance Clearance Slip Modal */}
            <ExamAttendanceSlipModal
                open={examSlipModalOpen}
                onOpenChange={setExamSlipModalOpen}
                slipData={selectedExamSlipData}
                userRole="admin"
            />
        </AdminLayout>
    );
}

function AddSectionDialog({ onCreate }: { onCreate: (title: string) => void }) {
    const [title, setTitle] = useState("");
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Module</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Module</DialogTitle></DialogHeader>
                <div className="py-4">
                    <Label>Module Title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction" />
                </div>
                <DialogFooter>
                    <Button onClick={() => { onCreate(title); setOpen(false); setTitle(""); }}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddContentDialog({ sectionId, onAdded }: { sectionId: string, onAdded: () => void }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    // Unified state
    const [title, setTitle] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [pdfUrl, setPdfUrl] = useState("");
    const [textContent, setTextContent] = useState("");

    // Upload state
    const [docType, setDocType] = useState<"link" | "upload">("upload");
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course_content')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('course_content')
                .getPublicUrl(filePath);

            setPdfUrl(data.publicUrl);
            toast({ title: "File uploaded successfully" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Upload failed", description: error.message });
        } finally {
            setUploading(false);
        }
    };

    const handleAdd = async () => {
        if (!title) {
            toast({ variant: "destructive", title: "Error", description: "Title is required" });
            return;
        }

        const { error } = await supabase.from('section_contents').insert([{
            section_id: sectionId,
            title,
            type: 'text', // Use a valid ENUM value as placeholder
            video_url: videoUrl || null,
            pdf_url: pdfUrl || null,
            content_text: textContent || null
        }]);

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Lesson added successfully" });
            setOpen(false);
            onAdded();
            // Reset
            setTitle("");
            setVideoUrl("");
            setPdfUrl("");
            setTextContent("");
            setDocType("upload");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2"><Plus className="h-3 w-3" /> Add Lesson</Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>Add Lesson Content</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label>Lesson Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Part 1: Basics" />
                    </div>

                    <div className="space-y-2">
                        <Label>Video URL (YouTube)</Label>
                        <div className="flex gap-2">
                            <Video className="w-4 h-4 mt-3 text-muted-foreground" />
                            <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Document (PDF / PPT)</Label>
                        <Tabs value={docType} onValueChange={(v: any) => setDocType(v)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-8 mb-2">
                                <TabsTrigger value="upload" className="text-xs">Upload File</TabsTrigger>
                                <TabsTrigger value="link" className="text-xs">External Link</TabsTrigger>
                            </TabsList>
                            <TabsContent value="upload" className="mt-0">
                                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-sm text-muted-foreground">Uploading...</p>
                                        </div>
                                    ) : pdfUrl && pdfUrl.includes("supabase") ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="h-8 w-8 text-green-500" />
                                            <p className="text-sm font-medium text-green-600">File Uploaded</p>
                                            <Button variant="ghost" size="sm" onClick={() => setPdfUrl("")} className="h-6 text-xs text-destructive">Remove</Button>
                                        </div>
                                    ) : (
                                        <div className="w-full">
                                            <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2 w-full">
                                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-sm font-medium">Click to upload PDF or PPT</span>
                                                <span className="text-xs text-muted-foreground">Max 10MB</span>
                                            </Label>
                                            <Input
                                                id="file-upload"
                                                type="file"
                                                accept=".pdf,.ppt,.pptx"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="link" className="mt-0">
                                <div className="flex gap-2">
                                    <FileText className="w-4 h-4 mt-3 text-muted-foreground" />
                                    <Input value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="https://..." />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="space-y-2">
                        <Label>Text Content</Label>
                        <Textarea
                            value={textContent}
                            onChange={e => setTextContent(e.target.value)}
                            rows={6}
                            placeholder="Reading material for this lesson..."
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={uploading}>Save Lesson</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
