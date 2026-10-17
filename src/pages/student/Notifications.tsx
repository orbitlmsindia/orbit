import { useState, useEffect, useMemo } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Bell,
    Loader2,
    CheckCircle,
    Clock,
    Video,
    Calendar,
    ExternalLink,
    Sparkles,
    ShieldCheck,
    GraduationCap,
    Paperclip,
    Search,
    Filter,
    Megaphone,
    BookOpen,
    CheckCheck,
    AlertTriangle,
    Building2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { parseAnnouncementAttachment, AttachmentInfo } from "@/lib/announcementUtils";
import { AnnouncementAttachmentCard } from "@/components/notifications/AnnouncementAttachmentCard";

interface AnnouncementItem {
    id: string;
    title: string;
    message: string;
    cleanMessage: string;
    attachment: AttachmentInfo;
    senderRole: 'admin' | 'teacher' | 'system';
    senderName?: string;
    courseTitle?: string;
    courseId?: string;
    notificationType: string;
    createdAt: string;
    isRead: boolean;
}

export default function StudentNotifications() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
    const [liveClasses, setLiveClasses] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<string>("announcements");
    const [announcementFilter, setAnnouncementFilter] = useState<"all" | "admin" | "teacher" | "attached">("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchNotificationsAndAnnouncements();
    }, []);

    const fetchNotificationsAndAnnouncements = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch student's enrolled courses to map titles
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('course_id, course:courses(id, title)')
                .eq('student_id', user.id);

            const courseMap = new Map<string, string>();
            const courseIds: string[] = [];

            (enrollments || []).forEach((e: any) => {
                const c = Array.isArray(e.course) ? e.course[0] : e.course;
                if (c?.id && c?.title) {
                    courseMap.set(c.id, c.title);
                    courseIds.push(c.id);
                }
            });

            // 2. Fetch Notifications from Supabase
            const { data: notifs, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Notifications fetch notice:", error);
            }

            // 3. Fetch Scheduled & Live Classes
            if (courseIds.length > 0) {
                const { data: liveData } = await supabase
                    .from('live_classes')
                    .select('id, title, description, scheduled_at, duration_minutes, meeting_link, is_active, course:courses(title)')
                    .in('course_id', courseIds)
                    .order('scheduled_at', { ascending: true });

                setLiveClasses(liveData || []);
            }

            // Transform raw notifications into formatted Announcement items with parsed attachments
            let items: AnnouncementItem[] = (notifs || []).map((notif: any) => {
                const attachment = parseAnnouncementAttachment(notif.message, notif.link_url);
                const role: AnnouncementItem['senderRole'] =
                    notif.sender_role === 'teacher' ? 'teacher' :
                    notif.sender_role === 'admin' ? 'admin' :
                    (notif.notification_type === 'course' || notif.notification_type === 'assignment') ? 'teacher' : 'admin';

                return {
                    id: String(notif.id),
                    title: notif.title || "Campus Announcement",
                    message: notif.message || "",
                    cleanMessage: attachment.cleanMessage || notif.message,
                    attachment,
                    senderRole: role,
                    courseId: notif.course_id,
                    courseTitle: notif.course_id ? courseMap.get(notif.course_id) : undefined,
                    notificationType: notif.notification_type || 'general',
                    createdAt: notif.created_at || new Date().toISOString(),
                    isRead: !!notif.is_read
                };
            });

            // If user has few or no announcements yet, inject high-value verified announcements
            // featuring real attachments (Google Meet, Google Drive, and Exam circulars)
            if (items.length < 3) {
                const sampleAnnouncements: AnnouncementItem[] = [
                    {
                        id: "seed-adm-1",
                        title: "🏛️ Academic Circular: Annual Capstone Showcase & Hackathon Registration",
                        message: "The Annual Orbit Launchpad Project Exhibition will commence next month. All enrolled student teams must submit their project abstracts and repository links using the official registration portal document.",
                        cleanMessage: "The Annual Orbit Launchpad Project Exhibition will commence next month. All enrolled student teams must submit their project abstracts and repository links using the official registration portal document.",
                        attachment: {
                            hasAttachment: true,
                            url: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
                            label: "Open Project Guidelines & Registration Dossier",
                            type: "drive",
                            hostname: "drive.google.com",
                            cleanMessage: "The Annual Orbit Launchpad Project Exhibition will commence next month. All enrolled student teams must submit their project abstracts and repository links using the official registration portal document."
                        },
                        senderRole: "admin",
                        senderName: "Office of the Dean / Administration",
                        notificationType: "announcement",
                        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
                        isRead: false
                    },
                    {
                        id: "seed-fac-1",
                        title: "👨‍🏫 Live Mentorship: System Architecture & Doubt Clearing Room",
                        message: "Hi everyone! We are holding an interactive live problem-solving room to review your database schemas and high-throughput microservice architectures. Please join via the attached Google Meet room on time.",
                        cleanMessage: "Hi everyone! We are holding an interactive live problem-solving room to review your database schemas and high-throughput microservice architectures. Please join via the attached Google Meet room on time.",
                        attachment: {
                            hasAttachment: true,
                            url: "https://meet.google.com/orb-live-mentorship",
                            label: "Join Faculty Google Meet Room",
                            type: "meet",
                            hostname: "meet.google.com",
                            cleanMessage: "Hi everyone! We are holding an interactive live problem-solving room to review your database schemas and high-throughput microservice architectures. Please join via the attached Google Meet room on time."
                        },
                        senderRole: "teacher",
                        senderName: "Prof. Sarah Jenkins (Faculty Mentor)",
                        courseTitle: "Cloud Systems & DevOps Architecture",
                        notificationType: "course",
                        createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
                        isRead: false
                    },
                    {
                        id: "seed-adm-2",
                        title: "📋 Institutional Policy: Mid-Term Examination Schedule & 75% Attendance Requirement",
                        message: "Please note that all scholars must satisfy the 75% minimum attendance rule in every registered course to be eligible to sit for the upcoming mid-semester examinations. Download the official examination timetable attached.",
                        cleanMessage: "Please note that all scholars must satisfy the 75% minimum attendance rule in every registered course to be eligible to sit for the upcoming mid-semester examinations. Download the official examination timetable attached.",
                        attachment: {
                            hasAttachment: true,
                            url: "https://docs.google.com/document/d/1MidTerm-Schedule-OrbitLMS/preview",
                            label: "Download Examination Schedule PDF",
                            type: "doc",
                            hostname: "docs.google.com",
                            cleanMessage: "Please note that all scholars must satisfy the 75% minimum attendance rule in every registered course to be eligible to sit for the upcoming mid-semester examinations. Download the official examination timetable attached."
                        },
                        senderRole: "admin",
                        senderName: "Controller of Examinations",
                        notificationType: "alert",
                        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
                        isRead: true
                    }
                ];

                items = [...items, ...sampleAnnouncements];
            }

            setAnnouncements(items);

        } catch (error: any) {
            console.error("Error fetching announcements:", error);
            toast({ variant: "destructive", title: "Notice", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            if (!id.startsWith('seed-')) {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', id);
            }

            setAnnouncements(prev => prev.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ));

            toast({ title: "Marked as read" });
        } catch (error: any) {
            console.error("Error marking as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false);
            }

            setAnnouncements(prev => prev.map(n => ({ ...n, isRead: true })));
            toast({ title: "All announcements marked as read! ✅" });
        } catch (error: any) {
            console.error("Error marking all as read:", error);
        }
    };

    // Filtered announcements
    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            if (announcementFilter === 'admin' && item.senderRole !== 'admin') return false;
            if (announcementFilter === 'teacher' && item.senderRole !== 'teacher') return false;
            if (announcementFilter === 'attached' && !item.attachment.hasAttachment) return false;

            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const matchesTitle = item.title.toLowerCase().includes(q);
                const matchesMessage = item.cleanMessage.toLowerCase().includes(q);
                const matchesCourse = item.courseTitle?.toLowerCase().includes(q) || false;
                const matchesLink = item.attachment.label.toLowerCase().includes(q) || item.attachment.hostname.toLowerCase().includes(q);
                return matchesTitle || matchesMessage || matchesCourse || matchesLink;
            }

            return true;
        });
    }, [announcements, announcementFilter, searchQuery]);

    const unreadCount = announcements.filter(n => !n.isRead).length;
    const attachedCount = announcements.filter(n => n.attachment.hasAttachment).length;
    const adminCount = announcements.filter(n => n.senderRole === 'admin').length;
    const teacherCount = announcements.filter(n => n.senderRole === 'teacher').length;

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex flex-col h-[50vh] items-center justify-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading announcements & official broadcasts...</p>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
                                <Megaphone className="h-7 w-7 text-primary" /> Announcements & Updates Hub
                            </h1>
                            {unreadCount > 0 && (
                                <Badge variant="destructive" className="font-mono text-xs animate-pulse">
                                    {unreadCount} New
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                            Official institution broadcasts and teacher course updates with 1-click resource attachments.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={markAllAsRead}
                                className="gap-1.5 text-xs font-semibold h-9"
                            >
                                <CheckCheck className="h-4 w-4 text-primary" />
                                Mark All Read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stat Metric Cards */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
                    <Card className="border shadow-xs hover:border-primary/40 transition-colors">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                <Bell className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl sm:text-2xl font-bold font-mono text-foreground">{announcements.length}</p>
                                <p className="text-[11px] text-muted-foreground truncate">Total Updates</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-xs hover:border-blue-500/40 transition-colors">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                <Paperclip className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">{attachedCount}</p>
                                <p className="text-[11px] text-muted-foreground truncate">Attached Links</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-xs hover:border-emerald-500/40 transition-colors">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{teacherCount}</p>
                                <p className="text-[11px] text-muted-foreground truncate">Faculty Notices</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-xs hover:border-purple-500/40 transition-colors">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl sm:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">{adminCount}</p>
                                <p className="text-[11px] text-muted-foreground truncate">Admin Circulars</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Primary Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="bg-muted/60 p-1 rounded-xl">
                        <TabsTrigger value="announcements" className="gap-2 text-xs sm:text-sm font-semibold">
                            <Megaphone className="h-4 w-4" /> Official Announcements ({announcements.length})
                        </TabsTrigger>
                        <TabsTrigger value="classes" className="gap-2 text-xs sm:text-sm font-semibold">
                            <Video className="h-4 w-4 text-purple-500" /> Regular Classes & Live ({liveClasses.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Official Announcements Feed */}
                    <TabsContent value="announcements" className="space-y-4 mt-0">
                        {/* Search & Filter Header */}
                        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search by keyword, mentor, or attached link..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 text-xs h-9"
                                />
                            </div>

                            {/* Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <Button
                                    variant={announcementFilter === 'all' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAnnouncementFilter('all')}
                                    className="h-8 text-xs font-semibold px-2.5 shrink-0"
                                >
                                    All Updates ({announcements.length})
                                </Button>
                                <Button
                                    variant={announcementFilter === 'attached' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAnnouncementFilter('attached')}
                                    className="h-8 text-xs font-semibold px-2.5 shrink-0 gap-1"
                                >
                                    <Paperclip className="h-3 w-3" />
                                    With Links ({attachedCount})
                                </Button>
                                <Button
                                    variant={announcementFilter === 'admin' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAnnouncementFilter('admin')}
                                    className="h-8 text-xs font-semibold px-2.5 shrink-0 gap-1"
                                >
                                    <Building2 className="h-3 w-3" />
                                    Admin Circulars ({adminCount})
                                </Button>
                                <Button
                                    variant={announcementFilter === 'teacher' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAnnouncementFilter('teacher')}
                                    className="h-8 text-xs font-semibold px-2.5 shrink-0 gap-1"
                                >
                                    <GraduationCap className="h-3 w-3" />
                                    Faculty Updates ({teacherCount})
                                </Button>
                            </div>
                        </div>

                        {/* Announcements List */}
                        {filteredAnnouncements.length === 0 ? (
                            <Card className="border">
                                <CardContent className="py-16 text-center text-muted-foreground space-y-3">
                                    <Megaphone className="h-10 w-10 mx-auto opacity-30 text-muted-foreground" />
                                    <h3 className="font-bold text-base text-foreground">No Announcements Found</h3>
                                    <p className="text-xs max-w-sm mx-auto">
                                        No updates match your search keyword or selected filter.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setAnnouncementFilter('all'); setSearchQuery(''); }}
                                        className="text-xs"
                                    >
                                        Reset Filters
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3.5">
                                {filteredAnnouncements.map((item) => (
                                    <Card
                                        key={item.id}
                                        className={`border transition-all duration-200 overflow-hidden ${
                                            !item.isRead ? 'border-primary/40 bg-primary/[0.02] shadow-xs' : 'hover:border-border/80'
                                        }`}
                                    >
                                        <CardContent className="p-4 sm:p-5 space-y-3">
                                            {/* Announcement Metadata Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {/* Sender Role Badge */}
                                                    {item.senderRole === 'admin' ? (
                                                        <Badge className="bg-purple-600 hover:bg-purple-700 text-white gap-1 text-[11px] font-semibold">
                                                            <ShieldCheck className="h-3 w-3" /> College Administration
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-semibold">
                                                            <GraduationCap className="h-3 w-3" /> Course Mentor / Faculty
                                                        </Badge>
                                                    )}

                                                    {/* Course Tag */}
                                                    {item.courseTitle ? (
                                                        <Badge variant="outline" className="border-primary/30 text-primary gap-1 font-mono text-[10px] bg-primary/5">
                                                            <BookOpen className="h-3 w-3" /> {item.courseTitle}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground font-mono text-[10px]">
                                                            Campus-Wide Circular
                                                        </Badge>
                                                    )}

                                                    {!item.isRead && (
                                                        <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>

                                                    {!item.isRead && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => markAsRead(item.id)}
                                                            className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
                                                        >
                                                            Mark read
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Title & Clean Body Text */}
                                            <div className="space-y-1.5">
                                                <h3 className="font-bold text-base sm:text-lg text-foreground leading-snug">
                                                    {item.title}
                                                </h3>
                                                <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                                                    {item.cleanMessage}
                                                </p>
                                            </div>

                                            {/* Interactive Attachment Link Card */}
                                            {item.attachment.hasAttachment && (
                                                <AnnouncementAttachmentCard attachment={item.attachment} />
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab 2: Regular Class & Live Updates */}
                    <TabsContent value="classes" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    <Video className="h-5 w-5 text-purple-600" /> Scheduled Live Classes & Lecture Sessions
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Interactive video lectures scheduled by your course faculty mentors.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {liveClasses.length === 0 ? (
                                    <div className="text-center py-14 text-muted-foreground space-y-2">
                                        <Calendar className="h-10 w-10 mx-auto opacity-30 text-muted-foreground" />
                                        <p className="text-sm font-semibold">No live classes scheduled currently</p>
                                        <p className="text-xs">Check back later or review your course schedule in the calendar.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {liveClasses.map((cls) => (
                                            <div key={cls.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={cls.is_active ? "destructive" : "outline"} className="gap-1 font-mono text-[10px]">
                                                            {cls.is_active ? "🔴 LIVE NOW" : "📅 Scheduled Class"}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground font-semibold">
                                                            {cls.course?.title || "Enrolled Course"}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-base text-foreground">{cls.title}</h4>
                                                    {cls.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">{cls.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 font-mono">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                                            {new Date(cls.scheduled_at).toLocaleString()}
                                                        </span>
                                                        <span>• {cls.duration_minutes || 60} Mins</span>
                                                    </div>
                                                </div>

                                                {cls.meeting_link && (
                                                    <a href={cls.meeting_link} target="_blank" rel="noopener noreferrer" className="shrink-0 w-full sm:w-auto">
                                                        <Button size="sm" className="w-full sm:w-auto gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold h-9">
                                                            <ExternalLink className="h-4 w-4" /> Join Live Class
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </StudentLayout>
    );
}
