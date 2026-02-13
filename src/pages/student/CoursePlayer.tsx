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
    BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function CoursePlayer() {
    const { id } = useParams();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);

    // Player State
    const [currentContent, setCurrentContent] = useState<any>(null);

    useEffect(() => {
        if (id) fetchCourseContent();
    }, [id]);

    const fetchCourseContent = async () => {
        try {
            setLoading(true);

            // 1. Fetch Course Info
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);

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

            // Set initial content (first item of first section)
            if (sorted.length > 0 && sorted[0].items.length > 0) {
                setCurrentContent(sorted[0].items[0]);
            }

        } catch (error) {
            console.error("Error loading course content:", error);
        } finally {
            setLoading(false);
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
        <div className="flex h-screen w-full bg-background overflow-hidden flex-col">
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
                            <span className="text-xs font-medium">0% Completed</span>
                        </div>
                        <Progress value={0} className="h-1.5" />
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
                                    {currentContent.video_url.includes("youtube") || currentContent.video_url.includes("youtu.be") ? (
                                        <iframe
                                            src={currentContent.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/") + "?autoplay=1"}
                                            className="w-full h-full"
                                            allowFullScreen
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            title={currentContent.title}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white bg-gray-900">
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
                                <Button className="gap-2">
                                    <CheckCircle className="h-4 w-4" /> Mark as Complete
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
                                sections.map((section) => (
                                    <AccordionItem key={section.id} value={section.id} className="border-b">
                                        <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline">
                                            <span className="text-sm font-semibold text-left">{section.title}</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0 pb-0">
                                            <div className="flex flex-col">
                                                {section.items.map((item: any) => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => item.itemType === 'assignment' ? null : setCurrentContent(item)}
                                                        className={cn(
                                                            "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 border-transparent hover:bg-muted/50",
                                                            currentContent?.id === item.id && "bg-primary/5 border-primary"
                                                        )}
                                                    >
                                                        <Checkbox className="mt-1 translate-y-[2px]" />
                                                        <div className="space-y-1 flex-1">
                                                            <div className={cn(
                                                                "text-sm font-medium leading-none flex justify-between",
                                                                currentContent?.id === item.id && "text-primary"
                                                            )}>
                                                                {item.itemType === 'assignment' ? (
                                                                    <Link
                                                                        to={item.type === 'quiz' ? `/student/quiz/${item.id}` : `/student/assignments/${item.id}`}
                                                                        className="hover:underline flex items-center gap-2 w-full"
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
                                                ))}
                                                {section.items.length === 0 && (
                                                    <div className="p-4 text-xs text-muted-foreground text-center">
                                                        No content yet.
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))
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
    );
}
