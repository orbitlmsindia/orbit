import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Bell,
    Plus,
    Send,
    BookOpen,
    Loader2,
    CheckCircle,
    GraduationCap,
    CheckCheck,
    Trash2,
    X,
    Clock,
    FileText,
    Check,
    ArrowRight,
    ExternalLink,
    ShieldCheck,
    AlertCircle,
    UserCheck,
    UserX,
    Filter,
    Sparkles
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { LetterheadNoticeModal } from "@/components/notice/LetterheadNoticeModal";

export default function TeacherNotifications() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
    const [filterCategory, setFilterCategory] = useState<"all" | "enrollments" | "unread">("all");

    // Modal state for sending announcements
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [letterheadModalOpen, setLetterheadModalOpen] = useState(false);

    // Processing state for individual notification cards
    const [processingNotifId, setProcessingNotifId] = useState<string | number | null>(null);

    // Data State
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [notificationType, setNotificationType] = useState("course");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    const [receivedNotifications, setReceivedNotifications] = useState<any[]>([]);
    const [sentNotifications, setSentNotifications] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch teacher's courses
            const { data: coursesData } = await supabase
                .from('courses')
                .select('id, title')
                .eq('teacher_id', user.id);

            const teacherCourses = coursesData || [];
            setCourses(teacherCourses);
            const courseIds = teacherCourses.map(c => c.id);

            // 2. Fetch enrollments for teacher's courses to cross-reference approval status
            let enrollmentsMap = new Map<string, any>();
            if (courseIds.length > 0) {
                const { data: enrs } = await supabase
                    .from('enrollments')
                    .select('id, course_id, student_id, status, transaction_id, student:users!student_id(id, full_name, email)')
                    .in('course_id', courseIds);

                (enrs || []).forEach((e: any) => {
                    enrollmentsMap.set(e.id, e);
                    if (e.student?.full_name) {
                        enrollmentsMap.set(`${e.course_id}_${e.student.full_name.toLowerCase().trim()}`, e);
                    }
                    if (e.transaction_id) {
                        enrollmentsMap.set(`txn_${e.transaction_id.toLowerCase().trim()}`, e);
                    }
                });
            }

            // 3. Fetch Received Notifications for this teacher
            const { data: receivedNotifs, error: recErr } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (recErr) console.warn("Error fetching received notifications:", recErr);

            // Cross-reference notifications and auto-clean obsolete pending enrollment notifications
            const staleNotifIdsToDelete: string[] = [];
            const processedNotifs = (receivedNotifs || []).map((notif: any) => {
                let enrStatus: string | null = null;
                let matchingEnr: any = null;

                if (notif.enrollment_id && enrollmentsMap.has(notif.enrollment_id)) {
                    matchingEnr = enrollmentsMap.get(notif.enrollment_id);
                } else if (notif.course_id) {
                    for (const [, val] of enrollmentsMap.entries()) {
                        if (val.course_id === notif.course_id && val.student?.full_name && notif.message?.toLowerCase().includes(val.student.full_name.toLowerCase())) {
                            matchingEnr = val;
                            break;
                        }
                    }
                }

                if (!matchingEnr) {
                    for (const [, val] of enrollmentsMap.entries()) {
                        if (val.student?.full_name && notif.message?.toLowerCase().includes(val.student.full_name.toLowerCase())) {
                            matchingEnr = val;
                            break;
                        }
                    }
                }

                if (matchingEnr) {
                    enrStatus = matchingEnr.status;
                }

                const isEnrollmentType = (notif.notification_type === 'enrollment') || 
                    (notif.title || '').toLowerCase().includes('enrollment') || 
                    (notif.message || '').toLowerCase().includes('enrolled');

                // If this is an enrollment request notification and student is already approved/active:
                // Auto-schedule background cleanup so obsolete action alert doesn't linger
                if (isEnrollmentType && (enrStatus === 'approved' || enrStatus === 'active')) {
                    staleNotifIdsToDelete.push(notif.id);
                }

                return {
                    ...notif,
                    enrollment_status: enrStatus,
                    matched_enrollment_id: matchingEnr?.id || notif.enrollment_id,
                    matched_student_id: matchingEnr?.student_id || matchingEnr?.student?.id,
                    matched_course_id: matchingEnr?.course_id || notif.course_id
                };
            });

            // Automatically clean up stale pending notifications from database in the background
            if (staleNotifIdsToDelete.length > 0) {
                try {
                    await supabase.from('notifications').delete().in('id', staleNotifIdsToDelete);
                } catch (delErr) {
                    console.warn("Background stale notification cleanup error:", delErr);
                }
            }

            const activeReceived = processedNotifs.filter((n: any) => !staleNotifIdsToDelete.includes(n.id));
            setReceivedNotifications(activeReceived);

            // 4. Fetch sent announcements (sent by teacher)
            const { data: sentNotifs } = await supabase
                .from('notifications')
                .select('id, title, message, created_at')
                .eq('sender_role', 'teacher')
                .order('created_at', { ascending: false })
                .limit(50);

            setSentNotifications(sentNotifs || []);

        } catch (error) {
            console.error("Error fetching teacher notification data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Mark single notification as read
    const handleMarkAsRead = async (notifId: string | number) => {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
            setReceivedNotifications(prev =>
                prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            console.error("Error marking read:", err);
        }
    };

    // Mark all received notifications as read
    const handleMarkAllRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            setReceivedNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            toast({ title: "All notifications marked as read" });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    // Delete a single notification (instantly removes card from screen)
    const handleDeleteNotification = async (notifId: string | number) => {
        try {
            // Optimistic update
            setReceivedNotifications(prev => prev.filter(n => n.id !== notifId));
            
            await supabase.from('notifications').delete().eq('id', notifId);
            toast({ title: "Notification removed" });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
            fetchData();
        }
    };

    // Clear all notifications
    const handleClearAll = async () => {
        if (!confirm("Are you sure you want to clear all notifications?")) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Optimistic update
            setReceivedNotifications([]);

            await supabase.from('notifications').delete().eq('user_id', user.id);
            toast({ title: "All notifications cleared" });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
            fetchData();
        }
    };

    // 1-Click Quick Approve & Clear from Notification Card
    const handleDirectApproveEnrollment = async (notif: any) => {
        try {
            setProcessingNotifId(notif.id);

            // 1. Resolve enrollment ID & details
            let enrollmentIdToApprove = notif.matched_enrollment_id || notif.enrollment_id;
            let courseId = notif.matched_course_id || notif.course_id;
            let studentId: string | null = notif.matched_student_id || null;

            // If not directly present, try finding matching course & enrollment
            if (!courseId) {
                const matched = courses.find(c => notif.message?.toLowerCase().includes(c.title.toLowerCase()));
                if (matched) courseId = matched.id;
            }

            if (!enrollmentIdToApprove && courseId) {
                const { data: enrs } = await supabase
                    .from('enrollments')
                    .select('id, student_id, status, student:users!student_id(full_name)')
                    .eq('course_id', courseId)
                    .order('enrolled_at', { ascending: false });

                if (enrs && enrs.length > 0) {
                    const matchedStudent = enrs.find(e => notif.message?.toLowerCase().includes(e.student?.full_name?.toLowerCase()));
                    const target = matchedStudent || enrs[0];
                    enrollmentIdToApprove = target.id;
                    studentId = target.student_id;
                }
            }

            // 2. If enrollment is found, approve it (if pending)
            if (enrollmentIdToApprove) {
                const { error: appErr } = await supabase
                    .from('enrollments')
                    .update({ status: 'approved' })
                    .eq('id', enrollmentIdToApprove);

                if (appErr) console.warn("Enrollment update warning:", appErr);

                // Notify student if not already done
                if (studentId) {
                    const matchedCourse = courses.find(c => c.id === courseId);
                    try {
                        await supabase.from('notifications').insert([{
                            user_id: studentId,
                            title: "Enrollment Approved! 🎉",
                            message: `Congratulations! Your enrollment in "${matchedCourse?.title || 'the course'}" has been approved. You now have full access to curriculum, live classes, and calendar schedules.`,
                            notification_type: "enrollment_approved",
                            sender_role: "teacher",
                            course_id: courseId,
                            is_read: false
                        }]);
                    } catch (e) {}
                }
            }

            // 3. Instantly delete the notification from Supabase
            try {
                await supabase.from('notifications').delete().eq('id', notif.id);

                if (enrollmentIdToApprove) {
                    await supabase.from('notifications').delete().eq('enrollment_id', enrollmentIdToApprove);
                }
            } catch (delErr) {
                console.warn("Notification deletion error:", delErr);
            }

            // 4. Remove card from UI state immediately
            setReceivedNotifications(prev => prev.filter(n => n.id !== notif.id));

            toast({
                title: "Student Approved & Notification Cleared! 🎓",
                description: "The student has been granted full access and this notification has been cleared."
            });

        } catch (err: any) {
            console.error("Approve error:", err);
            toast({
                variant: "destructive",
                title: "Approval Error",
                description: err.message || "Failed to approve student."
            });
            fetchData();
        } finally {
            setProcessingNotifId(null);
        }
    };

    // Navigate to Course Verification tab and dismiss/mark read
    const handleNavigateToCourseStudents = async (notif: any) => {
        await handleMarkAsRead(notif.id);

        let targetCourseId = notif.matched_course_id || notif.course_id;
        if (!targetCourseId) {
            const matched = courses.find(c => notif.message?.toLowerCase().includes(c.title.toLowerCase()));
            if (matched) targetCourseId = matched.id;
        }

        if (targetCourseId) {
            navigate(`/teacher/courses/${targetCourseId}?tab=students`);
        } else {
            navigate('/teacher/courses');
        }
    };

    // Send course notification to enrolled students
    const handleSendNotification = async () => {
        if (!title || !message) {
            toast({ variant: "destructive", title: "Missing fields", description: "Please enter title and message." });
            return;
        }

        if (!selectedCourse) {
            toast({ variant: "destructive", title: "No course selected", description: "Please select a course." });
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            let notifiedCount = 0;

            // Direct enrollment insertion
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('student_id')
                .eq('course_id', selectedCourse);

            if (enrollments && enrollments.length > 0) {
                const insertPayload = enrollments.map(e => ({
                    user_id: e.student_id,
                    title: title,
                    message: message,
                    notification_type: notificationType || 'course',
                    sender_role: 'teacher',
                    course_id: selectedCourse,
                    is_read: false
                }));

                const { error: insertErr } = await supabase
                    .from('notifications')
                    .insert(insertPayload);

                if (insertErr) throw insertErr;
                notifiedCount = enrollments.length;
            }

            toast({
                title: "Notification Sent! 🔔",
                description: `Notification delivered to ${notifiedCount} enrolled students.`
            });

            setCreateModalOpen(false);
            setTitle("");
            setMessage("");
            setSelectedCourse("");
            fetchData();

        } catch (err: any) {
            console.error(err);
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const unreadReceived = receivedNotifications.filter(n => !n.is_read).length;
    const enrollmentRequests = receivedNotifications.filter(
        n => ((n.title || '').toLowerCase().includes('enrollment') || (n.message || '').toLowerCase().includes('enrolled')) &&
             n.enrollment_status !== 'approved' && n.enrollment_status !== 'active'
    );

    const filteredReceived = receivedNotifications.filter(n => {
        if (filterCategory === "enrollments") {
            return (n.title || '').toLowerCase().includes('enrollment') || (n.message || '').toLowerCase().includes('enrolled');
        }
        if (filterCategory === "unread") {
            return !n.is_read;
        }
        return true;
    });

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
            <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                            <Bell className="h-8 w-8 text-primary" />
                            Notifications & Enrollment Approvals
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Manage incoming student enrollment requests, submission alerts, and send course announcements.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setLetterheadModalOpen(true)}
                            className="gap-2 border-slate-700/40 font-semibold text-xs"
                        >
                            <FileText className="h-4 w-4 text-amber-500" />
                            Generate Official Notice
                        </Button>

                        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 text-xs font-semibold">
                                    <Plus className="h-4 w-4" />
                                    Send Announcement
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>Send Course Announcement</DialogTitle>
                                    <DialogDescription>
                                        Broadcast notifications directly to students enrolled in your course.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    {/* Course Selection */}
                                    <div className="space-y-2">
                                        <Label>Select Course</Label>
                                        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a course" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {courses.map((course) => (
                                                    <SelectItem key={course.id} value={course.id}>
                                                        {course.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Notification Type */}
                                    <div className="space-y-2">
                                        <Label>Notification Category</Label>
                                        <Select value={notificationType} onValueChange={setNotificationType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="course">General Course Update</SelectItem>
                                                <SelectItem value="live_class">Live Lecture Alert</SelectItem>
                                                <SelectItem value="assignment">Assignment / Task Alert</SelectItem>
                                                <SelectItem value="quiz">Quiz / Exam Update</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Title */}
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g., Live Masterclass Rescheduled"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>

                                    {/* Message */}
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Message</Label>
                                        <Textarea
                                            id="message"
                                            placeholder="Type your message here..."
                                            rows={4}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button className="gap-2" onClick={handleSendNotification}>
                                        <Send className="h-4 w-4" />
                                        Send Announcement
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className={`border ${enrollmentRequests.length > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                                    {enrollmentRequests.length}
                                </p>
                                <p className="text-xs font-semibold text-muted-foreground">Student Enrollments</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`border ${unreadReceived > 0 ? "border-primary/40 bg-primary/5" : ""}`}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-primary font-mono">{unreadReceived}</p>
                                <p className="text-xs font-semibold text-muted-foreground">Unread Alerts</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <Bell className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold font-mono">{courses.length}</p>
                                <p className="text-xs font-semibold text-muted-foreground">Your Courses</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                                <BookOpen className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold font-mono">{sentNotifications.length}</p>
                                <p className="text-xs font-semibold text-muted-foreground">Sent Announcements</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                                <Send className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Tabs: Received (Approvals) vs Sent */}
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                        <TabsList className="bg-muted/60">
                            <TabsTrigger value="received" className="gap-2 relative">
                                <Bell className="h-4 w-4" />
                                <span>Received Notifications</span>
                                {unreadReceived > 0 && (
                                    <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-mono">
                                        {unreadReceived}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="sent" className="gap-2">
                                <Send className="h-4 w-4" />
                                <span>Sent Announcements ({sentNotifications.length})</span>
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "received" && receivedNotifications.length > 0 && (
                            <div className="flex items-center gap-2">
                                {unreadReceived > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleMarkAllRead}
                                        className="h-8 text-xs font-semibold gap-1.5"
                                    >
                                        <CheckCheck className="h-3.5 w-3.5 text-primary" /> Mark All Read
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAll}
                                    className="h-8 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Clear All
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* TAB 1: RECEIVED NOTIFICATIONS & STUDENT APPROVALS */}
                    <TabsContent value="received" className="space-y-4 mt-0">
                        {/* Filter Chips */}
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant={filterCategory === "all" ? "default" : "outline"}
                                onClick={() => setFilterCategory("all")}
                                className="rounded-full text-xs h-7"
                            >
                                All ({receivedNotifications.length})
                            </Button>
                            <Button
                                size="sm"
                                variant={filterCategory === "enrollments" ? "default" : "outline"}
                                onClick={() => setFilterCategory("enrollments")}
                                className="rounded-full text-xs h-7 gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            >
                                <GraduationCap className="h-3.5 w-3.5" />
                                Student Enrollments ({enrollmentRequests.length})
                            </Button>
                            <Button
                                size="sm"
                                variant={filterCategory === "unread" ? "default" : "outline"}
                                onClick={() => setFilterCategory("unread")}
                                className="rounded-full text-xs h-7 gap-1.5 text-primary"
                            >
                                Unread Only ({unreadReceived})
                            </Button>
                        </div>

                        <Card>
                            <CardContent className="p-4 space-y-3">
                                {filteredReceived.length === 0 ? (
                                    <div className="text-center py-14 text-muted-foreground space-y-3">
                                        <div className="p-3.5 rounded-full bg-muted/60 w-fit mx-auto">
                                            <Bell className="h-8 w-8 text-muted-foreground opacity-40" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">No notifications in this view</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                When students enroll in your courses or submit assignments, they will appear here.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/60">
                                        {filteredReceived.map((notif) => {
                                            const isEnrollment = (notif.notification_type === 'enrollment') || 
                                                (notif.title || '').toLowerCase().includes('enrollment') || 
                                                (notif.message || '').toLowerCase().includes('enrolled');
                                            const isApprovedStudent = notif.enrollment_status === 'approved' || 
                                                notif.enrollment_status === 'active' || 
                                                notif.notification_type === 'enrollment_approved';
                                            const isPendingEnrollment = isEnrollment && !isApprovedStudent;
                                            const isProcessing = processingNotifId === notif.id;

                                            return (
                                                <div
                                                    key={notif.id}
                                                    className={`py-4 px-3 rounded-xl transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                                        !notif.is_read
                                                            ? "bg-primary/5 border border-primary/20 shadow-xs"
                                                            : "hover:bg-muted/30"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                                                            isPendingEnrollment
                                                                ? "bg-amber-500/10 text-amber-600"
                                                                : isApprovedStudent
                                                                ? "bg-emerald-500/10 text-emerald-600"
                                                                : "bg-primary/10 text-primary"
                                                        }`}>
                                                            {isEnrollment ? (
                                                                <GraduationCap className="h-5 w-5" />
                                                            ) : (
                                                                <Bell className="h-5 w-5" />
                                                            )}
                                                        </div>

                                                        <div className="space-y-1 flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h4 className="font-semibold text-sm text-foreground">
                                                                    {notif.title}
                                                                </h4>
                                                                {!notif.is_read && (
                                                                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0">
                                                                        New Alert
                                                                    </Badge>
                                                                )}
                                                                {isPendingEnrollment && (
                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                                                        Approval Action Required
                                                                    </Badge>
                                                                )}
                                                                {isApprovedStudent && (
                                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                                                        Approved & Active 🎓
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            <p className="text-xs text-foreground/80 leading-relaxed">
                                                                {notif.message}
                                                            </p>

                                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono pt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Direct Action Buttons */}
                                                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50 justify-end">
                                                        {isPendingEnrollment ? (
                                                            <>
                                                                {/* Direct 1-Click Approve & Clear Button */}
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isProcessing}
                                                                    onClick={() => handleDirectApproveEnrollment(notif)}
                                                                    className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-8 shadow-xs"
                                                                >
                                                                    {isProcessing ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <Check className="h-3.5 w-3.5" />
                                                                    )}
                                                                    Approve & Clear ✅
                                                                </Button>

                                                                {/* Review & Navigate Button */}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleNavigateToCourseStudents(notif)}
                                                                    className="gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 h-8 shadow-xs"
                                                                >
                                                                    <UserCheck className="h-3.5 w-3.5" />
                                                                    Review & Approve ↗
                                                                </Button>
                                                            </>
                                                        ) : isApprovedStudent ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleNavigateToCourseStudents(notif)}
                                                                    className="gap-1.5 text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 h-8 shadow-xs"
                                                                >
                                                                    <UserCheck className="h-3.5 w-3.5" />
                                                                    View Students ↗
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            !notif.is_read && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleMarkAsRead(notif.id)}
                                                                    className="text-xs h-8"
                                                                >
                                                                    Mark Read
                                                                </Button>
                                                            )
                                                        )}

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteNotification(notif.id)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            title="Delete notification"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: SENT ANNOUNCEMENTS */}
                    <TabsContent value="sent" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Sent Course Announcements History</CardTitle>
                                <CardDescription className="text-xs">
                                    Broadcast updates delivered to your enrolled students
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {sentNotifications.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground space-y-2">
                                        <Send className="h-8 w-8 mx-auto opacity-30 text-muted-foreground" />
                                        <p className="text-sm font-semibold">No announcements sent yet</p>
                                        <p className="text-xs">Click "Send Announcement" above to broadcast your first message.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sentNotifications.map((notif) => (
                                            <div key={notif.id} className="flex items-start gap-3 p-3.5 rounded-xl border bg-card hover:bg-muted/20">
                                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                                                    <CheckCircle className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="font-semibold text-sm text-foreground">{notif.title}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                                                    <p className="text-[11px] font-mono text-muted-foreground/70 pt-0.5">
                                                        {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <LetterheadNoticeModal
                    open={letterheadModalOpen}
                    onOpenChange={setLetterheadModalOpen}
                    senderType="teacher"
                />
            </div>
        </TeacherLayout>
    );
}
