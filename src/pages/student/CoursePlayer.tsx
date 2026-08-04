import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Play,
    FileText,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Menu,
    Download,
    Loader2,
    Type,
    Video,
    BrainCircuit,
    Lock,
    Flame,
    Sparkles,
    Presentation,
    FileCode,
    FileCheck,
    Clock,
    BookOpen,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { SecureVideoPlayer } from "@/components/video/SecureVideoPlayer";
import { getEmbeddablePresentationUrl, getEmbeddableDocUrl, isGoogleDriveUrl } from "@/lib/googleDriveUtils";

export default function CoursePlayer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);

    // Player State
    const [currentContent, setCurrentContent] = useState<any>(null);
    const [userEmail, setUserEmail] = useState<string>("");
    const [userId, setUserId] = useState<string>("");
    const [isBlurred, setIsBlurred] = useState(false);
    const [isBlackedOut, setIsBlackedOut] = useState(false);

    // Progression & Streak State
    const [completedContents, setCompletedContents] = useState<Set<string>>(new Set());
    const [submittedAssignments, setSubmittedAssignments] = useState<Set<string>>(new Set());
    const [unlockedSections, setUnlockedSections] = useState<Set<string>>(new Set());
    const [watchProgressMap, setWatchProgressMap] = useState<Record<string, number>>({});
    const [streakModalOpen, setStreakModalOpen] = useState(false);
    const [streakCount, setStreakCount] = useState(3);

    useEffect(() => {
        if (id) fetchCourseContent();

        // 0. Fetch current user for watermark
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        };
        checkUser();

        // 1. Prevent default right-click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // 2. Prevent common keyboard shortcuts for screenshots and saving
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
                e.preventDefault();
                navigator.clipboard.writeText(""); // Clear clipboard to prevent taking actual screenshots usually
                setIsBlackedOut(true);
                toast({ variant: "destructive", title: "Action Not Allowed", description: "Taking screenshots is strictly prohibited." });
                setTimeout(() => setIsBlackedOut(false), 3000); // Blackout for 3s to deter
            }
            if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5' || e.key.toLowerCase() === 's')) {
                e.preventDefault();
                navigator.clipboard.writeText("");
                setIsBlackedOut(true);
                toast({ variant: "destructive", title: "Action Not Allowed", description: "Taking screenshots is strictly prohibited." });
                setTimeout(() => setIsBlackedOut(false), 3000);
            }
            if (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'c' || e.key === 'PrintScreen' || e.code === 'PrintScreen')) {
                e.preventDefault();
                toast({ variant: "destructive", title: "Action Not Allowed", description: "Print, Save, and Copy actions are disabled." });
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
                e.preventDefault();
                navigator.clipboard.writeText("");
                setIsBlackedOut(true);
                toast({ variant: "destructive", title: "Action Not Allowed", description: "Taking screenshots is strictly prohibited." });
                setTimeout(() => setIsBlackedOut(false), 3000);
            }
        };

        // 3. Blur on visibility/focus change
        const handleVisibilityChange = () => {
            setIsBlurred(document.hidden);
            if (document.hidden) {
                setIsBlackedOut(true);
                setTimeout(() => setIsBlackedOut(false), 3000);
            }
        }
        const handleWindowBlur = () => {
            // Do not blur if the user clicked inside our own video iframe
            if (document.activeElement?.tagName === 'IFRAME') {
                return;
            }
            setIsBlurred(true);
        };
        const handleWindowFocus = () => setIsBlurred(false);

        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);
        window.addEventListener("focus", handleWindowFocus);

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, [id]);

    const fetchCourseContent = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 0. Check User Role & Enrollment Status
            const { data: userProfile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            const isStaff = userProfile?.role === 'teacher' || userProfile?.role === 'admin';

            if (!isStaff) {
                const { data: enrollmentData, error: enrollmentError } = await supabase
                    .from('enrollments')
                    .select('status')
                    .eq('course_id', id)
                    .eq('student_id', user.id)
                    .maybeSingle();

                if (enrollmentError || !enrollmentData) {
                    toast({ variant: "destructive", title: "Access Denied", description: "You are not enrolled in this course." });
                    navigate("/student/courses");
                    return;
                }

                if (enrollmentData.status === 'pending') {
                    toast({ variant: "destructive", title: "Access Denied", description: "Your payment verification is pending." });
                    navigate("/student/courses");
                    return;
                }
            }

            // 1. Fetch Course Info
            const { data: courseData } = await supabase
                .from('courses')
                .select('id, title, min_watch_percent')
                .eq('id', id)
                .single();
            if (courseData) setCourse(courseData);
            setUserId(user.id);

            // 2. Fetch Sections & Contents
            let { data: sectionsData, error: sectionsError } = await supabase
                .from('course_sections')
                .select(`
                    id, title, order_index, week_number, allocated_hours, topic_name,
                    items:section_contents(id, title, video_url, pdf_url, content_text, duration_minutes, order_index, created_at, min_watch_percent)
                `)
                .eq('course_id', id)
                .order('order_index', { ascending: true });

            if (sectionsError) {
                console.warn("CoursePlayer sections query fallback:", sectionsError);
                const { data: fallbackSections } = await supabase
                    .from('course_sections')
                    .select(`
                        id, title, week_number, allocated_hours, topic_name,
                        items:section_contents(id, title, video_url, pdf_url, content_text, duration_minutes, created_at, min_watch_percent)
                    `)
                    .eq('course_id', id);
                sectionsData = fallbackSections || [];
            }

            const { data: assignmentsData } = await supabase
                .from('assignments')
                .select('id, section_id, title, type, created_at')
                .eq('course_id', id);

            const rawSections = sectionsData || [];
            const rawAssigns = assignmentsData || [];

            // Sort items
            const sorted = rawSections.map((s: any) => {
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

            setSections(sorted);

            // Fetch user progress
            const { data: progressData } = await supabase
                .from('section_progress')
                .select('content_id')
                .eq('user_id', user.id)
                .eq('completed', true);
            const compContents = new Set((progressData || []).map((p: any) => p.content_id));
            setCompletedContents(compContents);

            // Fetch submissions & quiz attempts
            const { data: submissions } = await supabase.from('submissions').select('assignment_id').eq('student_id', user.id);
            const { data: quizAttempts } = await supabase.from('quiz_attempts').select('assignment_id').eq('student_id', user.id);
            const subAssigns = new Set([
                ...(submissions || []).map((s: any) => s.assignment_id),
                ...(quizAttempts || []).map((q: any) => q.assignment_id)
            ]);
            setSubmittedAssignments(subAssigns);

            // Progression Logic: Unlock sections sequentially
            const unlocked = new Set<string>();
            let allPreviousCompleted = true;

            const isSectionCompleted = (section: any) => {
                if (!section.items || section.items.length === 0) return true; // Empty sections are trivially complete or shouldn't block
                return section.items.every((item: any) => {
                    if (item.itemType === 'assignment') {
                        return subAssigns.has(item.id);
                    }
                    return compContents.has(item.id);
                });
            };

            sorted.forEach((s: any, idx: number) => {
                if (idx === 0) {
                    unlocked.add(s.id);
                    if (!isSectionCompleted(s)) allPreviousCompleted = false;
                } else {
                    if (allPreviousCompleted) {
                        unlocked.add(s.id);
                    }
                    if (!isSectionCompleted(s)) {
                        allPreviousCompleted = false;
                    }
                }
            });

            setUnlockedSections(unlocked);

            // Set initial content (first item of first section) if none is selected
            if (!currentContent && sorted.length > 0 && sorted[0].items.length > 0) {
                setCurrentContent(sorted[0].items[0]);
            }

        } catch (error) {
            console.error("Error loading course content:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkComplete = async () => {
        if (!currentContent || currentContent.itemType === 'assignment') return;

        const isVideo = currentContent.type === 'video' || !!currentContent.video_url;
        const requiredPercent = currentContent.min_watch_percent || course?.min_watch_percent || 80;
        const currentWatched = watchProgressMap[currentContent.id] || 0;

        if (isVideo && currentWatched < requiredPercent) {
            toast({
                variant: "destructive",
                title: "Watch Percentage Required",
                description: `You must watch at least ${requiredPercent}% of this video lecture to mark as complete. Current watch progress: ${currentWatched}%.`
            });
            return;
        }

        try {
            const { error } = await supabase
                .from('section_progress')
                .upsert({
                    user_id: userId,
                    content_id: currentContent.id,
                    completed: true,
                    completed_at: new Date().toISOString()
                }, { onConflict: 'user_id,content_id' });

            if (error) {
                console.warn("section_progress RLS warning:", error.message);
            }

            toast({ title: "Marked as complete!", description: "Lesson progress saved." });
            const newSet = new Set([...completedContents, currentContent.id]);
            setCompletedContents(newSet);

            // 🔥 3-Section Module Streak Trigger Check
            if (newSet.size > 0 && newSet.size % 3 === 0) {
                setStreakCount(newSet.size);
                setStreakModalOpen(true);

                if (userId) {
                    supabase.from('users').select('current_streak, highest_streak, aura_points').eq('id', userId).maybeSingle().then(({ data: userProf }) => {
                        if (userProf) {
                            const newCurrent = (userProf.current_streak || 0) + 1;
                            const newHighest = Math.max(newCurrent, userProf.highest_streak || 0);
                            const newAura = (userProf.aura_points || 0) + 50;
                            supabase.from('users').update({ current_streak: newCurrent, highest_streak: newHighest, aura_points: newAura }).eq('id', userId);
                        }
                    });
                }
            }
        } catch (err: any) {
            console.error("Mark as complete error:", err);
            // Local fallback so user is not blocked
            const newSet = new Set([...completedContents, currentContent.id]);
            setCompletedContents(newSet);
            toast({ title: "Marked as complete!" });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!course) return <div>Course not found</div>;

    const allCourseItems = sections.flatMap(s => s.items || []);
    const completedCount = completedContents.size + submittedAssignments.size;
    const overallProgressPercent = allCourseItems.length > 0 ? Math.round((completedCount / allCourseItems.length) * 100) : 0;

    const currentIndex = currentContent ? allCourseItems.findIndex(i => i.id === currentContent.id) : -1;
    const prevItem = currentIndex > 0 ? allCourseItems[currentIndex - 1] : null;
    const nextItem = currentIndex >= 0 && currentIndex < allCourseItems.length - 1 ? allCourseItems[currentIndex + 1] : null;

    const handleNavigatePrev = () => {
        if (!prevItem) return;
        if (prevItem.itemType === 'assignment') {
            const isUnlocked = unlockedSections.has(prevItem.section_id);
            if (isUnlocked) {
                navigate(prevItem.type === 'quiz' ? `/student/quiz/${prevItem.id}` : `/student/assignments/${prevItem.id}`);
            }
        } else {
            setCurrentContent(prevItem);
            if (window.innerWidth < 768) setSidebarOpen(false);
        }
    };

    const handleNavigateNext = () => {
        if (!nextItem) return;
        if (nextItem.itemType === 'assignment') {
            const isUnlocked = unlockedSections.has(nextItem.section_id);
            if (isUnlocked) {
                navigate(nextItem.type === 'quiz' ? `/student/quiz/${nextItem.id}` : `/student/assignments/${nextItem.id}`);
            }
        } else {
            setCurrentContent(nextItem);
            if (window.innerWidth < 768) setSidebarOpen(false);
        }
    };

    return (
        <>
            {/* Blackout Warning for Screenshots */}
            {isBlackedOut && (
                <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center">
                    <div className="text-center p-8 text-white max-w-md mx-4">
                        <div className="h-20 w-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Video className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Screenshots Disabled</h2>
                        <p className="text-lg opacity-80">
                            Taking screenshots or recording is strictly prohibited.
                        </p>
                    </div>
                </div>
            )}

            {/* Full Screen Blur Target Warning */}
            {isBlurred && !isBlackedOut && (
                <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-xl flex items-center justify-center">
                    <div className="text-center p-8 bg-card rounded-2xl shadow-2xl border border-red-500/20 max-w-md mx-4">
                        <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Video className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Security Warning</h2>
                        <p className="text-muted-foreground">
                            Screen recording, screenshots, and leaving this window are not allowed while viewing course contents. Please return to the window to continue learning.
                        </p>
                    </div>
                </div>
            )}

            <div className={cn(
                "flex h-screen w-full bg-background overflow-hidden flex-col select-none",
                isBlurred && "filter blur-md pointer-events-none"
            )}>
                {/* Top Bar for Learning Mode */}
                <header className="h-16 border-b flex items-center px-4 justify-between bg-card z-10 shrink-0 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link to="/student/courses" className="shrink-0">
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-sm font-bold truncate tracking-tight">{course.title}</h1>
                            <p className="text-xs text-muted-foreground truncate hidden sm:block">
                                {currentContent ? currentContent.title : "Select a lesson"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Desktop Progress Bar */}
                        <div className="hidden sm:flex flex-col items-end w-36">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-xs font-semibold text-primary">
                                    {overallProgressPercent}% Completed
                                </span>
                            </div>
                            <Progress value={overallProgressPercent} className="h-1.5 w-full bg-muted" />
                        </div>

                        {/* Sidebar Toggle Button (Visible on both Desktop & Mobile) */}
                        <Button 
                            variant={sidebarOpen ? "secondary" : "default"} 
                            size="sm" 
                            className="gap-1.5 font-bold text-xs px-3 h-9 shadow-2xs transition-all"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            title={sidebarOpen ? "Hide Course Content Sidebar" : "Show Course Content Sidebar"}
                        >
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="hidden sm:inline">{sidebarOpen ? "Hide Sidebar" : "Course Content"}</span>
                            <span className="text-[11px] opacity-90 font-mono">({overallProgressPercent}%)</span>
                            <Menu className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden relative">
                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col overflow-y-auto bg-muted/10 relative">
                        {currentContent ? (
                            <div className="flex-1 p-3 sm:p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6 md:space-y-8">

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                                        <Sparkles className="h-3.5 w-3.5" /> Interactive Learning Unit
                                    </div>
                                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-display leading-tight">
                                        {currentContent.title}
                                    </h2>
                                </div>

                                {/* 1. Video Player */}
                                {(currentContent.type === 'video' || (currentContent.video_url && currentContent.type !== 'pdf' && currentContent.type !== 'presentation' && currentContent.type !== 'document' && currentContent.type !== 'text')) && (
                                    <SecureVideoPlayer
                                        key={currentContent.id}
                                        videoUrl={currentContent.video_url || currentContent.content_url}
                                        title={currentContent.title}
                                        userEmail={userEmail}
                                        initialProgress={watchProgressMap[currentContent.id] || (completedContents.has(currentContent.id) ? 100 : 0)}
                                        onProgressUpdate={(percentage) => {
                                            const contentId = currentContent.id;
                                            setWatchProgressMap(prev => {
                                                if (prev[contentId] === percentage) return prev;
                                                return {
                                                    ...prev,
                                                    [contentId]: Math.max(prev[contentId] || 0, percentage)
                                                };
                                            });
                                        }}
                                    />
                                )}

                                {/* 2. Presentation Deck Viewer (Secure Embed) */}
                                {(currentContent.type === 'presentation' || (currentContent.pdf_url && (currentContent.pdf_url.includes('presentation') || currentContent.pdf_url.includes('slides')))) && (
                                    <div className="bg-card p-4 sm:p-6 rounded-xl border shadow-xs space-y-3 relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
                                        <div className="flex items-center justify-between pb-2 border-b flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <Presentation className="h-5 w-5 text-purple-600" />
                                                <h3 className="font-bold text-base">Interactive Presentation Deck</h3>
                                            </div>
                                            <Badge className="bg-purple-600/10 text-purple-600 border-purple-500/30 text-xs">Protected Content</Badge>
                                        </div>
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border shadow-inner">
                                            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center opacity-15 rotate-[-25deg]">
                                                <span className="text-lg sm:text-2xl font-mono font-bold text-foreground tracking-widest uppercase">
                                                    PROTECTED • {userEmail || "Orbit Student"}
                                                </span>
                                            </div>
                                            <iframe
                                                src={getEmbeddablePresentationUrl(currentContent.content_url || currentContent.pdf_url || currentContent.url || '')}
                                                className="w-full h-full border-none"
                                                title={currentContent.title}
                                                allow="fullscreen"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 3. PDF / Document Viewer (Secure Embed) */}
                                {(currentContent.type === 'pdf' || currentContent.type === 'document' || currentContent.type === 'reference' || (currentContent.pdf_url && currentContent.type !== 'presentation')) && (
                                    <div className="bg-card p-4 sm:p-6 rounded-xl border shadow-xs space-y-3 relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
                                        <div className="flex items-center justify-between pb-2 border-b flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <h3 className="font-bold text-base">Reference Material & Document</h3>
                                            </div>
                                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">Proprietary Material</Badge>
                                        </div>
                                        <div className="relative h-[380px] sm:h-[550px] w-full rounded-xl overflow-hidden bg-muted/20 border border-border shadow-inner">
                                            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center opacity-15 rotate-[-25deg]">
                                                <span className="text-lg sm:text-2xl font-mono font-bold text-foreground tracking-widest uppercase">
                                                    PROTECTED • {userEmail || "Orbit Student"}
                                                </span>
                                            </div>
                                            <iframe
                                                src={getEmbeddableDocUrl(currentContent.content_url || currentContent.pdf_url || currentContent.url || '')}
                                                className="w-full h-full border-none"
                                                title={currentContent.title}
                                                allow="fullscreen"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 4. Text Notes Content */}
                                {currentContent.content_text && (
                                    <div className="bg-card p-5 sm:p-8 rounded-xl border shadow-xs max-w-none select-none" onContextMenu={(e) => e.preventDefault()}>
                                        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                                            <Type className="h-5 w-5 text-primary" />
                                            <h3 className="text-base sm:text-lg font-bold">Lesson Notes & Material</h3>
                                        </div>
                                        <MarkdownRenderer content={currentContent.content_text} />
                                    </div>
                                )}

                                {/* Footer / Completion */}
                                <div className="pt-6 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                    <p className="text-muted-foreground text-xs sm:text-sm">
                                        Complete all sections to finish this lesson.
                                    </p>
                                    {(() => {
                                        const isVideo = currentContent.type === 'video' || !!currentContent.video_url;
                                        const requiredPercent = currentContent.min_watch_percent || course?.min_watch_percent || 80;
                                        const currentWatched = watchProgressMap[currentContent.id] || 0;
                                        const isCompleted = completedContents.has(currentContent.id);
                                        const isRequirementMet = !isVideo || currentWatched >= requiredPercent || isCompleted;

                                        return (
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                {isVideo && !isCompleted && (
                                                    <Badge variant="outline" className={`text-xs py-1.5 px-3 font-mono justify-center ${isRequirementMet ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}>
                                                        {isRequirementMet ? `Watch Goal Met (${currentWatched}%)` : `Watched ${currentWatched}% / ${requiredPercent}% Required`}
                                                    </Badge>
                                                )}
                                                <Button
                                                    size="default"
                                                    className={cn(
                                                        "gap-2 font-bold transition-all shadow-xs",
                                                        isCompleted && "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    )}
                                                    onClick={handleMarkComplete}
                                                    disabled={isCompleted || (!isRequirementMet && isVideo)}
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    {isCompleted ? "Completed" : (isVideo && !isRequirementMet ? `Watch ${requiredPercent}% to Complete` : "Mark as Complete")}
                                                </Button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3">
                                <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                    <BookOpen className="h-8 w-8" />
                                </div>
                                <p className="text-base font-semibold text-foreground">No Lesson Selected</p>
                                <p className="text-sm max-w-sm">Select a lesson from the Course Content sidebar to begin learning.</p>
                                <Button variant="outline" className="md:hidden mt-2" onClick={() => setSidebarOpen(true)}>
                                    Open Course Content
                                </Button>
                            </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="shrink-0 p-3 sm:p-4 border-t bg-card flex items-center justify-between max-w-4xl mx-auto w-full gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="gap-1.5 text-xs sm:text-sm font-medium" 
                                disabled={!prevItem}
                                onClick={handleNavigatePrev}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span>Previous</span>
                            </Button>
                            
                            <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                                {currentIndex >= 0 ? `Lesson ${currentIndex + 1} of ${allCourseItems.length}` : ''}
                            </span>

                            <Button 
                                size="sm"
                                className="gap-1.5 text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm" 
                                disabled={!nextItem}
                                onClick={handleNavigateNext}
                            >
                                <span>Next Lesson</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </main>

                    {/* Mobile Backdrop Overlay */}
                    {sidebarOpen && (
                        <div 
                            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[2000] md:hidden animate-fade-in"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* Sidebar - Course Content */}
                    <aside className={cn(
                        "bg-card flex flex-col transition-all duration-300 z-[2001] border-l shadow-2xl",
                        "fixed inset-y-0 right-0 w-[90vw] sm:w-[380px] max-w-[400px]",
                        !sidebarOpen ? "translate-x-full" : "translate-x-0",
                        "md:static md:w-80 md:shadow-none md:translate-x-0",
                        !sidebarOpen && "md:w-0 md:opacity-0 md:overflow-hidden md:border-l-0"
                    )}>
                        <div className="p-4 border-b font-bold text-sm flex items-center justify-between bg-muted/40 shrink-0">
                            <div className="flex items-center gap-2 text-foreground">
                                <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <BookOpen className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-sm leading-none">Course Content</span>
                                    <span className="text-[11px] text-muted-foreground font-normal pt-1">
                                        {completedCount} of {allCourseItems.length} Completed
                                    </span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                                {sections.length > 0 ? (
                                    sections.map((section) => {
                                        const isUnlocked = unlockedSections.has(section.id);
                                        const sectionCompletedCount = section.items?.filter((i: any) => 
                                            i.itemType === 'assignment' ? submittedAssignments.has(i.id) : completedContents.has(i.id)
                                        ).length || 0;
                                        const isSectionFullyDone = section.items?.length > 0 && sectionCompletedCount === section.items.length;

                                        return (
                                            <AccordionItem key={section.id} value={section.id} className={cn("border-b", !isUnlocked && "opacity-75")}>
                                                <AccordionTrigger className={cn("px-4 py-3.5 hover:bg-muted/30 hover:no-underline", !isUnlocked && "pointer-events-none")}>
                                                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                                                        {!isUnlocked ? (
                                                            <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                                                                <Lock className="h-3.5 w-3.5" />
                                                            </div>
                                                        ) : isSectionFullyDone ? (
                                                            <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                                <CheckCircle className="h-4 w-4" />
                                                            </div>
                                                        ) : (
                                                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                                                {section.order_index ? section.order_index + 1 : '•'}
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col text-left min-w-0 flex-1">
                                                            <span className="text-xs sm:text-sm font-bold break-words text-foreground leading-snug">
                                                                {section.title}
                                                            </span>
                                                            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground pt-1 flex-wrap">
                                                                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                                                                    <Clock className="h-3 w-3" />
                                                                    {section.allocated_hours ? `${section.allocated_hours} Hrs` : (section.items?.length ? `${Math.round(section.items.length * 0.5 * 10) / 10} Hrs` : '4.0 Hrs')}
                                                                </span>
                                                                {section.week_number && (
                                                                    <span className="text-muted-foreground/70">• Week {section.week_number}</span>
                                                                )}
                                                                <span className="text-muted-foreground/70">• {sectionCompletedCount}/{section.items?.length || 0} Done</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>

                                                <AccordionContent className="p-0 pb-0">
                                                    <div className="flex flex-col divide-y divide-border/30">
                                                        {section.items.map((item: any) => {
                                                            const isItemCompleted = item.itemType === 'assignment' ? submittedAssignments.has(item.id) : completedContents.has(item.id);
                                                            const isCurrentActive = currentContent?.id === item.id;

                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    onClick={() => {
                                                                        if (item.itemType !== 'assignment' && isUnlocked) {
                                                                            setCurrentContent(item);
                                                                            if (window.innerWidth < 768) setSidebarOpen(false);
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-all border-l-2 border-transparent hover:bg-muted/40 min-w-0 w-full",
                                                                        isCurrentActive && "bg-primary/10 border-primary font-medium text-primary shadow-2xs",
                                                                        !isUnlocked && "opacity-50 cursor-not-allowed pointer-events-none"
                                                                    )}
                                                                >
                                                                    <Checkbox
                                                                        checked={isItemCompleted}
                                                                        className={cn(
                                                                            "mt-0.5 shrink-0 border-muted-foreground/40 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600",
                                                                            !isUnlocked && "pointer-events-none"
                                                                        )}
                                                                    />
                                                                    <div className="space-y-1.5 flex-1 min-w-0">
                                                                        <div className="flex items-start justify-between gap-2 w-full min-w-0">
                                                                            {item.itemType === 'assignment' ? (
                                                                                <Link
                                                                                    to={isUnlocked ? (item.type === 'quiz' ? `/student/quiz/${item.id}` : `/student/assignments/${item.id}`) : "#"}
                                                                                    className={cn(
                                                                                        "group flex items-start justify-between gap-2 w-full min-w-0 hover:no-underline",
                                                                                        !isUnlocked && "pointer-events-none"
                                                                                    )}
                                                                                >
                                                                                    <span className={cn(
                                                                                        "text-xs sm:text-sm font-medium leading-snug break-words flex-1 min-w-0 group-hover:text-primary transition-colors",
                                                                                        isCurrentActive && "text-primary font-bold"
                                                                                    )}>
                                                                                        {item.title}
                                                                                    </span>
                                                                                    <Badge 
                                                                                        variant="outline" 
                                                                                        className={cn(
                                                                                            "shrink-0 text-[10px] px-2 py-0.5 font-semibold leading-none rounded-md whitespace-nowrap mt-0.5 border shadow-2xs",
                                                                                            item.type === 'quiz'
                                                                                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30"
                                                                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
                                                                                        )}
                                                                                    >
                                                                                        {item.type === 'quiz' ? 'Quiz' : 'Assignment'}
                                                                                    </Badge>
                                                                                </Link>
                                                                            ) : (
                                                                                <span className={cn(
                                                                                    "text-xs sm:text-sm font-medium leading-snug break-words flex-1 min-w-0",
                                                                                    isCurrentActive && "text-primary font-bold"
                                                                                )}>
                                                                                    {item.title}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div className="flex gap-1.5 text-[10px] text-muted-foreground flex-wrap items-center pt-0.5">
                                                                            <span className="flex items-center gap-1 font-semibold text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded" title="Estimated Lesson Time">
                                                                                <Clock className="h-3 w-3" /> {item.duration_minutes || 15} mins
                                                                            </span>
                                                                            {item.video_url && (
                                                                                <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium" title="Video">
                                                                                    <Video className="h-3 w-3" /> Video
                                                                                </span>
                                                                            )}
                                                                            {item.pdf_url && (
                                                                                <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium" title="PDF">
                                                                                    <FileText className="h-3 w-3" /> PDF
                                                                                </span>
                                                                            )}
                                                                            {item.content_text && !item.video_url && !item.pdf_url && (
                                                                                <span className="flex items-center gap-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium" title="Text">
                                                                                    <Type className="h-3 w-3" /> Reading
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {section.items.length === 0 && (
                                                            <div className="p-4 text-xs text-muted-foreground text-center">
                                                                No lessons in this section yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                        No sections found.
                                    </div>
                                )}
                            </Accordion>
                        </ScrollArea>
                    </aside>
                </div>
            </div>

            {/* 🔥 3-SECTION MODULE STREAK UNLOCKED DIALOG */}
            <Dialog open={streakModalOpen} onOpenChange={setStreakModalOpen}>
                <DialogContent className="sm:max-w-md text-center bg-slate-950 border-orange-500/50 text-white shadow-2xl">
                    <DialogHeader className="items-center text-center">
                        <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-lg animate-bounce my-2">
                            <Flame className="h-10 w-10 text-slate-950 fill-slate-950" />
                        </div>
                        <DialogTitle className="text-2xl font-black font-display tracking-tight text-orange-400">
                            🔥 LEARNING STREAK UNLOCKED!
                        </DialogTitle>
                        <DialogDescription className="text-slate-300 text-sm mt-1">
                            You have completed <strong>3 Section Modules</strong> in a row! You're on fire!
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-3">
                        <div className="p-3 rounded-xl bg-orange-950/40 border border-orange-500/30 flex items-center justify-around font-mono text-sm">
                            <div>
                                <p className="text-xs text-orange-300">Streak Progress</p>
                                <p className="text-xl font-bold text-orange-400">🔥 {streakCount} Sections</p>
                            </div>
                            <div className="h-8 w-px bg-orange-500/20" />
                            <div>
                                <p className="text-xs text-amber-300">Bonus Award</p>
                                <p className="text-xl font-bold text-amber-400">✨ +50 Aura Points</p>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300">
                            🎉 <strong>Themes Unlocked!</strong> You can now select new custom LMS themes in <strong>Settings</strong>!
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-center">
                        <Button onClick={() => setStreakModalOpen(false)} className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold hover:from-orange-600 hover:to-amber-600">
                            Keep Up the Streak! 🔥
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
