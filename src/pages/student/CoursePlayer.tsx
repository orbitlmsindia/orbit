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
    FileCheck
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
                    id, title, order_index,
                    items:section_contents(id, title, video_url, pdf_url, content_text, order_index, created_at, min_watch_percent)
                `)
                .eq('course_id', id)
                .order('order_index', { ascending: true });

            if (sectionsError) {
                console.warn("CoursePlayer sections query fallback:", sectionsError);
                const { data: fallbackSections } = await supabase
                    .from('course_sections')
                    .select(`
                        id, title,
                        items:section_contents(id, title, video_url, pdf_url, content_text, created_at, min_watch_percent)
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
                <header className="h-16 border-b flex items-center px-4 justify-between bg-card z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <Link to="/student/courses">
                            <Button variant="ghost" size="icon">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-semibold line-clamp-1">{course.title}</h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                {currentContent ? currentContent.title : "Select a lesson"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Progress placeholder */}
                        <div className="hidden sm:flex flex-col items-end w-32">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">
                                    {sections.length > 0 ? Math.round((Array.from(completedContents).length / Math.max(1, sections.flatMap(s => s.items).filter(i => i.itemType !== 'assignment').length)) * 100) : 0}% Completed
                                </span>
                            </div>
                            <Progress value={sections.length > 0 ? (Array.from(completedContents).length / Math.max(1, sections.flatMap(s => s.items).filter(i => i.itemType !== 'assignment').length)) * 100 : 0} className="h-1.5" />
                        </div>
                        <Button variant="outline" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col overflow-y-auto bg-muted/10 relative">
                        {currentContent ? (
                            <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8">

                                <h2 className="text-2xl font-bold font-display">{currentContent.title}</h2>

                                {/* 1. Video Player */}
                                {(currentContent.type === 'video' || (currentContent.video_url && currentContent.type !== 'pdf' && currentContent.type !== 'presentation' && currentContent.type !== 'document' && currentContent.type !== 'text')) && (
                                    <SecureVideoPlayer
                                        key={currentContent.id}
                                        videoUrl={currentContent.video_url || currentContent.content_url}
                                        title={currentContent.title}
                                        userEmail={userEmail}
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
                                    <div className="bg-card p-4 md:p-6 rounded-xl border shadow-sm space-y-3 relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
                                        <div className="flex items-center justify-between pb-2 border-b">
                                            <div className="flex items-center gap-2">
                                                <Presentation className="h-5 w-5 text-purple-600" />
                                                <h3 className="font-bold text-base">Interactive Presentation Deck</h3>
                                            </div>
                                            <Badge className="bg-purple-600/10 text-purple-600 border-purple-500/30 text-xs">Protected Content</Badge>
                                        </div>
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border shadow-inner">
                                            {/* Security Watermark Overlay */}
                                            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center opacity-15 rotate-[-25deg]">
                                                <span className="text-xl md:text-2xl font-mono font-bold text-foreground tracking-widest uppercase">
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

                                {/* 3. PDF / Document / Reference Material Viewer (Secure Embed) */}
                                {(currentContent.type === 'pdf' || currentContent.type === 'document' || currentContent.type === 'reference' || (currentContent.pdf_url && currentContent.type !== 'presentation')) && (
                                    <div className="bg-card p-4 md:p-6 rounded-xl border shadow-sm space-y-3 relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
                                        <div className="flex items-center justify-between pb-2 border-b">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <h3 className="font-bold text-base">Reference Material & Document</h3>
                                            </div>
                                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">Proprietary Material</Badge>
                                        </div>
                                        <div className="relative h-[600px] w-full rounded-xl overflow-hidden bg-muted/20 border border-border shadow-inner">
                                            {/* Security Watermark Overlay */}
                                            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center opacity-15 rotate-[-25deg]">
                                                <span className="text-xl md:text-2xl font-mono font-bold text-foreground tracking-widest uppercase">
                                                    PROPRIETARY • {userEmail || "Orbit Student"}
                                                </span>
                                            </div>
                                            <iframe
                                                src={getEmbeddableDocUrl(currentContent.pdf_url || currentContent.content_url || currentContent.url || '')}
                                                className="w-full h-full border-none"
                                                title={currentContent.title}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 4. Text Notes Content */}
                                {currentContent.content_text && (
                                    <div className="bg-card p-6 md:p-8 rounded-xl border shadow-sm max-w-none select-none" onContextMenu={(e) => e.preventDefault()}>
                                        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                                            <Type className="h-5 w-5 text-primary" />
                                            <h3 className="text-lg font-bold">Lesson Notes & Material</h3>
                                        </div>
                                        <MarkdownRenderer content={currentContent.content_text} />
                                    </div>
                                )}

                                {/* Footer / Completion */}
                                <div className="pt-8 border-t flex items-center justify-between">
                                    <p className="text-muted-foreground text-sm">
                                        Complete all sections to finish this lesson.
                                    </p>
                                    {(() => {
                                        const isVideo = currentContent.type === 'video' || !!currentContent.video_url;
                                        const requiredPercent = currentContent.min_watch_percent || course?.min_watch_percent || 80;
                                        const currentWatched = watchProgressMap[currentContent.id] || 0;
                                        const isCompleted = completedContents.has(currentContent.id);
                                        const isRequirementMet = !isVideo || currentWatched >= requiredPercent || isCompleted;

                                        return (
                                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                                {isVideo && !isCompleted && (
                                                    <Badge variant="outline" className={`text-xs py-1 px-2.5 font-mono ${isRequirementMet ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}>
                                                        {isRequirementMet ? `Watch Goal Met (${currentWatched}%)` : `Watched ${currentWatched}% / ${requiredPercent}% Required`}
                                                    </Badge>
                                                )}
                                                <Button
                                                    size="sm"
                                                    className="gap-2"
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
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                Select a lesson from the sidebar to start.
                            </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="shrink-0 p-4 border-t bg-card flex justify-between items-center max-w-4xl mx-auto w-full">
                            <Button variant="ghost" className="gap-2" disabled>
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </Button>
                            <Button className="gap-2" disabled>
                                Next Lesson <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </main>

                    {/* Sidebar - Course Content */}
                    <aside className={cn(
                        "w-80 border-l bg-card flex flex-col transition-all duration-300 absolute inset-y-0 right-0 z-20 md:static",
                        !sidebarOpen && "translate-x-full md:w-0 md:translate-x-0 md:opacity-0 md:overflow-hidden"
                    )}>
                        <div className="p-4 border-b font-medium text-sm flex items-center justify-between bg-muted/30">
                            <span>Course Content</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden" onClick={() => setSidebarOpen(false)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                                {sections.length > 0 ? (
                                    sections.map((section) => {
                                        const isUnlocked = unlockedSections.has(section.id);
                                        return (
                                            <AccordionItem key={section.id} value={section.id} className={cn("border-b", !isUnlocked && "opacity-75")}>
                                                <AccordionTrigger className={cn("px-4 py-3 hover:bg-muted/30 hover:no-underline", !isUnlocked && "pointer-events-none")}>
                                                    <div className="flex items-center gap-2">
                                                        {!isUnlocked && <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
                                                        <span className="text-sm font-semibold text-left">{section.title}</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-0 pb-0">
                                                    <div className="flex flex-col">
                                                        {section.items.map((item: any) => {
                                                            const isItemCompleted = item.itemType === 'assignment' ? submittedAssignments.has(item.id) : completedContents.has(item.id);
                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    onClick={() => (item.itemType === 'assignment' || !isUnlocked) ? null : setCurrentContent(item)}
                                                                    className={cn(
                                                                        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 border-transparent hover:bg-muted/50",
                                                                        currentContent?.id === item.id && "bg-primary/5 border-primary",
                                                                        !isUnlocked && "opacity-50 cursor-not-allowed pointer-events-none"
                                                                    )}
                                                                >
                                                                    <Checkbox
                                                                        checked={isItemCompleted}
                                                                        className={cn("mt-1 translate-y-[2px]", !isUnlocked && "pointer-events-none")}
                                                                    />
                                                                    <div className="space-y-1 flex-1">
                                                                        <div className={cn(
                                                                            "text-sm font-medium leading-none flex justify-between",
                                                                            currentContent?.id === item.id && "text-primary"
                                                                        )}>
                                                                            {item.itemType === 'assignment' ? (
                                                                                <Link
                                                                                    to={isUnlocked ? (item.type === 'quiz' ? `/student/quiz/${item.id}` : `/student/assignments/${item.id}`) : "#"}
                                                                                    className={cn("hover:underline flex items-center gap-2 w-full", !isUnlocked && "pointer-events-none")}
                                                                                >
                                                                                    <span>{item.title}</span>
                                                                                    <Badge variant="secondary" className="scale-75 origin-right ml-auto">
                                                                                        {item.type === 'quiz' ? 'Quiz' : 'Assignment'}
                                                                                    </Badge>
                                                                                </Link>
                                                                            ) : (
                                                                                <span>{item.title}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
                                                                            {item.video_url && <span className="flex items-center gap-0.5" title="Video"><Video className="h-3 w-3" /> Video</span>}
                                                                            {item.pdf_url && <span className="flex items-center gap-0.5" title="PDF"><FileText className="h-3 w-3" /> PDF</span>}
                                                                            {item.content_text && <span className="flex items-center gap-0.5" title="Text"><Type className="h-3 w-3" /> Text</span>}
                                                                            {item.itemType === 'assignment' && (
                                                                                item.type === 'quiz'
                                                                                    ? <span className="flex items-center gap-0.5" title="Quiz"><BrainCircuit className="h-3 w-3" /> Quiz</span>
                                                                                    : <span className="flex items-center gap-0.5" title="Assignment"><FileText className="h-3 w-3" /> Assignment</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                        {section.items.length === 0 && (
                                                            <div className="p-4 text-xs text-muted-foreground text-center">
                                                                No content yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        )
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
