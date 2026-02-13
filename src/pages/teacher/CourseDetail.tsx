import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    BrainCircuit
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function CourseDetail() {
    const { id } = useParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("curriculum");

    // Add Section State
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [addSectionOpen, setAddSectionOpen] = useState(false);

    useEffect(() => {
        if (id) fetchCourseDetails();
    }, [id]);

    const fetchCourseDetails = async () => {
        try {
            setLoading(true);
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);

            await fetchSections();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load course details." });
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async () => {
        const { data: sectionsData, error: sectionsError } = await supabase
            .from('course_sections')
            .select(`
                *,
                items:section_contents(*),
                assignments(*)
            `)
            .eq('course_id', id)
            .order('order_index', { ascending: true });

        if (sectionsError) {
            console.error(sectionsError);
        } else {
            // Sort items by order_index locally as well
            const sorted = sectionsData.map((s: any) => {
                const contents = s.items?.map((i: any) => ({ ...i, itemType: 'content' })) || [];
                const assigns = s.assignments?.map((a: any) => ({ ...a, itemType: 'assignment' })) || [];
                // detailed sorting logic can be added later, for now we just concat
                const allItems = [...contents, ...assigns].sort((a: any, b: any) => {
                    // if both have order_index, use it
                    if (a.order_index !== undefined && b.order_index !== undefined) return a.order_index - b.order_index;
                    // otherwise use created_at
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                });
                return { ...s, items: allItems };
            });
            setSections(sorted);
        }
    };

    const handleAddSection = async () => {
        if (!newSectionTitle) return;
        try {
            const { error } = await supabase
                .from('course_sections')
                .insert([{
                    course_id: id,
                    title: newSectionTitle,
                    order_index: sections.length
                }]);

            if (error) throw error;

            toast({ title: "Section added" });
            setNewSectionTitle("");
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
            <div className="flex items-center gap-4 mb-6 animate-fade-in">
                <Link to="/teacher/courses">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-display font-bold">{course.title}</h1>
                    <p className="text-muted-foreground text-sm line-clamp-1">{course.description}</p>
                </div>
                <div className="flex gap-2">
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
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in delay-75">
                <TabsList className="mb-6">
                    <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                </TabsList>

                <TabsContent value="curriculum" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Course Content</h2>
                        <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" /> Add Section
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Section</DialogTitle>
                                    <DialogDescription>Create a new section to organize your chapters.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="section-title">Section Title</Label>
                                        <Input
                                            id="section-title"
                                            placeholder="e.g., Introduction to React"
                                            value={newSectionTitle}
                                            onChange={(e) => setNewSectionTitle(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setAddSectionOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddSection}>Create Section</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Accordion type="multiple" className="space-y-4">
                        {sections.map((section) => (
                            <AccordionItem key={section.id} value={section.id} className="border rounded-xl bg-card px-4">
                                <div className="flex items-center py-4">
                                    <AccordionTrigger className="hover:no-underline flex-1 py-0">
                                        <span className="font-semibold text-lg">{section.title}</span>
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2 ml-4">
                                        <AddContentDialog sectionId={section.id} onSuccess={fetchSections} />
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
                                                    {item.type === "video" && <Video className="h-4 w-4" />}
                                                    {item.type === "pdf" && <FileText className="h-4 w-4" />}
                                                    {item.type === "text" && <Type className="h-4 w-4" />}
                                                    {item.itemType === 'assignment' && <BrainCircuit className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {item.itemType === 'assignment' ? (item.type === 'quiz' ? `Quiz • ${item.points || 100} pts` : `Assignment`) : (item.content_url || "Text Content")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                {item.type === 'quiz' && (
                                                    <Link to={`/teacher/courses/${id}/quiz/${item.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                            <Edit2 className="h-3 w-3" />
                                                        </Button>
                                                    </Link>
                                                )}
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
                        ))}
                        {sections.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                No sections yet. Click "Add Section" to start building your course.
                            </div>
                        )}
                    </Accordion>
                </TabsContent>

                <TabsContent value="overview">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Course Title</Label>
                                <Input
                                    value={course.title}
                                    onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    value={course.description || ""}
                                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                />
                            </div>
                            {/* Removed thumbnail upload for simplicity in this step, can add later */}
                            <div className="flex justify-end">
                                <Button onClick={() => updateCourseInfo({ title: course.title, description: course.description })}>Save Changes</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="students">
                    <div className="p-8 text-center text-muted-foreground">Student Management coming soon.</div>
                </TabsContent>
            </Tabs>
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

    // Quiz specific state
    const [dueDate, setDueDate] = useState("");
    const [timeLimit, setTimeLimit] = useState("60");
    const [points, setPoints] = useState("100");

    // Assignment specific state
    const [maxFileSize, setMaxFileSize] = useState("10");
    const [allowedTypes, setAllowedTypes] = useState<string[]>(["pdf", "doc", "docx", "txt"]);

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
                }

                const res = await supabase.from('assignments').insert([assignmentData]);
                error = res.error;
            } else {
                const contentPayload: any = {
                    section_id: sectionId,
                    title,
                    type
                };
                if (type === "text") {
                    contentPayload.content_text = htmlContent;
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
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-3 w-3" /> Add Content
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Content to Section</DialogTitle>
                    <DialogDescription>Choose the type of content you want to add.</DialogDescription>
                </DialogHeader>
                <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-4">
                        <TabsTrigger value="video">Video</TabsTrigger>
                        <TabsTrigger value="pdf">PDF</TabsTrigger>
                        <TabsTrigger value="text">Text</TabsTrigger>
                        <TabsTrigger value="quiz">Quiz</TabsTrigger>
                        <TabsTrigger value="assignment">Assignment</TabsTrigger>
                    </TabsList>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input placeholder="e.g., Intro Video" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        {type === "video" && (
                            <div className="space-y-2">
                                <Label>Video URL</Label>
                                <Input placeholder="e.g., YouTube or Vimeo link" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
                            </div>
                        )}

                        {type === "pdf" && (
                            <div className="space-y-2">
                                <Label>PDF URL</Label>
                                <Input placeholder="https://..." value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
                            </div>
                        )}

                        {type === "text" && (
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <Textarea
                                    className="min-h-[200px]"
                                    placeholder="Write your content here..."
                                    value={htmlContent}
                                    onChange={(e) => setHtmlContent(e.target.value)}
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
