import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Clock,
    AlertTriangle,
    Layers,
    FileSpreadsheet,
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
    BrainCircuit,
    CheckCircle,
    XCircle,
    Download,
    ShieldCheck,
    Sparkles,
    Upload,
    Play,
    Search,
    Filter,
    Calendar,
    CheckSquare,
    Square,
    Check,
    Pencil,
    Eye,
    Users,
    X
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { isGoogleDriveUrl, getGoogleDriveEmbedUrl } from "@/lib/googleDriveUtils";
import {
    importSectionsToExistingCourse,
    validateCourseJson,
    SAMPLE_COURSE_JSON
} from "@/lib/courseJsonImporter";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import { FileJson, Award, UserPlus } from "lucide-react";
import { BulkLiveClassImporterModal } from "@/components/live/BulkLiveClassImporterModal";
import { BulkStudentCreatorModal } from "@/components/teacher/BulkStudentCreatorModal";
import { ExamPaperDesignerModal } from "@/components/reports/ExamPaperDesignerModal";

export default function CourseDetail() {
    const { id } = useParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("curriculum");

    // Add Section / Module State
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [addSectionOpen, setAddSectionOpen] = useState(false);
    const [structuringApproach, setStructuringApproach] = useState<"weekly" | "section">("weekly");
    const [weekNumber, setWeekNumber] = useState<number>(1);
    const [allocatedHours, setAllocatedHours] = useState<string>("4.0");
    const [topicName, setTopicName] = useState<string>("");

    // Edit Section & Item State
    const [editingSection, setEditingSection] = useState<{ id: string; title: string } | null>(null);
    const [editingItem, setEditingItem] = useState<any | null>(null);

    // Student Verification Filtering & Selection State
    const [studentSearch, setStudentSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
    const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
    const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);

    // Live Classes State
    const [liveClasses, setLiveClasses] = useState<any[]>([]);
    const [addLiveOpen, setAddLiveOpen] = useState(false);
    const [bulkLiveOpen, setBulkLiveOpen] = useState(false);
    const [liveTitle, setLiveTitle] = useState("");
    const [liveMeetingLink, setLiveMeetingLink] = useState("");
    const [liveScheduledAt, setLiveScheduledAt] = useState("");
    const [liveDuration, setLiveDuration] = useState("60");
    const [liveDescription, setLiveDescription] = useState("");
    const [editingLiveClass, setEditingLiveClass] = useState<any | null>(null);

    // Collaborators State
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [collaboratorEmail, setCollaboratorEmail] = useState("");

    // Bulk Student Creator State
    const [bulkStudentOpen, setBulkStudentOpen] = useState(false);
    const [examDesignerOpen, setExamDesignerOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchCourseDetails();
            fetchLiveClasses();
            fetchCollaborators();
        }
    }, [id]);

    const fetchCollaborators = async () => {
        if (!id) return;
        const { data } = await supabase
            .from('course_collaborators')
            .select('*, teacher:users!teacher_id(full_name, email)')
            .eq('course_id', id);
        setCollaborators(data || []);
    };

    const handleAddCollaborator = async () => {
        if (!collaboratorEmail.trim()) {
            toast({ variant: "destructive", title: "Error", description: "Please enter a teacher's email address." });
            return;
        }

        try {
            const { data: userProfile } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('email', collaboratorEmail.trim().toLowerCase())
                .maybeSingle();

            if (!userProfile) {
                toast({ variant: "destructive", title: "User Not Found", description: "No registered user found with this email address." });
                return;
            }

            const { error } = await supabase
                .from('course_collaborators')
                .insert([{ course_id: id, teacher_id: userProfile.id, role: 'co-teacher' }]);

            if (error) throw error;

            toast({ title: "Co-Teacher Invited! 🤝", description: `${userProfile.full_name || userProfile.email} can now edit this course.` });
            setCollaboratorEmail("");
            fetchCollaborators();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleRemoveCollaborator = async (collabId: string) => {
        const { error } = await supabase.from('course_collaborators').delete().eq('id', collabId);
        if (!error) {
            toast({ title: "Access Revoked", description: "Co-teacher access removed." });
            fetchCollaborators();
        }
    };

    const fetchLiveClasses = async () => {
        if (!id) return;
        const { data } = await supabase
            .from('live_classes')
            .select('*')
            .eq('course_id', id)
            .order('scheduled_at', { ascending: true });
        setLiveClasses(data || []);
    };

    const [selectedSectionForLive, setSelectedSectionForLive] = useState<string>("");

    const handleAddLiveClass = async () => {
        if (!liveTitle || !liveMeetingLink || !liveScheduledAt) {
            toast({ variant: "destructive", title: "Missing Fields", description: "Title, Meeting URL, and Date/Time are required." });
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const durationMins = parseInt(liveDuration) || 60;
            const { data: liveData, error } = await supabase.from('live_classes').insert([{
                course_id: id,
                section_id: selectedSectionForLive || null,
                teacher_id: user?.id,
                title: liveTitle,
                meeting_link: liveMeetingLink,
                scheduled_at: new Date(liveScheduledAt).toISOString(),
                duration_minutes: durationMins,
                description: liveDescription,
                status: 'upcoming'
            }]).select('id').single();

            if (error) throw error;

            if (selectedSectionForLive && liveData) {
                await supabase.from('section_contents').insert([{
                    section_id: selectedSectionForLive,
                    title: `🔴 ${liveTitle}`,
                    type: 'video',
                    content_url: liveMeetingLink,
                    video_url: liveMeetingLink,
                    duration_minutes: durationMins,
                    live_class_id: liveData.id
                }]);
            }

            // Sync to calendar_events (visible to Teacher, Admin, and Students)
            await supabase.from('calendar_events').insert([{
                title: `🔴 Live Class: ${liveTitle}`,
                description: `Meeting Link: ${liveMeetingLink}${liveDescription ? " - " + liveDescription : ""}`,
                event_date: new Date(liveScheduledAt).toISOString(),
                type: 'live_class',
                visibility: 'all',
                course_id: id
            }]);

            toast({ title: "Live Class Scheduled & Mapped! 🔴", description: selectedSectionForLive ? "Mapped to selected module section." : "Scheduled as standalone live session." });
            setAddLiveOpen(false);
            setLiveTitle("");
            setLiveMeetingLink("");
            setLiveScheduledAt("");
            setLiveDescription("");
            setSelectedSectionForLive("");
            fetchLiveClasses();
            fetchSections();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleDeleteLiveClass = async (liveId: string) => {
        const { error } = await supabase.from('live_classes').delete().eq('id', liveId);
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Deleted", description: "Live class removed." });
            fetchLiveClasses();
        }
    };

    const handleEditLiveClass = async (updatedData: { title: string; meeting_link: string; scheduled_at: string; duration_minutes: number; description: string }) => {
        if (!editingLiveClass) return;
        try {
            const oldScheduledAt = editingLiveClass.scheduled_at;
            const oldMeetingLink = editingLiveClass.meeting_link;

            const { error } = await supabase.from('live_classes').update({
                title: updatedData.title,
                meeting_link: updatedData.meeting_link,
                scheduled_at: new Date(updatedData.scheduled_at).toISOString(),
                duration_minutes: updatedData.duration_minutes,
                description: updatedData.description
            }).eq('id', editingLiveClass.id);

            if (error) throw error;

            // Check if timing or link changed - send urgent notification
            const timeChanged = new Date(oldScheduledAt).getTime() !== new Date(updatedData.scheduled_at).getTime();
            const linkChanged = oldMeetingLink !== updatedData.meeting_link;

            if (timeChanged || linkChanged) {
                const changes: string[] = [];
                if (timeChanged) changes.push(`New Time: ${new Date(updatedData.scheduled_at).toLocaleString()}`);
                if (linkChanged) changes.push(`New Link: ${updatedData.meeting_link}`);

                await supabase.rpc('x_n_c_s', {
                    p_course_id: id,
                    p_title: `🚨 URGENT: Live Class "${updatedData.title}" Updated!`,
                    p_message: `The live class has been rescheduled. ${changes.join(' | ')}. Please check the updated schedule.`,
                    p_notification_type: 'urgent_live_update',
                    p_priority: 10
                });
            }

            toast({ title: "Live Class Updated! ✅", description: timeChanged || linkChanged ? "Urgent notification sent to all enrolled students." : "Details updated." });
            setEditingLiveClass(null);
            fetchLiveClasses();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const fetchCourseDetails = async () => {
        try {
            setLoading(true);
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('id, title, description, is_published, thumbnail_url, min_watch_percent, credit_points, domain, objectives, instructions, instructor_intro, exam_policy, instructor, instructor_organization, partner_organizations, teacher_id, is_deletion_requested, deletion_requested_at, price, original_price, currency, organization_name, organization_logo_url')
                .eq('id', id)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);

            await fetchSections();

            // Fetch enrollments with student details
            const { data: enrollmentData } = await supabase
                .from('enrollments')
                .select(`
                    id, transaction_id, status, completed, enrolled_at,
                    student:users!student_id(full_name, email, avatar_url)
                `)
                .eq('course_id', id);

            if (enrollmentData) {
                setEnrollments(enrollmentData);
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load course details." });
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async () => {
        try {
            // 1. Fetch course_sections with section_contents
            let { data: sectionsData, error: sectionsError } = await supabase
                .from('course_sections')
                .select(`
                    id, title, order_index, week_number, allocated_hours, topic_name,
                    items:section_contents(id, title, type, video_url, pdf_url, content_url, content_text, min_watch_percent, duration_minutes, order_index, created_at)
                `)
                .eq('course_id', id)
                .order('order_index', { ascending: true });

            if (sectionsError) {
                console.warn("fetchSections primary query warning, trying fallback select:", sectionsError);
                // Fallback without order_index if order column fails
                const { data: fallbackData } = await supabase
                    .from('course_sections')
                    .select(`
                        id, title, week_number, allocated_hours, topic_name,
                        items:section_contents(id, title, type, video_url, pdf_url, content_url, content_text, min_watch_percent, duration_minutes, created_at)
                    `)
                    .eq('course_id', id);
                sectionsData = fallbackData || [];
            }

            // 2. Fetch assignments separately by course_id to guarantee relation independence
            const { data: assignmentsData, error: assignsError } = await supabase
                .from('assignments')
                .select('id, section_id, title, type, points, description, time_limit_minutes, questions, teacher_drive_url, submission_mode, created_at')
                .eq('course_id', id);

            if (assignsError) {
                console.warn("fetchSections assignments query warning:", assignsError);
            }

            const rawSections = sectionsData || [];
            const rawAssigns = assignmentsData || [];

            let sorted = rawSections.map((s: any) => {
                const contents = s.items?.map((i: any) => ({ ...i, itemType: 'content' })) || [];
                const secAssigns = rawAssigns
                    .filter((a: any) => a.section_id === s.id)
                    .map((a: any) => ({ ...a, itemType: 'assignment' }));

                const allItems = [...contents, ...secAssigns].sort((a: any, b: any) => {
                    if (a.order_index !== undefined && b.order_index !== undefined) return a.order_index - b.order_index;
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                });

                return { ...s, items: allItems };
            });

            // Catch any unassigned assignments/quizzes to guarantee 100% quiz visibility
            const assignedIds = new Set(sorted.flatMap((s: any) => (s.items || []).filter((i: any) => i.itemType === 'assignment').map((i: any) => i.id)));
            const unassignedAssigns = rawAssigns.filter((a: any) => !assignedIds.has(a.id)).map((a: any) => ({ ...a, itemType: 'assignment' }));

            if (unassignedAssigns.length > 0) {
                if (sorted.length > 0) {
                    sorted[0].items = [...sorted[0].items, ...unassignedAssigns];
                } else {
                    sorted.push({
                        id: 'unassigned',
                        title: 'Course Quizzes & Assessments',
                        items: unassignedAssigns
                    });
                }
            }

            setSections(sorted);
            if (sorted.some((s: any) => s.week_number)) {
                setStructuringApproach("weekly");
            }
        } catch (err) {
            console.error("fetchSections exception:", err);
        }
    };

    const handleAddSection = async () => {
        if (!newSectionTitle) return;
        try {
            const payload: any = {
                course_id: id,
                title: newSectionTitle,
                order_index: sections.length,
                allocated_hours: allocatedHours ? parseFloat(allocatedHours) : 0,
                topic_name: topicName.trim() || null
            };
            if (structuringApproach === "weekly") {
                payload.week_number = weekNumber || (sections.length + 1);
            }

            const { error } = await supabase
                .from('course_sections')
                .insert([payload]);

            if (error) throw error;

            toast({ title: structuringApproach === "weekly" ? "Weekly Mission Module Added! 🚀" : "Section Added! 📚" });
            setNewSectionTitle("");
            setTopicName("");
            setAllocatedHours("4.0");
            setWeekNumber(sections.length + 2);
            setAddSectionOpen(false);
            fetchSections();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const updateCourseInfo = async (updates: any) => {
        try {
            const { error } = await supabase
                .from('courses')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            toast({ title: "Course updated" });
            fetchCourseDetails(); // refresh
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }

    const handleDeleteItem = async (item: any, sectionId: string) => {
        if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

        try {
            let error;
            if (item.itemType === 'assignment') {
                // Delete from assignments table
                const { error: delError } = await supabase
                    .from('assignments')
                    .delete()
                    .eq('id', item.id);
                error = delError;
            } else {
                // Delete from section_contents table
                const { error: delError } = await supabase
                    .from('section_contents')
                    .delete()
                    .eq('id', item.id);
                error = delError;
            }

            if (error) throw error;

            toast({ title: "Deleted", description: `${item.title} has been removed.` });
            fetchSections(); // refresh
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }

    const handleDeleteSection = async (sectionId: string, sectionTitle: string) => {
        if (!confirm(`Are you sure you want to delete the section "${sectionTitle}" and all of its contents (lessons, videos, quizzes)?`)) return;

        try {
            const { error } = await supabase
                .from('course_sections')
                .delete()
                .eq('id', sectionId);

            if (error) throw error;

            toast({ title: "Section Deleted", description: `"${sectionTitle}" has been removed.` });
            fetchSections(); // refresh
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete section." });
        }
    };

    const handleApproveEnrollment = async (enrollmentId: string) => {
        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ status: 'approved' })
                .eq('id', enrollmentId);

            if (error) throw error;

            toast({ title: "Enrollment Approved", description: "The student now has access to the course." });
            fetchCourseDetails(); // Refresh list
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

            toast({ title: "Enrollment Declined", description: "The student's enrollment request has been declined." });
            fetchCourseDetails(); // Refresh list
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to decline enrollment." });
        }
    };

    const handleUpdateSectionTitle = async (sectionId: string, title: string) => {
        if (!title.trim()) return;
        try {
            const { error } = await supabase
                .from('course_sections')
                .update({ title: title.trim() })
                .eq('id', sectionId);

            if (error) throw error;
            toast({ title: "Section Updated", description: "Section title saved successfully." });
            setEditingSection(null);
            fetchSections();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update section." });
        }
    };

    const handleBulkApprove = async () => {
        if (selectedEnrollments.length === 0) return;
        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ status: 'approved' })
                .in('id', selectedEnrollments);

            if (error) throw error;

            toast({ title: "Enrollments Approved", description: `Successfully approved ${selectedEnrollments.length} student enrollment(s).` });
            setSelectedEnrollments([]);
            fetchCourseDetails();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to bulk approve enrollments." });
        }
    };

    const handleBulkDecline = async () => {
        if (selectedEnrollments.length === 0) return;
        if (!confirm(`Are you sure you want to decline ${selectedEnrollments.length} enrollment request(s)?`)) return;

        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ status: 'rejected' })
                .in('id', selectedEnrollments);

            if (error) throw error;

            toast({ title: "Enrollments Declined", description: `Declined ${selectedEnrollments.length} enrollment request(s).` });
            setSelectedEnrollments([]);
            fetchCourseDetails();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to bulk decline enrollments." });
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
            fetchCourseDetails(); // Refresh list
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to remove student." });
        }
    };

    // Mark student as completed → awards credit points
    const handleMarkCompleted = async (enrollmentId: string, studentName: string) => {
        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ completed: true })
                .eq('id', enrollmentId);

            if (error) throw error;

            toast({
                title: "🎓 Course Completed!",
                description: `${studentName} has been marked as completed. Credit points have been awarded!`
            });
            fetchCourseDetails();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    // Revoke completion status
    const handleUnmarkCompleted = async (enrollmentId: string, studentName: string) => {
        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ completed: false })
                .eq('id', enrollmentId);

            if (error) throw error;

            toast({
                title: "Completion Revoked",
                description: `${studentName}'s completion status has been revoked. Credits removed.`
            });
            fetchCourseDetails();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const exportToCSV = () => {
        if (!enrollments.length) {
            toast({ description: "No students to export." });
            return;
        }

        const totalCourseMinutes = sections.reduce((secAcc: number, s: any) => {
            const secMins = s.items.reduce((itemAcc: number, item: any) => itemAcc + (item.duration_minutes || item.time_limit_minutes || 0), 0);
            return secAcc + Math.max(secMins, (s.allocated_hours || 0) * 60);
        }, 0);

        const totalCourseHours = (totalCourseMinutes / 60).toFixed(1);

        const csvRows = [];
        const headers = [
            "Student Name",
            "Email",
            "Course Title",
            "Date Enrolled",
            "Total Course Duration (Hrs)",
            "Completion Progress (%)",
            "Completed Time Spent (Hrs)",
            "Status"
        ];
        csvRows.push(headers.join(','));

        enrollments.forEach(enrollment => {
            const progress = enrollment.completed ? 100 : (enrollment.progress || 0);
            const completedHours = ((Number(progress) / 100) * Number(totalCourseHours)).toFixed(1);

            const row = [
                `"${(enrollment.student?.full_name || 'Unknown Student').replace(/"/g, '""')}"`,
                `"${(enrollment.student?.email || 'N/A').replace(/"/g, '""')}"`,
                `"${(course?.title || 'Unknown Course').replace(/"/g, '""')}"`,
                `"${new Date(enrollment.enrolled_at || Date.now()).toLocaleDateString()}"`,
                `"${totalCourseHours} hrs"`,
                `"${progress}%"`,
                `"${completedHours} hrs"`,
                `"${enrollment.completed ? 'Completed' : (enrollment.status === 'approved' ? 'Active' : enrollment.status)}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvData = csvRows.join('\n');
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${(course?.title || 'course').replace(/\s+/g, '_')}_time_and_completion_report.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast({ title: "Time & Completion Progress Report Downloaded! 📊" });
    };

    // 📄 Download Complete Course Curriculum PDF – Professional Textbook Format
    const handleDownloadCoursePDF = async () => {
        if (!course) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: "destructive", title: "Pop-up Blocked", description: "Please allow pop-ups to download course PDF." });
            return;
        }

        // ── Fetch all assignments & quiz questions directly by course_id ──
        const { data: dbCourseAssignments } = await supabase
            .from('assignments')
            .select('id, section_id, title, type, points, description, time_limit_minutes, questions, teacher_drive_url, submission_mode, created_at')
            .eq('course_id', course.id);

        const dbAssignIds = (dbCourseAssignments || []).map((a: any) => a.id);
        const sectionAssignIds = sections.flatMap(s => (s.items || []).filter((it: any) => it.itemType === 'assignment' || it.type === 'quiz' || it.type === 'assignment').map((it: any) => it.id));
        const allAssignmentIds = Array.from(new Set([...sectionAssignIds, ...dbAssignIds]));

        let quizQuestionsMap: Record<string, any[]> = {};
        if (allAssignmentIds.length > 0) {
            const { data: allQs } = await supabase
                .from('assignment_questions')
                .select('id, assignment_id, type, question_text, points, options, correct_answer, order_index')
                .in('assignment_id', allAssignmentIds)
                .order('order_index', { ascending: true });
            if (allQs) {
                allQs.forEach((q: any) => {
                    if (!quizQuestionsMap[q.assignment_id]) quizQuestionsMap[q.assignment_id] = [];
                    quizQuestionsMap[q.assignment_id].push(q);
                });
            }
        }

        // ── Fetch instructor profile ──
        let instructorName = course.instructor || '';
        let instructorEmail = '';
        if (course.teacher_id) {
            const { data: teacherProfile } = await supabase.from('users').select('full_name, email').eq('id', course.teacher_id).maybeSingle();
            if (teacherProfile) {
                instructorName = instructorName || teacherProfile.full_name || 'Faculty Instructor';
                instructorEmail = teacherProfile.email || '';
            }
        }

        // ── Sync Admin Master Dataset & Teacher Letterhead ──
        const savedAdminInst = localStorage.getItem("orbit_institute_settings");
        const savedTeacherLH = localStorage.getItem(`orbit_teacher_letterhead_${course.teacher_id}`) || localStorage.getItem("orbit_teacher_letterhead");
        const adminData = savedAdminInst ? JSON.parse(savedAdminInst) : {};
        const teacherLH = savedTeacherLH ? JSON.parse(savedTeacherLH) : {};

        const instOrg = course.instructor_organization || teacherLH.companyName || adminData.name || adminData.companyName || 'Orbit Academic Council';
        const partnerOrgs: string[] = course.partner_organizations || [];
        const allOrgs = Array.from(new Set([instOrg, ...partnerOrgs])).filter(Boolean);

        const lh = {
            companyName: teacherLH.companyName || adminData.name || adminData.companyName || "ORBIT ACADEMIC GOVERNING COUNCIL",
            companyTagline: teacherLH.companyTagline || adminData.tagline || adminData.companyTagline || "Official Curriculum Architecture & Resource Syllabus",
            companyLogoUrl: teacherLH.companyLogoUrl || adminData.logoUrl || adminData.companyLogoUrl || "",
            registrationNo: teacherLH.registrationNo || adminData.registrationNumber || adminData.registrationNo || "ORBIT-ACAD-2026",
            email: teacherLH.email || adminData.email || instructorEmail || "academic@orbitlms.edu.in",
            address: teacherLH.address || adminData.address || "Orbit LMS Global Headquarters",
            signatoryName: instructorName || teacherLH.signatoryName || 'Faculty Instructor',
            signatureUrl: teacherLH.signatureUrl || adminData.signatureUrl || ""
        };

        // ── Markdown → HTML converter ──
        const md2html = (text: string) => {
            if (!text) return '';
            let h = text;

            // Fenced code blocks
            h = h.replace(/```([a-z0-9_]*)\n([\s\S]*?)```/gim, (_m, lang, code) => {
                const l = (lang || 'CODE').toUpperCase();
                const c = code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
                return `<div class="code-block"><div class="code-lang">💻 ${l}</div><pre>${c}</pre></div>`;
            });

            // Headings
            h = h.replace(/^#### (.*$)/gim, '<h5 class="md-h5">$1</h5>')
                 .replace(/^### (.*$)/gim, '<h4 class="md-h4">$1</h4>')
                 .replace(/^## (.*$)/gim, '<h3 class="md-h3">$1</h3>')
                 .replace(/^# (.*$)/gim, '<h2 class="md-h2">$1</h2>');

            // Bold & Italic & Inline Code
            h = h.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
                 .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                 .replace(/\*(.*?)\*/g, '<em>$1</em>')
                 .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

            // Blockquotes
            h = h.replace(/^>\s+(.*$)/gim, '<blockquote class="md-quote">$1</blockquote>');

            // Lists
            h = h.replace(/^\- (.*$)/gim, '<li class="md-li">$1</li>')
                 .replace(/^\* (.*$)/gim, '<li class="md-li">$1</li>')
                 .replace(/^\d+\.\s+(.*$)/gim, '<li class="md-ol-li">$1</li>');

            h = h.replace(/(<li class="md-li">[\s\S]*?<\/li>)+/g, '<ul class="md-ul">$&</ul>');
            h = h.replace(/(<li class="md-ol-li">[\s\S]*?<\/li>)+/g, '<ol class="md-ol">$&</ol>');

            h = h.replace(/\n\n+/g, '</p><p class="md-p">');
            h = `<p class="md-p">${h}</p>`;
            h = h.replace(/<p class="md-p"><\/p>/g, '');
            return h;
        };

        // ── Build Table of Contents entries ──
        let tocEntries = '';
        let chapIdx = 0;
        sections.forEach((sec, secIdx) => {
            chapIdx = secIdx + 1;
            tocEntries += `<tr><td class="toc-ch">Chapter ${chapIdx}</td><td class="toc-title">${sec.title}</td><td class="toc-items">${sec.items?.length || 0} Items</td></tr>`;
        });
        if (liveClasses.length > 0) {
            tocEntries += `<tr><td class="toc-ch">Appendix A</td><td class="toc-title">Scheduled Live Interactive Sessions</td><td class="toc-items">${liveClasses.length} Sessions</td></tr>`;
        }

        // ── Build Chapter Pages ──
        const chaptersHTML = sections.map((sec, secIdx) => {
            const chNum = secIdx + 1;
            const itemsHTML = (sec.items && sec.items.length > 0) ? sec.items.map((item: any, itemIdx: number) => {
                const isAssignment = item.itemType === 'assignment' || item.type === 'assignment';
                let rawQs = quizQuestionsMap[item.id] || item.questions || [];
                if (typeof rawQs === 'string') {
                    try { rawQs = JSON.parse(rawQs); } catch(e) {}
                }
                const quizQs = Array.isArray(rawQs) ? rawQs : [];
                const isQuiz = item.type === 'quiz' || quizQs.length > 0;
                const typeLabel = isQuiz ? 'Quiz Assessment' : (isAssignment ? 'Assignment Task' : (item.video_url ? 'Video Lecture' : (item.pdf_url ? 'PDF Reference' : 'Reading Note')));
                const typeCls = isQuiz ? 'tag-quiz' : (isAssignment ? 'tag-assign' : 'tag-content');

                let body = '';

                // Video
                if (item.video_url || item.content_url) {
                    const url = item.video_url || item.content_url;
                    body += `<div class="res-box res-video">🎥 <strong>Video Lecture:</strong> <a href="${url}" target="_blank">${url}</a></div>`;
                }
                // PDF
                if (item.pdf_url) {
                    body += `<div class="res-box res-pdf">📄 <strong>PDF Document:</strong> <a href="${item.pdf_url}" target="_blank">${item.pdf_url}</a></div>`;
                }
                // Reading Note / Markdown content
                if (item.content_text) {
                    body += `<div class="content-body">${md2html(item.content_text)}</div>`;
                }
                // Assignment description
                if (item.description && isAssignment && !isQuiz) {
                    body += `<div class="assign-box">
                        <div class="assign-head">📝 Assignment Brief — ${item.points || 100} Marks</div>
                        <div class="assign-body">${md2html(item.description)}</div>
                        ${item.teacher_drive_url ? `<div class="assign-link">📂 Reference: <a href="${item.teacher_drive_url}" target="_blank">${item.teacher_drive_url}</a></div>` : ''}
                    </div>`;
                }
                // Quiz description
                if (item.description && isQuiz) {
                    body += `<div class="quiz-desc">${md2html(item.description)}</div>`;
                }
                // Full Quiz Questions with Checkboxes
                if (quizQs.length > 0) {
                    body += `<div class="quiz-box">
                        <div class="quiz-head">🧠 Quiz — ${quizQs.length} Questions • ${item.points || 100} Points</div>
                        <div class="quiz-questions">
                            ${quizQs.map((q: any, qIdx: number) => {
                                const qText = q.question_text || q.question || q.title || 'Question';
                                const opts = q.options || [];
                                const correctAns = q.correct_answer || q.correctAnswer || '';
                                return `<div class="quiz-q">
                                    <div class="q-num">Q${qIdx + 1}.</div>
                                    <div class="q-body">
                                        <div class="q-text">${qText}</div>
                                        ${opts.length > 0 ? `<div class="q-opts">
                                            ${opts.map((opt: string, optIdx: number) => {
                                                const isCorrect = (correctAns === opt) || (correctAns === String(optIdx)) || (correctAns === String.fromCharCode(65 + optIdx));
                                                return `<div class="q-opt ${isCorrect ? 'q-correct' : ''}">
                                                    <span class="q-checkbox">${isCorrect ? '☑' : '☐'}</span>
                                                    <span class="q-label">${String.fromCharCode(65 + optIdx)}.</span>
                                                    <span>${opt}</span>
                                                </div>`;
                                            }).join('')}
                                        </div>` : ''}
                                        ${q.points ? `<div style="font-size:10px;color:#6366f1;margin-top:4px;">Points: ${q.points}</div>` : ''}
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
                }

                return `<div class="item-card">
                    <div class="item-header">
                        <span class="item-num">${chNum}.${itemIdx + 1}</span>
                        <span class="item-title">${item.title}</span>
                        <span class="item-tag ${typeCls}">${typeLabel}</span>
                    </div>
                    ${body}
                </div>`;
            }).join('') : '<p class="empty-msg">No content items in this chapter.</p>';

            return `<div class="chapter-page">
                <div class="chapter-header">
                    <div class="ch-badge">Chapter ${chNum}</div>
                    <h2 class="ch-title">${sec.title}</h2>
                    ${sec.topic_name ? `<p class="ch-topic">Topic: ${sec.topic_name}</p>` : ''}
                    <div class="ch-meta">
                        <span>${sec.items?.length || 0} Learning Items</span>
                        ${sec.allocated_hours ? `<span>${sec.allocated_hours} Hours Allocated</span>` : ''}
                        ${sec.week_number ? `<span>Week ${sec.week_number}</span>` : ''}
                    </div>
                </div>
                ${itemsHTML}
            </div>`;
        }).join('');

        // ── Live Classes Appendix ──
        const liveHTML = liveClasses.length > 0 ? `<div class="chapter-page">
            <div class="chapter-header">
                <div class="ch-badge">Appendix A</div>
                <h2 class="ch-title">Scheduled Live Interactive Sessions</h2>
                <div class="ch-meta"><span>${liveClasses.length} Sessions Planned</span></div>
            </div>
            <table class="live-table">
                <thead><tr><th>#</th><th>Session Title</th><th>Scheduled Date & Time</th><th>Duration</th></tr></thead>
                <tbody>${liveClasses.map((lc, idx) => `<tr><td>${idx + 1}</td><td>${lc.title}</td><td>${new Date(lc.scheduled_at).toLocaleString()}</td><td>${lc.duration_minutes || 60} min</td></tr>`).join('')}</tbody>
            </table>
        </div>` : '';

        // ── Write Document cleanly to print window ──
        printWindow.document.open();
        printWindow.document.write(`<!DOCTYPE html><html><head>
<title>${course.title} — Official Academic Syllabus & Textbook</title>
<style>
    @page {
        size: A4 portrait;
        margin: 15mm 15mm 15mm 15mm;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; min-height: 100%; background: #f8fafc; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.65; }

    /* ── SCREEN PREVIEW CONTAINER ── */
    .pdf-wrapper { max-width: 850px; margin: 20px auto; background: #ffffff; min-height: 100vh; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden; position: relative; }

    /* ── WATERMARK ── */
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.035; z-index: 0; pointer-events: none; mix-blend-mode: multiply; filter: grayscale(100%); }
    .watermark img { width: 340px; height: 340px; object-fit: contain; background: transparent !important; border: none !important; box-shadow: none !important; }

    /* ── TOP BAR (SCREEN ONLY) ── */
    .no-print-bar { text-align: center; padding: 14px 24px; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #334155; }
    .no-print-bar span { font-size: 14px; font-weight: 600; color: #cbd5e1; }
    .no-print-bar button { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border: none; padding: 10px 26px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 14px rgba(79,70,229,0.4); }

    /* ── COVER PAGE (PAGE 1 ONLY) ── */
    .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; text-align: center; padding: 60px 40px; page-break-after: always; position: relative; }
    .cover-logo { width: 110px; height: 110px; object-fit: contain; margin-bottom: 20px; border-radius: 16px; }
    .cover-org { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: #4f46e5; margin-bottom: 6px; }
    .cover-tagline { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-bottom: 36px; }
    .cover-rule { width: 80px; height: 3px; background: linear-gradient(90deg, #4f46e5, #7c3aed); border-radius: 2px; margin-bottom: 32px; }
    .cover-title { font-family: 'Merriweather', Georgia, serif; font-size: 30px; font-weight: 900; color: #0f172a; line-height: 1.3; margin-bottom: 16px; max-width: 680px; }
    .cover-desc { font-size: 13px; color: #475569; max-width: 560px; line-height: 1.6; margin-bottom: 36px; }
    .cover-meta { display: flex; gap: 24px; font-size: 12px; color: #64748b; margin-bottom: 40px; justify-content: center; flex-wrap: wrap; }
    .cover-meta strong { color: #1e293b; }
    .cover-instructor { border-top: 1px solid #e2e8f0; padding-top: 24px; font-size: 13px; color: #475569; }
    .cover-instructor strong { color: #0f172a; font-size: 15px; display: block; margin-bottom: 2px; }
    .cover-bottom { margin-top: 40px; font-size: 10px; color: #94a3b8; }

    /* ── OVERVIEW PAGE (PAGE 2) ── */
    .overview-page { padding: 50px 60px; page-break-after: always; page-break-before: always; }
    .overview-page h2 { font-family: 'Merriweather', serif; font-size: 22px; color: #0f172a; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-bottom: 24px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px; }
    .info-card h3 { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; }

    /* ── TABLE OF CONTENTS (PAGE 3) ── */
    .toc-page { padding: 50px 60px; page-break-after: always; page-break-before: always; }
    .toc-page h2 { font-family: 'Merriweather', serif; font-size: 22px; color: #0f172a; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-bottom: 24px; }
    .toc-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .toc-table tr { border-bottom: 1px solid #f1f5f9; }
    .toc-table td { padding: 12px 8px; font-size: 13px; word-wrap: break-word; }
    .toc-ch { font-weight: 800; color: #4f46e5; width: 120px; }
    .toc-title { color: #0f172a; font-weight: 600; }
    .toc-items { text-align: right; color: #64748b; font-size: 12px; width: 110px; }

    /* ── CHAPTER PAGES ── */
    .chapter-page { padding: 50px 60px; page-break-before: always; position: relative; z-index: 1; }
    .chapter-header { margin-bottom: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
    .ch-badge { display: inline-block; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .ch-title { font-family: 'Merriweather', serif; font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .ch-topic { font-size: 13px; color: #6366f1; font-weight: 600; margin-bottom: 6px; }
    .ch-meta { display: flex; gap: 14px; font-size: 11px; color: #64748b; }
    .ch-meta span { background: #f1f5f9; padding: 3px 10px; border-radius: 4px; }

    /* ── ITEM CARDS ── */
    .item-card { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; page-break-inside: avoid; max-width: 100%; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .item-header { display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .item-num { font-weight: 800; color: #4f46e5; font-size: 13px; min-width: 34px; }
    .item-title { flex: 1; font-weight: 700; font-size: 14px; color: #0f172a; word-wrap: break-word; }
    .item-tag { font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
    .tag-content { background: #eff6ff; color: #1d4ed8; }
    .tag-assign { background: #fffbeb; color: #b45309; }
    .tag-quiz { background: #fef2f2; color: #dc2626; }

    /* ── RESOURCE BOXES ── */
    .res-box { margin: 12px 18px 0; padding: 10px 14px; border-radius: 6px; font-size: 12px; word-wrap: break-word; }
    .res-box a { text-decoration: underline; word-break: break-all; }
    .res-video { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .res-video a { color: #2563eb; }
    .res-pdf { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .res-pdf a { color: #16a34a; }

    /* ── MARKDOWN CONTENT BODY ── */
    .content-body { padding: 16px 20px; font-size: 13px; color: #334155; line-height: 1.7; overflow-wrap: break-word; word-wrap: break-word; }
    .md-p { margin-bottom: 12px; }
    .md-h2 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 20px 0 10px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; }
    .md-h3 { font-size: 15px; font-weight: 700; color: #1e1b4b; margin: 16px 0 8px; }
    .md-h4 { font-size: 14px; font-weight: 700; color: #334155; margin: 12px 0 6px; }
    .md-ul, .md-ol { margin: 8px 0 14px 24px; }
    .md-li { margin-bottom: 4px; }
    .md-quote { border-left: 4px solid #6366f1; background: #eef2ff; padding: 10px 14px; margin: 12px 0; font-style: italic; color: #3730a3; border-radius: 0 6px 6px 0; }
    .inline-code { background: #eef2ff; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px; color: #4f46e5; border: 1px solid #c7d2fe; word-break: break-all; }

    /* ── CODE BLOCKS ── */
    .code-block { margin: 14px 0; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; background: #0f172a; page-break-inside: avoid; max-width: 100%; }
    .code-lang { background: #1e293b; padding: 6px 14px; font-family: monospace; font-size: 10px; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #334155; }
    .code-block pre { margin: 0; padding: 14px; font-family: 'Courier New', monospace; font-size: 11px; color: #e2e8f0; white-space: pre-wrap !important; word-wrap: break-word !important; word-break: break-all !important; line-height: 1.5; overflow-x: hidden; }

    /* ── ASSIGNMENT BOX ── */
    .assign-box { margin: 12px 18px; padding: 14px 18px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; word-wrap: break-word; }
    .assign-head { font-size: 13px; font-weight: 800; color: #92400e; margin-bottom: 8px; }
    .assign-body { font-size: 12px; color: #78350f; line-height: 1.6; }
    .assign-link { margin-top: 8px; font-size: 11px; }
    .assign-link a { color: #d97706; text-decoration: underline; word-break: break-all; }

    /* ── QUIZ BOX ── */
    .quiz-desc { margin: 10px 18px; font-size: 12px; color: #64748b; }
    .quiz-box { margin: 12px 18px 18px; border: 1px solid #fecdd3; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
    .quiz-head { background: linear-gradient(135deg, #fef2f2, #fff1f2); padding: 10px 18px; font-size: 13px; font-weight: 800; color: #9f1239; border-bottom: 1px solid #fecdd3; }
    .quiz-questions { padding: 8px 0; }
    .quiz-q { display: flex; gap: 12px; padding: 10px 18px; border-bottom: 1px solid #fef2f2; }
    .quiz-q:last-child { border-bottom: none; }
    .q-num { font-weight: 800; color: #be123c; font-size: 13px; min-width: 30px; padding-top: 1px; }
    .q-body { flex: 1; }
    .q-text { font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 8px; line-height: 1.5; word-wrap: break-word; }
    .q-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .q-opt { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #475569; padding: 6px 10px; border-radius: 6px; background: #f8fafc; border: 1px solid #f1f5f9; word-wrap: break-word; }
    .q-correct { background: #f0fdf4; border-color: #86efac; color: #166534; font-weight: 600; }
    .q-checkbox { font-size: 14px; line-height: 1; margin-top: -1px; }
    .q-correct .q-checkbox { color: #16a34a; }
    .q-label { font-weight: 700; min-width: 18px; }

    /* ── LIVE CLASSES TABLE ── */
    .live-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; table-layout: fixed; }
    .live-table th { background: #eef2ff; color: #3730a3; text-align: left; padding: 10px 14px; font-weight: 700; border-bottom: 2px solid #c7d2fe; }
    .live-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; word-wrap: break-word; }

    /* ── SIGNATURE PAGE ── */
    .sig-page { padding: 50px 60px; page-break-before: always; page-break-inside: avoid; }
    .sig-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
    .seal { border: 2px dashed #6366f1; padding: 16px 24px; border-radius: 10px; text-align: center; background: #eef2ff; }
    .seal-t { font-size: 12px; font-weight: 800; color: #3730a3; }
    .seal-s { font-size: 10px; color: #6366f1; margin-top: 2px; }
    .sig-line { text-align: center; width: 240px; }
    .sig-name { font-size: 14px; font-weight: 700; color: #0f172a; border-top: 1.5px solid #0f172a; padding-top: 6px; }
    .sig-role { font-size: 10px; color: #64748b; text-transform: uppercase; }

    .footer-note { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }

    @media print {
        html, body { background: #ffffff !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
        .pdf-wrapper { max-width: 100% !important; margin: 0 !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        .no-print-bar { display: none !important; }
        .cover { min-height: 100vh; padding: 30px 10px; }
        .chapter-page, .toc-page, .overview-page, .sig-page { padding: 20px 0; }
        .item-card, .quiz-box, .code-block { page-break-inside: avoid; }
    }
</style>
</head>
<body>

<!-- TOP ACTION BAR (SCREEN ONLY) -->
<div class="no-print-bar">
    <span>📚 Official Textbook & Curriculum Report — ${course.title}</span>
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>

<div class="pdf-wrapper">

<!-- WATERMARK -->
${lh.companyLogoUrl ? `<div class="watermark"><img src="${lh.companyLogoUrl}" alt="Watermark" onerror="this.style.display='none';" /></div>` : ''}

<!-- ══════════ PAGE 1: COVER PAGE ONLY ══════════ -->
<div class="cover">
    ${lh.companyLogoUrl ? `<img src="${lh.companyLogoUrl}" alt="Logo" class="cover-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
    <div style="${lh.companyLogoUrl ? 'display:none;' : 'display:flex;'} font-size: 32px; background: #eef2ff; color: #4f46e5; border: 2px solid #c7d2fe; border-radius: 20px; width: 84px; height: 84px; align-items: center; justify-content: center; margin: 0 auto 20px; font-weight: 900;">
        🏛️
    </div>
    <div class="cover-org">${lh.companyName}</div>
    <div class="cover-tagline">${lh.companyTagline}</div>
    <div class="cover-rule"></div>
    <h1 class="cover-title">${course.title}</h1>
    <p class="cover-desc">${course.description || ''}</p>
    <div class="cover-meta">
        <div class="cover-badge"><strong>${course.credit_points || 4}</strong> Academic Credits</div>
        <div class="cover-badge"><strong>${sections.length}</strong> Chapters</div>
        <div class="cover-badge"><strong>${course.domain || 'Software Engineering'}</strong></div>
    </div>
    <div class="cover-instructor">
        <strong>${lh.signatoryName}</strong>
        Faculty Instructor${instOrg ? ` • ${instOrg}` : ''}<br/>
        ${lh.email}
    </div>
    ${allOrgs.length > 0 ? `<div style="margin-top:16px; font-size:11px; color:#6366f1; letter-spacing:0.5px;">
        <strong>Course Offered By:</strong> ${allOrgs.join(' • ')}
    </div>` : ''}
    <div class="cover-bottom">Registration No: ${lh.registrationNo} • ${lh.address} • Generated ${new Date().toLocaleDateString()}</div>
</div>

<!-- ══════════ PAGE 2: COURSE OVERVIEW ══════════ -->
<div class="overview-page">
    <h2>Course Overview & Curriculum Architecture</h2>

    <div class="info-card">
        <h3>📌 Course Description & Objectives</h3>
        <p style="font-size: 13px; color: #475569; line-height: 1.6;">${course.objectives || course.description || 'This course presents a comprehensive academic curriculum designed to master core concepts, practical implementations, and evaluation methodologies.'}</p>
    </div>

    ${course.instructions ? `<div class="info-card">
        <h3>📋 Student Guidelines & Course Policy</h3>
        <p style="font-size: 13px; color: #475569; line-height: 1.6;">${course.instructions}</p>
    </div>` : ''}

    ${course.exam_policy ? `<div class="info-card">
        <h3>🎯 Assessment & Grading Criteria</h3>
        <p style="font-size: 13px; color: #475569; line-height: 1.6;">${course.exam_policy}</p>
    </div>` : ''}

    <div class="info-card">
        <h3>👨‍🏫 Instructor Information</h3>
        <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            <strong>Lead Instructor:</strong> ${lh.signatoryName}<br/>
            <strong>Organization:</strong> ${instOrg}<br/>
            ${allOrgs.length > 1 ? `<strong>Partner Institutions:</strong> ${allOrgs.join(', ')}<br/>` : ''}
            <strong>Contact Email:</strong> ${lh.email}
        </p>
    </div>
</div>

<!-- ══════════ PAGE 3: TABLE OF CONTENTS ══════════ -->
<div class="toc-page">
    <h2>Table of Contents</h2>
    <table class="toc-table">
        <tbody>
            ${tocEntries}
        </tbody>
    </table>
</div>

<!-- ══════════ CHAPTERS ══════════ -->
${chaptersHTML}

<!-- ══════════ LIVE CLASSES APPENDIX ══════════ -->
${liveHTML}

<!-- ══════════ SIGNATURE PAGE ══════════ -->
<div class="sig-page">
    <h2 style="font-family: 'Merriweather', serif; font-size: 18px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 24px;">Verification & Authorization</h2>
    <p style="font-size: 13px; color: #475569; line-height: 1.6;">This document is an official academic archive of the course <strong>"${course.title}"</strong> offered by <strong>${lh.signatoryName}</strong>${instOrg ? ` at <strong>${instOrg}</strong>` : ''}${partnerOrgs.length > 0 ? ` in collaboration with <strong>${partnerOrgs.join('</strong>, <strong>')}</strong>` : ''}, under <strong>${lh.companyName}</strong>. All curriculum content, quizzes, and resources listed herein are verified and authorized for academic distribution.</p>

    ${allOrgs.length > 1 ? `<div style="margin-top:16px; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
        <div style="font-size:11px; font-weight:800; color:#4f46e5; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">Partner Organizations</div>
        ${allOrgs.map(org => `<div style="font-size:12px; color:#1e293b; padding:3px 0;">🏢 ${org}</div>`).join('')}
    </div>` : ''}

    <div class="sig-flex">
        <div class="seal">
            <div class="seal-t">OFFICIAL ACADEMIC SEAL</div>
            <div class="seal-s">Verified & Encrypted Archive</div>
            <div style="font-size:10px; color:#6366f1; margin-top:4px;">${lh.registrationNo}</div>
        </div>
        <div class="sig-line">
            ${lh.signatureUrl ? `<img src="${lh.signatureUrl}" alt="Signature" style="height: 48px; max-width: 200px; object-fit: contain; margin-bottom: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />` : ''}
            <div class="sig-font-fallback" style="${lh.signatureUrl ? 'display:none;' : 'display:block;'} font-family: 'Merriweather', Georgia, serif; font-size: 22px; font-style: italic; color: #4f46e5; margin-bottom: 4px; font-weight: 700;">
                ${lh.signatoryName}
            </div>
            <div class="sig-name">${lh.signatoryName}</div>
            <div class="sig-role">Authorized Faculty Instructor${instOrg ? ` • ${instOrg}` : ''}</div>
        </div>
    </div>
    <div class="footer-note">Generated by Orbit LMS Academic Curriculum Manager • Confidential Archive Copy • ${new Date().toLocaleString()}</div>
</div>

</div>

</body></html>`);

        printWindow.document.close();
        toast({ title: "📚 Textbook PDF Generated!", description: "Use the print dialog to save as PDF." });
    };

    // 📦 Backup Course JSON
    const handleBackupCourseJSON = () => {
        if (!course) return;

        const backupPayload = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            course: {
                title: course.title,
                description: course.description,
                domain: course.domain,
                credit_points: course.credit_points,
                objectives: course.objectives,
                instructions: course.instructions,
                instructor_intro: course.instructor_intro,
                exam_policy: course.exam_policy
            },
            sections: sections.map(s => ({
                title: s.title,
                order_index: s.order_index,
                items: s.items
            }))
        };

        const jsonStr = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course.title.replace(/\s+/g, '_')}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast({ title: "Course JSON Backup Exported! 📦", description: "Backup file downloaded to your device." });
    };

    // 📥 Restore Course JSON
    const handleRestoreCourseJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.sections || !Array.isArray(data.sections)) {
                toast({ variant: "destructive", title: "Invalid Backup File", description: "JSON backup file does not contain valid course sections." });
                return;
            }

            toast({ title: "Restoring Course Backup...", description: "Importing modules and resources..." });

            for (let i = 0; i < data.sections.length; i++) {
                const sec = data.sections[i];
                const { data: newSec, error: secErr } = await supabase
                    .from('course_sections')
                    .insert([{
                        course_id: id,
                        title: sec.title || `Restored Module ${i + 1}`,
                        order_index: i
                    }])
                    .select('id')
                    .single();

                if (secErr || !newSec) continue;

                if (sec.items && Array.isArray(sec.items)) {
                    for (let j = 0; j < sec.items.length; j++) {
                        const item = sec.items[j];
                        if (item.itemType === 'assignment' || item.type === 'quiz' || item.type === 'assignment') {
                            await supabase.from('assignments').insert([{
                                course_id: id,
                                section_id: newSec.id,
                                title: item.title || "Restored Assignment",
                                type: item.type || "assignment",
                                points: item.points || 100
                            }]);
                        } else {
                            await supabase.from('section_contents').insert([{
                                section_id: newSec.id,
                                title: item.title || "Restored Lesson",
                                type: item.type || "video",
                                video_url: item.video_url || null,
                                pdf_url: item.pdf_url || null,
                                content_text: item.content_text || null,
                                order_index: j
                            }]);
                        }
                    }
                }
            }

            toast({ title: "Course Restored Successfully! 🎉", description: "All modules and resources have been imported." });
            fetchSections();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Restore Failed", description: err.message || "Could not parse JSON backup." });
        }
    };

    // 📋 Open Live Class Attendance Modal
    const [attendanceClassModal, setAttendanceClassModal] = useState<any | null>(null);
    const [attendanceStudents, setAttendanceStudents] = useState<any[]>([]);
    const [attendanceStatusMap, setAttendanceStatusMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
    const [savingAttendance, setSavingAttendance] = useState(false);

    const openLiveAttendanceModal = async (lc: any) => {
        setAttendanceClassModal(lc);
        try {
            const { data: enrs } = await supabase
                .from('enrollments')
                .select('student_id, student:users!student_id(id, full_name, email, avatar_url)')
                .eq('course_id', id)
                .eq('status', 'approved');

            const studentList = (enrs || []).map((e: any) => ({
                id: e.student_id,
                name: e.student?.full_name || 'Student',
                email: e.student?.email || '',
                avatar: e.student?.avatar_url
            }));

            setAttendanceStudents(studentList);

            const { data: existingAtt } = await supabase
                .from('attendance')
                .select('student_id, status')
                .eq('live_class_id', lc.id);

            const statusMap: Record<string, 'present' | 'absent' | 'late'> = {};
            studentList.forEach(s => { statusMap[s.id] = 'present'; });
            (existingAtt || []).forEach((a: any) => {
                statusMap[a.student_id] = (a.status as any) || 'present';
            });

            setAttendanceStatusMap(statusMap);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: "Failed to load class attendance." });
        }
    };

    const saveLiveAttendance = async () => {
        if (!attendanceClassModal) return;
        setSavingAttendance(true);
        try {
            const payload = Object.entries(attendanceStatusMap).map(([studentId, status]) => ({
                course_id: id,
                live_class_id: attendanceClassModal.id,
                student_id: studentId,
                date: new Date(attendanceClassModal.scheduled_at).toISOString().slice(0, 10),
                status
            }));

            const { error } = await supabase
                .from('attendance')
                .upsert(payload, { onConflict: 'live_class_id,student_id' });

            if (error) throw error;

            toast({ title: "Attendance Recorded! 📋", description: `Saved attendance for ${payload.length} students.` });
            setAttendanceClassModal(null);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message || "Failed to save attendance." });
        } finally {
            setSavingAttendance(false);
        }
    };

    // 📊 Export All Live Classes Attendance Matrix Excel
    const handleExportAllAttendanceExcel = async () => {
        if (!course || liveClasses.length === 0) {
            toast({ variant: "destructive", title: "No Live Classes", description: "Schedule at least one live class to export attendance matrix." });
            return;
        }

        try {
            toast({ title: "Generating Attendance Matrix...", description: "Building Excel CSV report..." });

            const { data: enrs } = await supabase
                .from('enrollments')
                .select('student_id, student:users!student_id(full_name, email)')
                .eq('course_id', id)
                .eq('status', 'approved');

            const { data: allAtt } = await supabase
                .from('attendance')
                .select('live_class_id, student_id, status')
                .eq('course_id', id);

            const attMap: Record<string, string> = {};
            (allAtt || []).forEach((a: any) => {
                attMap[`${a.live_class_id}_${a.student_id}`] = a.status || 'present';
            });

            const headers = ["Student Name", "Student Email", ...liveClasses.map(lc => `"${lc.title} (${new Date(lc.scheduled_at).toLocaleDateString()})"`), "Attendance Percentage"];

            const rows = (enrs || []).map((e: any) => {
                const sName = e.student?.full_name || "Student";
                const sEmail = e.student?.email || "";
                let presentCount = 0;

                const classStatuses = liveClasses.map(lc => {
                    const status = attMap[`${lc.id}_${e.student_id}`] || "Not Marked";
                    if (status === 'present') presentCount++;
                    return status.toUpperCase();
                });

                const pct = Math.round((presentCount / liveClasses.length) * 100);
                return [ `"${sName}"`, `"${sEmail}"`, ...classStatuses, `"${pct}%"` ];
            });

            const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${course.title.replace(/\s+/g, '_')}_All_Live_Classes_Attendance_Matrix.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            toast({ title: "Attendance Matrix Exported! 📊", description: "File downloaded to your device." });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Export Error", description: err.message });
        }
    };

    // 🗑️ Request Course Deletion from Admin
    const handleRequestDeleteCourse = async () => {
        if (!confirm(`Are you sure you want to request deletion of "${course.title}"?\n\nThis will send a deletion request to the Admin for approval. The course will remain until Admin approves.`)) return;

        try {
            toast({ title: "Submitting Request...", description: "Notifying admin for course deletion approval..." });
            const { error } = await supabase.from('courses').update({
                is_deletion_requested: true,
                deletion_requested_at: new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;

            toast({ title: "Deletion Request Sent ⏳", description: "Admin approval is required to permanently delete this course." });
            setCourse((prev: any) => ({ ...prev, is_deletion_requested: true, deletion_requested_at: new Date().toISOString() }));
        } catch (err: any) {
            toast({ variant: "destructive", title: "Request Failed", description: err.message || "Could not submit deletion request." });
        }
    };

    const handleCancelDeleteRequest = async () => {
        try {
            const { error } = await supabase.from('courses').update({
                is_deletion_requested: false,
                deletion_requested_at: null
            }).eq('id', id);
            if (error) throw error;

            toast({ title: "Deletion Request Cancelled", description: "The course is active and no longer pending deletion." });
            setCourse((prev: any) => ({ ...prev, is_deletion_requested: false, deletion_requested_at: null }));
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
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

    if (!course) return <TeacherLayout>Course not found</TeacherLayout>;

    return (
        <TeacherLayout>
            {course.is_deletion_requested && (
                <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        <div>
                            <p className="font-bold text-sm text-amber-600 dark:text-amber-400">Deletion Request Submitted — Pending Admin Approval ⏳</p>
                            <p className="text-xs text-muted-foreground">You submitted a deletion request for this course. An administrator must approve it to permanently delete it.</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCancelDeleteRequest} className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold shrink-0">
                        Cancel Deletion Request
                    </Button>
                </div>
            )}

            <div className="flex items-center gap-4 mb-6 animate-fade-in">
                <Link to="/teacher/courses">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-display font-bold">{course.title}</h1>
                        {course.is_deletion_requested && (
                            <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/40 font-bold">Deletion Requested ⏳</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-1">{course.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleDownloadCoursePDF} variant="outline" className="gap-1.5 font-bold border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20">
                        <FileText className="h-4 w-4" /> Download PDF Package 📄
                    </Button>
                    <Button onClick={handleBackupCourseJSON} variant="outline" className="gap-1.5 font-bold border-slate-700">
                        <Download className="h-4 w-4" /> Backup JSON 📦
                    </Button>
                    <label className="cursor-pointer">
                        <input type="file" accept=".json" onChange={handleRestoreCourseJSON} className="hidden" />
                        <Button variant="outline" className="gap-1.5 font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 pointer-events-none">
                            <UploadCloud className="h-4 w-4" /> Restore JSON 📥
                        </Button>
                    </label>
                    <Link to={`/student/courses/${id}/learn`} target="_blank">
                        <Button variant="secondary" className="gap-1.5 font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 shadow-xs">
                            <Eye className="h-4 w-4" /> Preview ↗
                        </Button>
                    </Link>
                    <Button onClick={() => setExamDesignerOpen(true)} className="gap-1.5 font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-md">
                        <FileText className="h-4 w-4" /> Exam Paper
                    </Button>
                    <Link to={`/teacher/courses/${id}/grades`}>
                        <Button variant="outline">
                            Grades & Marks
                        </Button>
                    </Link>
                    <Button
                        variant={course.is_published ? "outline" : "default"}
                        onClick={() => updateCourseInfo({ is_published: !course.is_published })}
                    >
                        {course.is_published ? "Unpublish" : "Publish Course"}
                    </Button>
                    {course.is_deletion_requested ? (
                        <Button
                            variant="outline"
                            className="gap-1.5 font-bold border-amber-500/40 text-amber-600 dark:text-amber-400"
                            onClick={handleCancelDeleteRequest}
                        >
                            Cancel Deletion Request
                        </Button>
                    ) : (
                        <Button
                            variant="destructive"
                            className="gap-1.5 font-bold"
                            onClick={handleRequestDeleteCourse}
                        >
                            <Trash2 className="h-4 w-4" /> Request Delete ⏳
                        </Button>
                    )}
                </div>
            </div>

            {/* Dynamic Total Course Duration & Architecture Summary Banner */}
            {(() => {
                const totalModuleMinutes = sections.reduce((secAcc: number, s: any) => {
                    const secMins = s.items.reduce((itemAcc: number, item: any) => itemAcc + (item.duration_minutes || item.time_limit_minutes || 0), 0);
                    return secAcc + Math.max(secMins, (s.allocated_hours || 0) * 60);
                }, 0);
                const totalLiveClassMinutes = liveClasses.reduce((acc: number, lc: any) => acc + (lc.duration_minutes || 60), 0);
                const dynamicTotalMinutes = totalModuleMinutes + totalLiveClassMinutes;
                const dynamicTotalHours = (dynamicTotalMinutes / 60).toFixed(1);
                const moduleHours = (totalModuleMinutes / 60).toFixed(1);
                const liveHours = (totalLiveClassMinutes / 60).toFixed(1);

                return (
                    <div className="mb-6 p-4 rounded-xl border bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold font-mono text-xs gap-1 py-1 px-2.5">
                                    <Clock className="h-3.5 w-3.5" /> DYNAMIC TOTAL COURSE DURATION: {dynamicTotalHours} HOURS
                                </Badge>
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-bold font-mono py-1 px-2.5">
                                    🎓 {course.credit_points || 4} Academic Credits
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Calculated dynamically from <span className="font-bold text-foreground">{moduleHours} hrs</span> module content + <span className="font-bold text-foreground">{liveHours} hrs</span> interactive live classes.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                            <div className="px-3 py-1.5 rounded-lg border bg-background/80 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span className="font-bold text-foreground">{sections.length}</span> {structuringApproach === "weekly" ? "Weeks" : "Sections"}
                            </div>
                            <div className="px-3 py-1.5 rounded-lg border bg-background/80 flex items-center gap-1.5">
                                <Video className="h-3.5 w-3.5 text-amber-500" />
                                <span className="font-bold text-foreground">
                                    {sections.reduce((acc, s) => acc + s.items.filter((i: any) => i.type === 'video').length, 0)}
                                </span> Lectures
                            </div>
                            <div className="px-3 py-1.5 rounded-lg border bg-card flex items-center gap-1.5 text-rose-500 border-rose-500/30">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                <span className="font-bold text-foreground">{liveClasses.length}</span> Live Classes ({liveHours}h)
                            </div>
                        </div>
                    </div>
                );
            })()}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in delay-75">
                <TabsList className="mb-6">
                    <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="live" className="gap-1.5 font-semibold text-red-500"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span> Live Classes</TabsTrigger>
                </TabsList>

                <TabsContent value="curriculum" className="space-y-6">
                    {/* Structuring Approach Switcher Banner */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                {structuringApproach === "weekly" ? <Calendar className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Structuring Approach: {structuringApproach === "weekly" ? "Weekly Mission Schedule" : "Standard Section Modules"}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {structuringApproach === "weekly"
                                        ? "Curriculum structured by Orbit Mission Weeks with topic titles, allocated hours, and time budget validation."
                                        : "Curriculum structured into thematic sections with content duration tracking."}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                size="sm"
                                variant={structuringApproach === "weekly" ? "default" : "outline"}
                                className="gap-1.5 text-xs font-bold"
                                onClick={() => setStructuringApproach("weekly")}
                            >
                                <Calendar className="h-3.5 w-3.5" /> Weekly Approach
                            </Button>
                            <Button
                                size="sm"
                                variant={structuringApproach === "section" ? "default" : "outline"}
                                className="gap-1.5 text-xs font-bold"
                                onClick={() => setStructuringApproach("section")}
                            >
                                <Layers className="h-3.5 w-3.5" /> Section Approach
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">
                            {structuringApproach === "weekly" ? "Weekly Mission Modules" : "Course Content Sections"}
                        </h2>
                        <div className="flex gap-2">
                            <ImportSectionsDialog courseId={id!} onSuccess={fetchSections} />
                            <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 font-bold">
                                        <Plus className="h-4 w-4" /> {structuringApproach === "weekly" ? "Add Weekly Module" : "Add Section"}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{structuringApproach === "weekly" ? "Add Weekly Mission Module" : "Add New Section"}</DialogTitle>
                                        <DialogDescription>
                                            {structuringApproach === "weekly"
                                                ? "Specify week number, module title, topic focus, and allocated hours."
                                                : "Create a new section module to organize chapters and allocated time."}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-3 text-xs">
                                        {structuringApproach === "weekly" && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-bold">Week Number</Label>
                                                    <Input
                                                        type="number"
                                                        value={weekNumber}
                                                        onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-bold">Allocated Duration (Hours)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        value={allocatedHours}
                                                        onChange={(e) => setAllocatedHours(e.target.value)}
                                                        placeholder="e.g. 5.0"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold">Module Title *</Label>
                                            <Input
                                                placeholder={structuringApproach === "weekly" ? "e.g., Week 1: Launch Prep & Orbital Mechanics" : "e.g., Introduction to React"}
                                                value={newSectionTitle}
                                                onChange={(e) => setNewSectionTitle(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold">Topic Focus Name</Label>
                                            <Input
                                                placeholder="e.g., Rocket Propulsion & Electronics"
                                                value={topicName}
                                                onChange={(e) => setTopicName(e.target.value)}
                                            />
                                        </div>

                                        {structuringApproach === "section" && (
                                            <div className="space-y-1">
                                                <Label className="text-xs font-bold">Allocated Duration (Hours)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    value={allocatedHours}
                                                    onChange={(e) => setAllocatedHours(e.target.value)}
                                                    placeholder="e.g. 4.0"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setAddSectionOpen(false)}>Cancel</Button>
                                        <Button onClick={handleAddSection} className="font-bold">Create Module</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <Accordion type="multiple" className="space-y-4">
                        {sections.map((section, idx) => {
                            const sectionMinutes = section.items.reduce((acc: number, item: any) => acc + (item.duration_minutes || item.time_limit_minutes || 0), 0);
                            const allocatedMinutes = (section.allocated_hours || 0) * 60;
                            const isOverBudget = allocatedMinutes > 0 && sectionMinutes > allocatedMinutes;

                            return (
                                <AccordionItem key={section.id} value={section.id} className="border rounded-xl bg-card px-4">
                                    <div className="flex items-center py-4">
                                        <AccordionTrigger className="hover:no-underline flex-1 py-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {structuringApproach === "weekly" && (
                                                    <Badge variant="outline" className="bg-primary/10 text-primary font-mono border-primary/30">
                                                        {section.week_number ? `Week ${section.week_number}` : `Week ${idx + 1}`}
                                                    </Badge>
                                                )}
                                                <span className="font-bold text-base text-foreground">{section.title}</span>
                                                {section.topic_name && (
                                                    <span className="text-xs text-muted-foreground font-medium hidden sm:inline">• {section.topic_name}</span>
                                                )}
                                                {section.allocated_hours > 0 && (
                                                    <Badge variant="outline" className={`font-mono text-xs ${isOverBudget ? 'bg-red-500/10 text-red-600 border-red-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/30'}`}>
                                                        <Clock className="h-3 w-3 mr-1" /> {sectionMinutes}m / {allocatedMinutes}m ({section.allocated_hours}h)
                                                    </Badge>
                                                )}
                                            </div>
                                        </AccordionTrigger>
                                        <div className="flex items-center gap-2 ml-4">
                                            <AddContentDialog sectionId={section.id} onSuccess={fetchSections} />
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSection({ id: section.id, title: section.title });
                                                }}
                                                title="Edit Section Title"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSection(section.id, section.title);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <AccordionContent className="pt-2 pb-4 space-y-2">
                                        {isOverBudget && (
                                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 mb-3 font-semibold">
                                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                                <span>Warning: Total content duration ({sectionMinutes} mins) exceeds allocated module duration ({allocatedMinutes} mins / {section.allocated_hours} hrs). Please adjust item durations.</span>
                                            </div>
                                        )}

                                        {section.items.map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-background flex items-center justify-center border text-muted-foreground">
                                                        {item.type === "video" && <Video className="h-4 w-4 text-amber-500" />}
                                                        {item.type === "pdf" && <FileText className="h-4 w-4 text-emerald-500" />}
                                                        {item.type === "text" && <Type className="h-4 w-4 text-blue-500" />}
                                                        {item.itemType === 'assignment' && <BrainCircuit className="h-4 w-4 text-rose-500" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-sm">{item.title}</p>
                                                            {item.itemType === 'content' && item.duration_minutes != null && (
                                                                <Badge variant="outline" className="text-[10px] font-mono py-0 gap-1">
                                                                    <Clock className="h-2.5 w-2.5" /> {item.duration_minutes}m
                                                                </Badge>
                                                            )}
                                                            {item.itemType === 'assignment' && item.time_limit_minutes && (
                                                                <Badge variant="outline" className="text-[10px] font-mono py-0 gap-1">
                                                                    <Clock className="h-2.5 w-2.5" /> {item.time_limit_minutes}m
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                                            {item.itemType === 'assignment' ? (item.type === 'quiz' ? `Quiz • ${item.points || 100} pts` : `Assignment`) : (item.content_url || "Text Chapter")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => setEditingItem(item)}
                                                        title="Edit Item"
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteItem(item, section.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {section.items.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                                No content in this section. Add some!
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                        {sections.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                No modules created yet. Click "Add Weekly Module" to start building your course.
                            </div>
                        )}
                    </Accordion>
                </TabsContent>

                <TabsContent value="overview">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Course Title</Label>
                                    <Input
                                        value={course.title}
                                        onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Domain / Field of Study</Label>
                                    <Input
                                        value={course.domain || ""}
                                        onChange={(e) => setCourse({ ...course, domain: e.target.value })}
                                        placeholder="e.g. Software Engineering, Data Science & AI, Web Development"
                                    />
                                    <p className="text-xs text-muted-foreground">Categorizes course for student domain discovery.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Course Description</Label>
                                <Textarea
                                    className="min-h-[90px]"
                                    value={course.description || ""}
                                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                    placeholder="Detailed overview of the course content..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Course Objectives (Learning Outcomes)</Label>
                                <Textarea
                                    className="min-h-[90px]"
                                    value={course.objectives || ""}
                                    onChange={(e) => setCourse({ ...course, objectives: e.target.value })}
                                    placeholder="• Master core concepts and algorithms&#10;• Build industry-level projects&#10;• Understand best practices..."
                                />
                                <p className="text-xs text-muted-foreground">Displayed in the pre-enrollment preview dialog for students.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>General Instructions & Guidelines</Label>
                                <Textarea
                                    className="min-h-[90px]"
                                    value={course.instructions || ""}
                                    onChange={(e) => setCourse({ ...course, instructions: e.target.value })}
                                    placeholder="• Submit assignments before deadlines&#10;• Minimum 80% video watch required for completion certificate..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Instructor Introduction & Bio</Label>
                                <Textarea
                                    className="min-h-[90px]"
                                    value={course.instructor_intro || ""}
                                    onChange={(e) => setCourse({ ...course, instructor_intro: e.target.value })}
                                    placeholder="Welcome to the course! I am your instructor with 10+ years of domain experience..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Instructor Video Intro URL <span className="text-muted-foreground text-xs">(YouTube / Google Drive / MP4)</span></Label>
                                    <Input
                                        value={course.instructor_video_url || ""}
                                        onChange={(e) => setCourse({ ...course, instructor_video_url: e.target.value })}
                                        placeholder="https://www.youtube.com/watch?v=... or Google Drive URL"
                                    />
                                    <p className="text-xs text-muted-foreground">Embedded video introduction for students in the preview modal.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Qualifications & Academic Credentials</Label>
                                    <Input
                                        value={course.instructor_qualifications || ""}
                                        onChange={(e) => setCourse({ ...course, instructor_qualifications: e.target.value })}
                                        placeholder="e.g. Ph.D. in Computer Science | Ex-Google Senior Engineer | 10+ Yrs Exp"
                                    />
                                    <p className="text-xs text-muted-foreground">Displayed as credential highlights for students.</p>
                                </div>
                            </div>

                            {/* Social & Professional Profile Links */}
                            <div className="p-4 rounded-xl border bg-card space-y-3">
                                <h4 className="font-bold text-sm text-foreground">Instructor Social & Professional Links</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1">
                                        <Label className="text-xs">LinkedIn Profile URL</Label>
                                        <Input
                                            placeholder="https://linkedin.com/in/username"
                                            value={course.instructor_socials?.linkedin || ""}
                                            onChange={(e) => setCourse({
                                                ...course,
                                                instructor_socials: { ...(course.instructor_socials || {}), linkedin: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">YouTube Channel URL</Label>
                                        <Input
                                            placeholder="https://youtube.com/@channel"
                                            value={course.instructor_socials?.youtube || ""}
                                            onChange={(e) => setCourse({
                                                ...course,
                                                instructor_socials: { ...(course.instructor_socials || {}), youtube: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">X (Twitter) Profile URL</Label>
                                        <Input
                                            placeholder="https://x.com/username"
                                            value={course.instructor_socials?.twitter || ""}
                                            onChange={(e) => setCourse({
                                                ...course,
                                                instructor_socials: { ...(course.instructor_socials || {}), twitter: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Instagram Profile URL</Label>
                                        <Input
                                            placeholder="https://instagram.com/username"
                                            value={course.instructor_socials?.instagram || ""}
                                            onChange={(e) => setCourse({
                                                ...course,
                                                instructor_socials: { ...(course.instructor_socials || {}), instagram: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Exam Policy & Evaluation Rules</Label>
                                <Textarea
                                    className="min-h-[90px]"
                                    value={course.exam_policy || ""}
                                    onChange={(e) => setCourse({ ...course, exam_policy: e.target.value })}
                                    placeholder="• Passing Criterion: 70% minimum score required on quizzes and final exam&#10;• Attempts: Maximum 3 quiz attempts permitted&#10;• Submission Rules: Assignments must be turned in prior to deadline..."
                                />
                                <p className="text-xs text-muted-foreground">Students can review exam rules and grading policies in the pre-enrollment dialog.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Thumbnail URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Input
                                    value={course.thumbnail_url || ""}
                                    onChange={(e) => setCourse({ ...course, thumbnail_url: e.target.value })}
                                    placeholder="https://images.unsplash.com/photo-..."
                                />
                                <p className="text-xs text-muted-foreground">Provide a custom image URL or leave empty for topic-based random thumbnail.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Academic Credit Points (Credits)</Label>
                                    <Input
                                        type="number"
                                        value={course.credit_points !== undefined && course.credit_points !== null ? course.credit_points : 3}
                                        onChange={(e) => setCourse({ ...course, credit_points: parseInt(e.target.value) || 0 })}
                                        placeholder="3"
                                        min="1"
                                        max="30"
                                    />
                                    <p className="text-xs text-muted-foreground">Specify academic credits awarded to students upon completing this course.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Required Video Watch Percentage for Completion</Label>
                                    <select
                                        value={course.min_watch_percent !== undefined && course.min_watch_percent !== null ? course.min_watch_percent : 80}
                                        onChange={(e) => setCourse({ ...course, min_watch_percent: parseInt(e.target.value) })}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value={0}>0% - No watch restriction</option>
                                        <option value={25}>25% Watch Required</option>
                                        <option value={50}>50% Watch Required</option>
                                        <option value={75}>75% Watch Required</option>
                                        <option value={80}>80% Watch Required (Recommended)</option>
                                        <option value={90}>90% Watch Required</option>
                                        <option value={100}>100% Full Watch Required</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground">Students must watch at least this percentage of a video before clicking "Mark as Complete".</p>
                                </div>
                            </div>

                            {/* Course Pricing & Organization Settings */}
                            <div className="p-4 rounded-xl border bg-card space-y-4">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                    🏢 Course Pricing & Organization Settings
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Course Price (₹) <span className="text-muted-foreground text-xs">(0 = Free)</span></Label>
                                        <Input
                                            type="number"
                                            value={course.price !== undefined && course.price !== null ? course.price : 0}
                                            onChange={(e) => setCourse({ ...course, price: parseFloat(e.target.value) || 0 })}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Original/MRP Price (₹) <span className="text-muted-foreground text-xs">(for strikethrough MRP)</span></Label>
                                        <Input
                                            type="number"
                                            value={course.original_price !== undefined && course.original_price !== null ? course.original_price : 0}
                                            onChange={(e) => setCourse({ ...course, original_price: parseFloat(e.target.value) || 0 })}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Launching Organization / Institution Name</Label>
                                        <Input
                                            value={course.organization_name || ""}
                                            onChange={(e) => setCourse({ ...course, organization_name: e.target.value })}
                                            placeholder="e.g. Orbit Academy, Google, IIT Madras"
                                        />
                                        <p className="text-xs text-muted-foreground">Appears alongside the course card for students.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Organization Logo URL</Label>
                                        <Input
                                            value={course.organization_logo_url || ""}
                                            onChange={(e) => setCourse({ ...course, organization_logo_url: e.target.value })}
                                            placeholder="https://logo.clearbit.com/organization.com"
                                        />
                                        <p className="text-xs text-muted-foreground">Logo image URL displayed on student course cards.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Co-Teachers & Course Collaborators Management */}
                            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                            <Users className="h-4 w-4 text-primary" /> Co-Teachers & Course Collaborators
                                        </h4>
                                        <p className="text-xs text-muted-foreground">Add other teachers so you both can edit curriculum, live sessions, assignments, and grade students together.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter co-teacher's registered email address..."
                                        value={collaboratorEmail}
                                        onChange={(e) => setCollaboratorEmail(e.target.value)}
                                        className="bg-background text-xs"
                                    />
                                    <Button type="button" size="sm" onClick={handleAddCollaborator} className="gap-1.5 shrink-0">
                                        <Plus className="h-4 w-4" /> Invite Co-Teacher
                                    </Button>
                                </div>
                                {collaborators.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {collaborators.map((c: any) => (
                                            <Badge key={c.id} variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs">
                                                <span>🤝 {c.teacher?.full_name || c.teacher?.email}</span>
                                                <X className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" onClick={() => handleRemoveCollaborator(c.id)} />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={() => updateCourseInfo({ 
                                    title: course.title, 
                                    description: course.description, 
                                    thumbnail_url: course.thumbnail_url, 
                                    min_watch_percent: course.min_watch_percent, 
                                    credit_points: course.credit_points,
                                    domain: course.domain,
                                    objectives: course.objectives,
                                    instructions: course.instructions,
                                    instructor_intro: course.instructor_intro,
                                    exam_policy: course.exam_policy,
                                    instructor_video_url: course.instructor_video_url,
                                    instructor_qualifications: course.instructor_qualifications,
                                    instructor_socials: course.instructor_socials,
                                    price: course.price,
                                    original_price: course.original_price,
                                    organization_name: course.organization_name,
                                    organization_logo_url: course.organization_logo_url
                                })}>Save Changes</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="students">
                    <div className="space-y-4 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-bold">Student Enrollments & Verifications</h2>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => setBulkStudentOpen(true)} className="gap-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold">
                                    <UserPlus className="h-4 w-4" /> Bulk Create Student IDs
                                </Button>
                                <Button variant="outline" onClick={exportToCSV} className="gap-2 font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                                    Download Time & Progress Report (.CSV)
                                </Button>
                            </div>
                        </div>

                        {/* Search & Filter Control Bar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/20 p-3 rounded-xl border border-border">
                            {/* Search for Student Name, Email, or Transaction ID */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by Student Name, Email, or Transaction / Reference ID..."
                                    className="pl-9 bg-background"
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden md:block" />
                                <select
                                    value={statusFilter}
                                    onChange={(e: any) => setStatusFilter(e.target.value)}
                                    className="h-10 px-3 py-1 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending Verification</option>
                                    <option value="approved">Active / Approved</option>
                                    <option value="rejected">Declined</option>
                                </select>
                            </div>

                            {/* Date Filter */}
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0 hidden md:block" />
                                <select
                                    value={dateFilter}
                                    onChange={(e: any) => setDateFilter(e.target.value)}
                                    className="h-10 px-3 py-1 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="all">All Dates</option>
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                </select>
                            </div>
                        </div>

                        {/* Batch Operations Bar */}
                        {(() => {
                            const filtered = enrollments.filter((e: any) => {
                                const q = studentSearch.toLowerCase().trim();
                                const nameMatch = (e.student?.full_name || "").toLowerCase().includes(q);
                                const emailMatch = (e.student?.email || "").toLowerCase().includes(q);
                                const txnMatch = (e.transaction_id || "").toLowerCase().includes(q);
                                const matchesSearch = !q || nameMatch || emailMatch || txnMatch;
                                const matchesStatus = statusFilter === "all" || e.status === statusFilter;
                                
                                let matchesDate = true;
                                if (dateFilter !== "all" && e.enrolled_at) {
                                    const enrDate = new Date(e.enrolled_at);
                                    const now = new Date();
                                    if (dateFilter === "today") {
                                        matchesDate = enrDate.toDateString() === now.toDateString();
                                    } else if (dateFilter === "week") {
                                        const weekAgo = new Date();
                                        weekAgo.setDate(now.getDate() - 7);
                                        matchesDate = enrDate >= weekAgo;
                                    } else if (dateFilter === "month") {
                                        const monthAgo = new Date();
                                        monthAgo.setDate(now.getDate() - 30);
                                        matchesDate = enrDate >= monthAgo;
                                    }
                                }
                                return matchesSearch && matchesStatus && matchesDate;
                            });

                            const pendingFiltered = filtered.filter((e: any) => e.status === "pending");
                            const allSelected = pendingFiltered.length > 0 && pendingFiltered.every((e: any) => selectedEnrollments.includes(e.id));

                            return (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-card border">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (allSelected) {
                                                    setSelectedEnrollments([]);
                                                } else {
                                                    setSelectedEnrollments(pendingFiltered.map((e: any) => e.id));
                                                }
                                            }}
                                            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                                            disabled={pendingFiltered.length === 0}
                                        >
                                            {allSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                                            Select All Pending ({pendingFiltered.length})
                                        </button>
                                        <span className="text-xs text-muted-foreground">
                                            Showing {filtered.length} of {enrollments.length} enrollments
                                        </span>
                                    </div>

                                    {selectedEnrollments.length > 0 && (
                                        <div className="flex items-center gap-2 animate-fade-in">
                                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                                                {selectedEnrollments.length} Selected
                                            </span>
                                            <Button size="sm" onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700 text-white gap-1">
                                                <CheckCircle className="h-4 w-4" /> Approve Selected
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={handleBulkDecline} className="gap-1">
                                                <XCircle className="h-4 w-4" /> Decline Selected
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Enrollment Cards */}
                    <div className="space-y-3">
                        {(() => {
                            const filtered = enrollments.filter((enrollment: any) => {
                                const q = studentSearch.toLowerCase().trim();
                                const nameMatch = (enrollment.student?.full_name || "").toLowerCase().includes(q);
                                const emailMatch = (enrollment.student?.email || "").toLowerCase().includes(q);
                                const txnMatch = (enrollment.transaction_id || "").toLowerCase().includes(q);
                                const matchesSearch = !q || nameMatch || emailMatch || txnMatch;
                                const matchesStatus = statusFilter === "all" || enrollment.status === statusFilter;
                                
                                let matchesDate = true;
                                if (dateFilter !== "all" && enrollment.enrolled_at) {
                                    const enrDate = new Date(enrollment.enrolled_at);
                                    const now = new Date();
                                    if (dateFilter === "today") {
                                        matchesDate = enrDate.toDateString() === now.toDateString();
                                    } else if (dateFilter === "week") {
                                        const weekAgo = new Date();
                                        weekAgo.setDate(now.getDate() - 7);
                                        matchesDate = enrDate >= weekAgo;
                                    } else if (dateFilter === "month") {
                                        const monthAgo = new Date();
                                        monthAgo.setDate(now.getDate() - 30);
                                        matchesDate = enrDate >= monthAgo;
                                    }
                                }
                                return matchesSearch && matchesStatus && matchesDate;
                            });

                            if (filtered.length === 0) {
                                return (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                        No matching enrollments found.
                                    </div>
                                );
                            }

                            return filtered.map((enrollment: any) => {
                                const isSelected = selectedEnrollments.includes(enrollment.id);

                                return (
                                    <div key={enrollment.id} className={`flex items-center justify-between p-4 border rounded-xl bg-card transition-all ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:border-border"}`}>
                                        <div className="flex items-center gap-4">
                                            {/* Checkbox for Bulk Approval */}
                                            {enrollment.status === 'pending' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedEnrollments(selectedEnrollments.filter(id => id !== enrollment.id));
                                                        } else {
                                                            setSelectedEnrollments([...selectedEnrollments, enrollment.id]);
                                                        }
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                                                </button>
                                            )}

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
                                                {enrollment.transaction_id && (
                                                    <p className="text-xs font-mono bg-muted px-2 py-0.5 rounded inline-block mt-1 border">
                                                        UPI / Txn ID: <span className="font-bold text-foreground">{enrollment.transaction_id}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right flex items-center justify-end gap-3">
                                            {enrollment.status === 'pending' ? (
                                                <>
                                                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending Verification</Badge>
                                                    <Button size="sm" onClick={() => handleApproveEnrollment(enrollment.id)} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                                                        <CheckCircle className="h-4 w-4" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleDeclineEnrollment(enrollment.id)} className="gap-1.5">
                                                        <XCircle className="h-4 w-4" /> Decline
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Badge variant={enrollment.status === 'rejected' ? "destructive" : (enrollment.completed ? "success" : "default")} className={enrollment.status === 'rejected' ? "bg-red-500/10 text-red-600 border-red-500/20" : enrollment.completed ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}>
                                                        {enrollment.status === 'rejected' ? "Declined" : (enrollment.completed ? "🎓 Completed (Credits Awarded)" : "Active (No Credits Yet)")}
                                                    </Badge>
                                                    {enrollment.status !== 'rejected' && !enrollment.completed && (
                                                        <Button size="sm" onClick={() => handleMarkCompleted(enrollment.id, enrollment.student?.full_name || "Student")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                                                            <Award className="h-4 w-4" /> Mark Completed & Award Credits
                                                        </Button>
                                                    )}
                                                    {enrollment.completed && (
                                                        <Button size="sm" variant="outline" onClick={() => handleUnmarkCompleted(enrollment.id, enrollment.student?.full_name || "Student")} className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 font-semibold">
                                                            <XCircle className="h-4 w-4" /> Revoke Completion
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-2" onClick={() => handleDeleteEnrollment(enrollment.id)} title="Remove Student">
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
                                );
                            });
                        })()}
                    </div>
                </TabsContent>

                {/* Bulk Student Creator Modal */}
                <BulkStudentCreatorModal
                    open={bulkStudentOpen}
                    onOpenChange={setBulkStudentOpen}
                    courseId={id || ""}
                    courseTitle={course?.title || "Course"}
                    onSuccess={fetchCourseDetails}
                />

                {/* Live Classes Tab */}
                <TabsContent value="live">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                                    Live Classes & Online Interactive Sessions
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">Schedule Google Meet or Zoom classes for students enrolled in this course.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleExportAllAttendanceExcel}
                                    className="gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold"
                                >
                                    <Download className="h-4 w-4" /> Export All Attendance Matrix 📊
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setBulkLiveOpen(true)}
                                    className="gap-2 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/5 font-semibold"
                                >
                                    <FileJson className="h-4 w-4" /> Bulk Import Sessions (JSON / CSV)
                                </Button>
                                <Dialog open={addLiveOpen} onOpenChange={setAddLiveOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold">
                                            <Video className="h-4 w-4" /> Schedule Live Class
                                        </Button>
                                    </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Schedule New Live Class</DialogTitle>
                                        <DialogDescription>Add a Google Meet or Zoom link with date and time for your students.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold">Map to Week / Section Module (Optional)</Label>
                                            <select
                                                value={selectedSectionForLive}
                                                onChange={(e) => setSelectedSectionForLive(e.target.value)}
                                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                <option value="">-- Standalone Live Class (No Module Mapping) --</option>
                                                {sections.map((sec: any, idx: number) => (
                                                    <option key={sec.id} value={sec.id}>
                                                        {sec.week_number ? `Week ${sec.week_number}: ` : `Module ${idx + 1}: `}{sec.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[11px] text-muted-foreground">Mapping automatically embeds live lecture item into selected week's curriculum outline.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Class Title *</Label>
                                            <Input
                                                placeholder="e.g., Module 3: Live Q&A & Code Demo"
                                                value={liveTitle}
                                                onChange={(e) => setLiveTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Meeting URL (Google Meet / Zoom / Teams)</Label>
                                            <Input
                                                type="url"
                                                placeholder="https://meet.google.com/abc-defg-hij"
                                                value={liveMeetingLink}
                                                onChange={(e) => setLiveMeetingLink(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Date & Time</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={liveScheduledAt}
                                                    onChange={(e) => setLiveScheduledAt(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Duration (Minutes)</Label>
                                                <Input
                                                    type="number"
                                                    value={liveDuration}
                                                    onChange={(e) => setLiveDuration(e.target.value)}
                                                    placeholder="60"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description / Topics Covered</Label>
                                            <Textarea
                                                placeholder="Brief overview of what will be discussed in the live session..."
                                                value={liveDescription}
                                                onChange={(e) => setLiveDescription(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setAddLiveOpen(false)}>Cancel</Button>
                                        <Button onClick={handleAddLiveClass} className="bg-red-600 hover:bg-red-700 text-white">Create Live Class</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {liveClasses.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                        No live classes scheduled for this course. Click "Schedule Live Class" to create one.
                                    </div>
                                ) : (
                                    liveClasses.map((lc) => (
                                        <div key={lc.id} className="p-4 border rounded-xl bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-mono text-[10px]">
                                                        {new Date(lc.scheduled_at) <= new Date() ? "🔴 LIVE NOW" : "UPCOMING"}
                                                    </Badge>
                                                    <h3 className="font-bold text-base">{lc.title}</h3>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{lc.description || "No description provided."}</p>
                                                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                                                    <span>📅 {new Date(lc.scheduled_at).toLocaleString()}</span>
                                                    <span>⏱️ {lc.duration_minutes || 60} mins</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold"
                                                    onClick={() => openLiveAttendanceModal(lc)}
                                                >
                                                    <CheckSquare className="h-4 w-4" /> Take Attendance 📋
                                                </Button>
                                                <a href={lc.meeting_link} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold">
                                                        <Video className="h-4 w-4" /> Start / Join Meeting ↗
                                                    </Button>
                                                </a>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary" onClick={() => setEditingLiveClass(lc)} title="Edit Live Class">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLiveClass(lc.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <BulkLiveClassImporterModal
                open={bulkLiveOpen}
                onOpenChange={setBulkLiveOpen}
                courseId={id || ""}
                courseTitle={course?.title}
                onSuccess={fetchLiveClasses}
            />
            <ExamPaperDesignerModal
                open={examDesignerOpen}
                onOpenChange={setExamDesignerOpen}
                courseTitle={course?.title}
                courseDomain={course?.domain}
            />
            <EditSectionDialog
                section={editingSection}
                open={!!editingSection}
                onOpenChange={(open) => !open && setEditingSection(null)}
                onSuccess={fetchSections}
            />
            {/* Edit Live Class Dialog */}
            <EditLiveClassDialog
                liveClass={editingLiveClass}
                open={!!editingLiveClass}
                onOpenChange={(open) => !open && setEditingLiveClass(null)}
                onSave={handleEditLiveClass}
            />
            <EditItemDialog
                item={editingItem}
                open={!!editingItem}
                onOpenChange={(open) => !open && setEditingItem(null)}
                onSuccess={fetchSections}
            />

            {/* 📋 Live Class Attendance Modal */}
            <Dialog open={!!attendanceClassModal} onOpenChange={(open) => !open && setAttendanceClassModal(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <CheckSquare className="h-5 w-5 text-emerald-500" />
                            Live Class Attendance: {attendanceClassModal?.title}
                        </DialogTitle>
                        <DialogDescription>
                            Mark student attendance for live session conducted on {attendanceClassModal?.scheduled_at ? new Date(attendanceClassModal.scheduled_at).toLocaleString() : ""}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border text-xs text-muted-foreground">
                            <span>Total Enrolled Students: <strong className="text-foreground">{attendanceStudents.length}</strong></span>
                            <div className="flex gap-2 font-mono">
                                <span className="text-emerald-600 font-bold">P = Present</span>
                                <span className="text-red-500 font-bold">A = Absent</span>
                                <span className="text-amber-500 font-bold">L = Late</span>
                            </div>
                        </div>

                        <div className="divide-y border rounded-xl overflow-hidden">
                            {attendanceStudents.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    No approved students enrolled in this course yet.
                                </div>
                            ) : (
                                attendanceStudents.map((st) => {
                                    const currentStatus = attendanceStatusMap[st.id] || 'present';
                                    return (
                                        <div key={st.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border">
                                                    <AvatarImage src={st.avatar} />
                                                    <AvatarFallback>{st.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold text-sm">{st.name}</p>
                                                    <p className="text-xs text-muted-foreground">{st.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant={currentStatus === 'present' ? 'default' : 'outline'}
                                                    className={currentStatus === 'present' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 'text-xs'}
                                                    onClick={() => setAttendanceStatusMap(prev => ({ ...prev, [st.id]: 'present' }))}
                                                >
                                                    P
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={currentStatus === 'absent' ? 'default' : 'outline'}
                                                    className={currentStatus === 'absent' ? 'bg-red-600 hover:bg-red-700 text-white font-bold' : 'text-xs'}
                                                    onClick={() => setAttendanceStatusMap(prev => ({ ...prev, [st.id]: 'absent' }))}
                                                >
                                                    A
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={currentStatus === 'late' ? 'default' : 'outline'}
                                                    className={currentStatus === 'late' ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold' : 'text-xs'}
                                                    onClick={() => setAttendanceStatusMap(prev => ({ ...prev, [st.id]: 'late' }))}
                                                >
                                                    L
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setAttendanceClassModal(null)}>Cancel</Button>
                            <Button onClick={saveLiveAttendance} disabled={savingAttendance} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                                {savingAttendance && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                                Save Attendance 📋
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </TeacherLayout>
    );
}

function AddContentDialog({ sectionId, onSuccess }: { sectionId: string, onSuccess: () => void }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<"video" | "pdf" | "text" | "quiz" | "assignment">("video");
    const [title, setTitle] = useState("");
    const [contentUrl, setContentUrl] = useState("");
    const [htmlContent, setHtmlContent] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("30");

    // Quiz specific state
    const [dueDate, setDueDate] = useState("");
    const [timeLimit, setTimeLimit] = useState("60");
    const [points, setPoints] = useState("100");

    // Assignment specific state
    const [maxFileSize, setMaxFileSize] = useState("10");
    const [allowedTypes, setAllowedTypes] = useState<string[]>(["pdf", "doc", "docx", "txt", "zip"]);
    const [teacherDriveUrl, setTeacherDriveUrl] = useState("");

    const handleAddContent = async () => {
        if (!title) return;

        try {
            let error;
            const { data: sectionData } = await supabase.from('course_sections').select('course_id').eq('id', sectionId).single();
            if (!sectionData) throw new Error("Section not found");

            if (type === 'quiz' || type === 'assignment') {
                const assignmentData: any = {
                    course_id: sectionData.course_id,
                    section_id: sectionId,
                    title,
                    type: type,
                    due_date: dueDate || null,
                    points: points ? parseInt(points) : 100,
                    description: htmlContent
                };

                if (type === 'quiz') {
                    assignmentData.time_limit_minutes = timeLimit ? parseInt(timeLimit) : null;
                } else if (type === 'assignment') {
                    assignmentData.allowed_file_types = allowedTypes;
                    assignmentData.max_file_size_mb = maxFileSize ? parseInt(maxFileSize) : 10;
                    assignmentData.teacher_drive_url = teacherDriveUrl.trim() || null;
                }

                const res = await supabase.from('assignments').insert([assignmentData]);
                error = res.error;
            } else {
                const contentPayload: any = {
                    section_id: sectionId,
                    title,
                    type,
                    duration_minutes: durationMinutes ? parseInt(durationMinutes) : 30
                };
                if (type === "text") {
                    contentPayload.content_text = htmlContent;
                } else if (type === "video") {
                    contentPayload.content_url = isGoogleDriveUrl(contentUrl) ? getGoogleDriveEmbedUrl(contentUrl) : contentUrl;
                    contentPayload.video_url = contentPayload.content_url;
                } else {
                    contentPayload.content_url = contentUrl;
                }
                const res = await supabase.from('section_contents').insert([contentPayload]);
                error = res.error;
            }

            if (error) throw error;

            toast({ title: "Content Added" });
            setOpen(false);
            onSuccess();

            // Reset form
            setTitle("");
            setContentUrl("");
            setHtmlContent("");
            setDurationMinutes("30");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 font-bold">
                    <Plus className="h-3.5 w-3.5" /> Add Content
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Content to Module</DialogTitle>
                    <DialogDescription>Choose content type and allocate time duration.</DialogDescription>
                </DialogHeader>
                <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
                    <TabsList className="grid w-full grid-cols-6 mb-4">
                        <TabsTrigger value="video">Video</TabsTrigger>
                        <TabsTrigger value="presentation">Presentation</TabsTrigger>
                        <TabsTrigger value="pdf">PDF / Doc</TabsTrigger>
                        <TabsTrigger value="text">Text</TabsTrigger>
                        <TabsTrigger value="quiz">Quiz</TabsTrigger>
                        <TabsTrigger value="assignment">Assignment</TabsTrigger>
                    </TabsList>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-xs font-bold">Item Title *</Label>
                                <Input placeholder="e.g., Chapter 1 Lecture" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Allocated Time (Mins)</Label>
                                <Input type="number" placeholder="e.g. 30" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                            </div>
                        </div>

                        {type === "video" && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Video / Google Drive Recorded Lecture Link</Label>
                                    {contentUrl && isGoogleDriveUrl(contentUrl) && (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                                            <ShieldCheck className="h-3 w-3" /> Google Drive Protection
                                        </Badge>
                                    )}
                                </div>
                                <Input
                                    placeholder="e.g., https://drive.google.com/file/d/1A2b3C4d.../view or YouTube link"
                                    value={contentUrl}
                                    onChange={(e) => setContentUrl(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Paste your Google Drive recorded video link or YouTube video URL.
                                </p>
                            </div>
                        )}

                        {type === "presentation" && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Google Slides / Presentation Link</Label>
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] gap-1">
                                        <ShieldCheck className="h-3 w-3" /> Secure Deck Protection
                                    </Badge>
                                </div>
                                <Input
                                    placeholder="e.g. https://docs.google.com/presentation/d/1A2b3C4d.../embed or Google Drive link"
                                    value={contentUrl}
                                    onChange={(e) => setContentUrl(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Paste Google Slides embed link, Google Drive presentation URL, or Canva presentation link. It will render in a secure, anti-leak embedded viewer for students.
                                </p>
                            </div>
                        )}

                        {(type === "pdf" || type === "document" || type === "reference") && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>PDF / Document / Reference Material Link</Label>
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1">
                                        <ShieldCheck className="h-3 w-3" /> Proprietary Embed Protection
                                    </Badge>
                                </div>
                                <Input
                                    placeholder="e.g., https://drive.google.com/file/d/1A2b3C4d.../view or Google Doc URL"
                                    value={contentUrl}
                                    onChange={(e) => setContentUrl(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Paste Google Drive PDF / Doc URL or reference material link. Students will view it inside the secure embedded viewer without direct download access.
                                </p>
                            </div>
                        )}


                        {type === "text" && (
                            <div className="space-y-2">
                                <Label>Content & Lesson Material</Label>
                                <MarkdownEditor
                                    value={htmlContent}
                                    onChange={setHtmlContent}
                                    placeholder="Write formatted lesson notes... Use H1 (#), H2 (##), Bold (**), Bullet (- )"
                                />
                            </div>
                        )}

                        {type === "quiz" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Due Date</Label>
                                        <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Time Limit (minutes)</Label>
                                        <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Points</Label>
                                    <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Instructions</Label>
                                    <Textarea
                                        placeholder="Quiz instructions..."
                                        value={htmlContent}
                                        onChange={(e) => setHtmlContent(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {type === "assignment" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Due Date</Label>
                                        <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Total Points</Label>
                                        <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Instructions</Label>
                                    <Textarea
                                        placeholder="Assignment instructions..."
                                        value={htmlContent}
                                        onChange={(e) => setHtmlContent(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-primary">Upload to My Drive Folder Link <span className="text-muted-foreground text-xs font-normal">(Optional)</span></Label>
                                    <Input
                                        type="url"
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        value={teacherDriveUrl}
                                        onChange={(e) => setTeacherDriveUrl(e.target.value)}
                                        className="bg-background"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Provide your Google Drive folder URL if you want students to click <strong>"Upload to Sir's Drive ↗"</strong> and submit their assignment files directly to your Drive folder.
                                    </p>
                                </div>
                                <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                    <h4 className="font-semibold text-sm">File Upload Restrictions</h4>
                                    <div className="space-y-2">
                                        <Label>Max File Size (MB)</Label>
                                        <Input
                                            type="number"
                                            value={maxFileSize}
                                            onChange={(e) => setMaxFileSize(e.target.value)}
                                            placeholder="10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Allowed File Types</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'zip'].map(fileType => (
                                                <label key={fileType} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={allowedTypes.includes(fileType)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setAllowedTypes([...allowedTypes, fileType]);
                                                            } else {
                                                                setAllowedTypes(allowedTypes.filter(t => t !== fileType));
                                                            }
                                                        }}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm">.{fileType}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddContent}>Add Item</Button>
                    </DialogFooter>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function ImportSectionsDialog({ courseId, structuringApproach = "weekly", onSuccess }: { courseId: string; structuringApproach?: "weekly" | "section"; onSuccess: () => void }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [jsonText, setJsonText] = useState("");
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [validationErrors, setValidationErrors] = useState<any[]>([]);
    const [parsedSections, setParsedSections] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    // Download template function
    const handleDownloadTemplate = () => {
        const templateData = SAMPLE_COURSE_JSON.sections || [];
        const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = structuringApproach === "weekly" ? "weekly_modules_template.json" : "course_sections_template.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Template Downloaded", description: "JSON template saved to your computer." });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === "string") {
                setJsonText(result);
                validateJson(result);
            }
        };
        reader.readAsText(file);
    };

    const validateJson = (text: string) => {
        if (!text.trim()) {
            setIsValid(null);
            setValidationErrors([]);
            setParsedSections([]);
            return;
        }

        try {
            const parsed = JSON.parse(text);
            const sectionsArray = Array.isArray(parsed) ? parsed : (parsed.sections || []);

            if (!Array.isArray(sectionsArray) || sectionsArray.length === 0) {
                setIsValid(false);
                setValidationErrors([{ path: "root", message: "JSON must represent a non-empty array of sections." }]);
                setParsedSections([]);
                return;
            }

            const mockCourse = { title: "Mock Title", sections: sectionsArray };
            const { valid, errors } = validateCourseJson(mockCourse);

            setIsValid(valid);
            setValidationErrors(errors);
            if (valid) {
                setParsedSections(sectionsArray);
            } else {
                setParsedSections([]);
            }
        } catch (err: any) {
            setIsValid(false);
            setValidationErrors([{ path: "parsing", message: `Invalid JSON syntax: ${err.message}` }]);
            setParsedSections([]);
        }
    };

    const handleImport = async () => {
        if (!isValid || parsedSections.length === 0) return;

        setIsImporting(true);
        try {
            const mockPayload: any = {
                title: "Appended",
                sections: parsedSections
            };
            const result = await importCourseFromJson(mockPayload, courseId);
            if (result.success) {
                toast({
                    title: "Modules Imported Successfully! 🚀",
                    description: `Added ${result.sectionsCreated} modules/sections with contents.`
                });
                setOpen(false);
                setJsonText("");
                setParsedSections([]);
                setIsValid(null);
                onSuccess();
            } else {
                toast({
                    variant: "destructive",
                    title: "Import Failed",
                    description: result.errors[0] || "Failed to append sections."
                });
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: err.message
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10 text-primary font-bold">
                    <Sparkles className="h-4 w-4" /> {structuringApproach === "weekly" ? "Import Weekly JSON" : "Import Section JSON"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" /> Import Sections via JSON
                    </DialogTitle>
                    <DialogDescription>
                        Paste JSON structure of sections or upload file. This will append new sections to the current course.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    <div className="flex justify-between items-center">
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" /> Download JSON Template
                        </Button>
                        <Button variant="outline" size="sm" className="relative cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" /> Upload JSON File
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label>JSON Data</Label>
                        <Textarea
                            placeholder='[ { "title": "Section Title", "items": [ { "title": "Lesson Video", "type": "video", "url": "..." } ] } ]'
                            className="min-h-[250px] font-mono text-xs"
                            value={jsonText}
                            onChange={(e) => {
                                setJsonText(e.target.value);
                                validateJson(e.target.value);
                            }}
                        />
                    </div>

                    {jsonText && (
                        <div className={`p-3 rounded-lg border flex gap-3 text-xs ${
                            isValid
                                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/5 border-destructive/20 text-destructive dark:text-red-400"
                        }`}>
                            {isValid ? (
                                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                            ) : (
                                <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                            )}
                            <div className="flex-1 space-y-1">
                                <p className="font-semibold">
                                    {isValid ? "JSON validation passed!" : "JSON contains validation errors:"}
                                </p>
                                {validationErrors.length > 0 && (
                                    <ul className="list-disc list-inside space-y-1 font-mono text-[11px] opacity-90 max-h-24 overflow-y-auto">
                                        {validationErrors.map((error, idx) => (
                                            <li key={idx}>
                                                <span className="font-bold mr-1">[{error.path}]:</span>
                                                {error.message}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={!isValid || isImporting} className="gap-2">
                        {isImporting ? (
                          <>Importing...</>
                        ) : (
                          <>
                            <Play className="h-4 w-4" /> Import Sections
                          </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── EDIT SECTION TITLE DIALOG ──
function EditSectionDialog({ section, onSuccess, open, onOpenChange }: { section: any | null; onSuccess: () => void; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const [title, setTitle] = useState("");
    const [auraPoints, setAuraPoints] = useState<number>(10);

    useEffect(() => {
        if (section) {
            setTitle(section.title);
            setAuraPoints(section.aura_points !== undefined && section.aura_points !== null ? section.aura_points : 10);
        }
    }, [section]);

    const handleSave = async () => {
        if (!section || !title.trim()) return;
        try {
            const { error } = await supabase
                .from('course_sections')
                .update({ title: title.trim(), aura_points: auraPoints })
                .eq('id', section.id);

            if (error) throw error;
            toast({ title: "Section Updated ✨", description: "Section title and Aura Points updated successfully." });
            onOpenChange(false);
            onSuccess();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Section & ✨ Aura Points</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-3">
                    <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Section 1: Introduction" />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-amber-500 font-semibold">
                            <Sparkles className="h-4 w-4" /> Section Aura Points (Optional XP)
                        </Label>
                        <Input
                            type="number"
                            value={auraPoints}
                            onChange={(e) => setAuraPoints(parseInt(e.target.value) || 0)}
                            placeholder="10"
                            min="0"
                            max="100"
                        />
                        <p className="text-xs text-muted-foreground">Students earn these ✨ Aura Points upon completing all lessons in this section.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── EDIT ITEM DIALOG (Video, PDF, Text, Assignment, Quiz) ──
function EditItemDialog({ item, onSuccess, open, onOpenChange }: { item: any | null; onSuccess: () => void; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const [title, setTitle] = useState("");
    const [contentUrl, setContentUrl] = useState("");
    const [htmlContent, setHtmlContent] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [points, setPoints] = useState("100");
    const [timeLimit, setTimeLimit] = useState("60");
    const [durationMinutes, setDurationMinutes] = useState("30");

    useEffect(() => {
        if (item) {
            setTitle(item.title || "");
            setContentUrl(item.content_url || item.video_url || item.pdf_url || "");
            setHtmlContent(item.content_text || item.description || "");
            setDueDate(item.due_date ? new Date(item.due_date).toISOString().slice(0, 16) : "");
            setPoints(item.points ? item.points.toString() : "100");
            setTimeLimit(item.time_limit_minutes ? item.time_limit_minutes.toString() : "60");
            setDurationMinutes(item.duration_minutes != null ? item.duration_minutes.toString() : "30");
        }
    }, [item]);

    if (!item) return null;

    const handleSave = async () => {
        if (!title.trim()) return;

        try {
            let error;
            if (item.itemType === 'assignment') {
                const assignmentData: any = {
                    title,
                    description: htmlContent,
                    points: points ? parseInt(points) : 100,
                    due_date: dueDate || null
                };
                if (item.type === 'quiz') {
                    assignmentData.time_limit_minutes = timeLimit ? parseInt(timeLimit) : null;
                }
                const res = await supabase.from('assignments').update(assignmentData).eq('id', item.id);
                error = res.error;
            } else {
                const contentPayload: any = {
                    title,
                    duration_minutes: durationMinutes ? parseInt(durationMinutes) : 0
                };
                if (item.type === 'text') {
                    contentPayload.content_text = htmlContent;
                } else if (item.type === 'video') {
                    contentPayload.content_url = isGoogleDriveUrl(contentUrl) ? getGoogleDriveEmbedUrl(contentUrl) : contentUrl;
                    contentPayload.video_url = contentPayload.content_url;
                } else {
                    contentPayload.content_url = contentUrl;
                }
                const res = await supabase.from('section_contents').update(contentPayload).eq('id', item.id);
                error = res.error;
            }

            if (error) throw error;

            toast({ title: "Item Updated", description: `"${title}" has been updated.` });
            onOpenChange(false);
            onSuccess();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit {item.itemType === 'assignment' ? (item.type === 'quiz' ? 'Quiz' : 'Assignment') : item.type.toUpperCase()}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-3">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-2">
                            <Label>Title</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        {item.itemType === 'content' && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Allocated Time (Mins)</Label>
                                <Input type="number" min="0" placeholder="e.g. 30" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                            </div>
                        )}
                    </div>

                    {item.type === 'video' && (
                        <div className="space-y-2">
                            <Label>Video / Google Drive Link</Label>
                            <Input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
                        </div>
                    )}

                    {item.type === 'pdf' && (
                        <div className="space-y-2">
                            <Label>PDF URL</Label>
                            <Input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
                        </div>
                    )}

                    {item.type === 'text' && (
                        <div className="space-y-2">
                            <Label>Content & Lesson Material</Label>
                            <MarkdownEditor
                                value={htmlContent}
                                onChange={setHtmlContent}
                                placeholder="Edit formatted lesson notes... Use H1 (#), H2 (##), Bold (**)"
                            />
                        </div>
                    )}

                    {(item.itemType === 'assignment') && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Points</Label>
                                    <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
                                </div>
                            </div>
                            {item.type === 'quiz' && (
                                <div className="space-y-2">
                                    <Label>Time Limit (minutes)</Label>
                                    <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Instructions / Description</Label>
                                <Textarea className="min-h-[120px]" value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditLiveClassDialog({ liveClass, open, onOpenChange, onSave }: {
    liveClass: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: { title: string; meeting_link: string; scheduled_at: string; duration_minutes: number; description: string }) => void;
}) {
    const [title, setTitle] = useState("");
    const [meetingLink, setMeetingLink] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [duration, setDuration] = useState("60");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (liveClass) {
            setTitle(liveClass.title || "");
            setMeetingLink(liveClass.meeting_link || "");
            setScheduledAt(liveClass.scheduled_at ? new Date(liveClass.scheduled_at).toISOString().slice(0, 16) : "");
            setDuration(liveClass.duration_minutes ? liveClass.duration_minutes.toString() : "60");
            setDescription(liveClass.description || "");
        }
    }, [liveClass]);

    if (!liveClass) return null;

    const timeChanged = liveClass.scheduled_at && scheduledAt && new Date(liveClass.scheduled_at).getTime() !== new Date(scheduledAt).getTime();
    const linkChanged = liveClass.meeting_link !== meetingLink;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" /> Edit Live Class Session
                    </DialogTitle>
                    <DialogDescription>Update the details of this live session. Students will be notified of timing/link changes.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-3">
                    <div className="space-y-2">
                        <Label>Class Title *</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Module 3: Live Q&A" />
                    </div>
                    <div className="space-y-2">
                        <Label>Meeting URL (Google Meet / Zoom / Teams)</Label>
                        <Input type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
                        {linkChanged && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">⚠️ Meeting link changed — urgent notification will be sent to all students.</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date & Time</Label>
                            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                            {timeChanged && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">⚠️ Schedule changed — urgent notification will be sent.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Duration (Minutes)</Label>
                            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Description / Topics Covered</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief overview..." />
                    </div>
                    {(timeChanged || linkChanged) && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            An urgent notification popup will be sent to ALL enrolled students about this change.
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => onSave({ title, meeting_link: meetingLink, scheduled_at: scheduledAt, duration_minutes: parseInt(duration) || 60, description })}
                        className={(timeChanged || linkChanged) ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                    >
                        {(timeChanged || linkChanged) ? "Save & Notify Students 🚨" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
