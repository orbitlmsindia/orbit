import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
    Loader2
} from "lucide-react";

export default function AdminCourseDetail() {
    const { id } = useParams();
    const { toast } = useToast();
    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("curriculum");
    const [sections, setSections] = useState<any[]>([]);

    useEffect(() => {
        if (id) fetchCourseData();
    }, [id]);

    const fetchCourseData = async () => {
        setLoading(true);
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', id)
            .single();

        if (courseError) {
            console.error(courseError);
            toast({ variant: "destructive", title: "Error", description: "Failed to load course" });
            setLoading(false);
            return;
        }

        setCourse(courseData);

        // Fetch sections and content
        const { data: sectionData, error: sectionError } = await supabase
            .from('course_sections')
            .select(`
                *,
                section_contents (*)
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

    if (loading) return <AdminLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div></AdminLayout>;

    return (
        <AdminLayout>
            <div className="flex items-center gap-4 mb-6 animate-fade-in p-6 pb-0">
                <Link to="/admin/courses">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-display font-bold">{course.title}</h1>
                    <p className="text-muted-foreground text-sm">{course.description}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Preview</Button>
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
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Course Title</Label>
                                <Input defaultValue={course.title} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea className="min-h-[100px]" defaultValue={course.description} disabled />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="students">
                    <div className="p-8 text-center text-muted-foreground">Student enrollment list will appear here.</div>
                </TabsContent>
            </Tabs>
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
            <DialogContent className="sm:max-w-lg">
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
