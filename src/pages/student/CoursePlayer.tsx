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
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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

    // Progression State
    const [completedContents, setCompletedContents] = useState<Set<string>>(new Set());
    const [submittedAssignments, setSubmittedAssignments] = useState<Set<string>>(new Set());
    const [unlockedSections, setUnlockedSections] = useState<Set<string>>(new Set());

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

            // 0. Check Enrollment Status First
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

            // 1. Fetch Course Info
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);
            setUserId(user.id);

            // 2. Fetch Sections & Contents
            const { data: sectionsData, error: sectionsError } = await supabase
                .from('course_sections')
                .select(`
                    *,
                    items:section_contents(*),
                    assignments(*)
                `)
                .eq('course_id', id)
                .order('order_index', { ascending: true });

            if (sectionsError) throw sectionsError;

            // Sort items
            const sorted = sectionsData.map((s: any) => {
                const contents = s.items?.map((i: any) => ({ ...i, itemType: 'content' })) || [];
                const assigns = s.assignments?.map((a: any) => ({ ...a, itemType: 'assignment' })) || [];
                const allItems = [...contents, ...assigns].sort((a: any, b: any) => {
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

        try {
            const { error } = await supabase
                .from('section_progress')
                .upsert({
                    user_id: userId,
                    content_id: currentContent.id,
                    completed: true,
                    completed_at: new Date().toISOString()
                }, { onConflict: 'user_id,content_id' });

            if (error) throw error;
            toast({ title: "Marked as complete!" });
            fetchCourseContent(); // Refresh progress locally
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
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
                                {currentContent.video_url && (
                                    <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-xl relative group">
                                        {/* Watermark Overlay to deter recording */}
                                        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-30 flex flex-wrap content-start justify-center text-white/20 select-none">
                                            {Array.from({ length: 40 }).map((_, i) => (
                                                <div key={i} className="transform -rotate-45 p-8 text-sm md:text-xl font-bold whitespace-nowrap">
                                                    {userEmail || "Orbit LMS "}
                                                </div>
                                            ))}
                                        </div>

                                        {currentContent.video_url.includes("youtube") || currentContent.video_url.includes("youtu.be") ? (
                                            <div className="w-full h-full pointer-events-none md:pointer-events-auto"> {/* Disable pointer events on mobile to ensure watermark doesn't block play on touches */}
                                                <iframe
                                                    src={currentContent.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/") + "?autoplay=1&modestbranding=1&rel=0"}
                                                    className="w-full h-full"
                                                    allowFullScreen
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    title={currentContent.title}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white bg-gray-900 z-20 relative">
                                                <a href={currentContent.video_url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 hover:text-primary transition-colors">
                                                    <Play className="h-12 w-12 opacity-80" />
                                                    <span>Click to Open Video</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 2. Text Content */}
                                {currentContent.content_text && (
                                    <div className="bg-card p-6 md:p-8 rounded-xl border shadow-sm prose dark:prose-invert max-w-none">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                            <Type className="h-5 w-5 text-primary" /> Lesson Notes
                                        </h3>
                                        <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                            {currentContent.content_text}
                                        </div>
                                    </div>
                                )}

                                {/* 3. PDF Resource */}
                                {currentContent.pdf_url && (
                                    <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center justify-between hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm">Reference Material</h3>
                                                <p className="text-xs text-muted-foreground">PDF Document</p>
                                            </div>
                                        </div>
                                        <a href={currentContent.pdf_url} target="_blank" rel="noreferrer">
                                            <Button variant="outline" className="gap-2">
                                                <Download className="h-4 w-4" /> Open PDF
                                            </Button>
                                        </a>
                                    </div>
                                )}

                                {/* Footer / Completion */}
                                <div className="pt-8 border-t flex items-center justify-between">
                                    <p className="text-muted-foreground text-sm">
                                        Complete all sections to finish this lesson.
                                    </p>
                                    <Button
                                        className="gap-2"
                                        onClick={handleMarkComplete}
                                        disabled={completedContents.has(currentContent.id)}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        {completedContents.has(currentContent.id) ? "Completed" : "Mark as Complete"}
                                    </Button>
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
        </>
    );
}
