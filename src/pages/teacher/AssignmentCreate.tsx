import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Eye, Loader2, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AssignmentCreate() {
    const { toast } = useToast();
    const [assignmentType, setAssignmentType] = useState("manual");
    const [publishing, setPublishing] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Form State
    const [courses, setCourses] = useState<any[]>([]);
    const [courseId, setCourseId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [points, setPoints] = useState("100");
    const [title, setTitle] = useState("");
    const [instructions, setInstructions] = useState("");
    const [fileSize, setFileSize] = useState("10");
    const [teacherDriveUrl, setTeacherDriveUrl] = useState("");

    useEffect(() => {
        const fetchCourses = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
            
            let query = supabase.from('courses').select('id, title');
            if (profile?.role !== 'admin') {
                query = query.eq('teacher_id', user.id);
            }
            const { data } = await query;
            if (data) setCourses(data);
        };
        fetchCourses();
    }, []);

    const handleNumberInput = (setter: (val: string) => void, max?: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === "") {
            setter("");
            return;
        }
        const num = parseFloat(val);
        if (num < 0) {
            setter("0");
        } else if (max !== undefined && num > max) {
            setter(max.toString());
        } else {
            setter(val);
        }
    };

    const handlePublish = async () => {
        if (!courseId) return toast({ variant: "destructive", title: "Error", description: "Please select a course." });
        if (!title) return toast({ variant: "destructive", title: "Error", description: "Please enter a title." });
        if (!dueDate) return toast({ variant: "destructive", title: "Error", description: "Please select a due date." });
        if (!points || parseFloat(points) <= 0) return toast({ variant: "destructive", title: "Error", description: "Please enter valid marks." });

        try {
            setPublishing(true);
            const { error } = await supabase.from('assignments').insert([{
                course_id: courseId,
                title,
                description: instructions,
                type: assignmentType,
                points: parseFloat(points),
                due_date: dueDate,
                teacher_drive_url: teacherDriveUrl || null,
                max_file_size_mb: parseFloat(fileSize) || 10
            }]);

            if (error) throw error;
            toast({ title: "Success", description: "Assignment published successfully!" });
            
            // Reset form
            setTitle("");
            setInstructions("");
            setDueDate("");
            setCourseId("");
            setTeacherDriveUrl("");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setPublishing(false);
        }
    };

    const handlePreview = () => {
        if (!title || !instructions) {
            return toast({ variant: "destructive", title: "Missing details", description: "Please enter a title and instructions to preview." });
        }
        setPreviewOpen(true);
    };

    return (
        <TeacherLayout>
            <div className="flex items-center justify-between mb-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">Create Assignment</h1>
                    <p className="text-muted-foreground">Set up a new assignment or quiz for your students.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={handlePreview} disabled={publishing}>
                        <Eye className="h-4 w-4" /> Preview
                    </Button>
                    <Button className="gap-2" onClick={handlePublish} disabled={publishing}>
                        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                        Publish
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-4 animate-fade-in delay-75">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Course</Label>
                                <Select value={courseId} onValueChange={setCourseId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                        ))}
                                        {courses.length === 0 && <SelectItem value="none" disabled>No courses available</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Section / Module (Optional)</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="m1">Module 1: Intro</SelectItem>
                                        <SelectItem value="m2">Module 2: Basics</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input 
                                    type="datetime-local" 
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Marks</Label>
                                <Input 
                                    type="number" 
                                    placeholder="100" 
                                    min="0"
                                    max="1000"
                                    value={points}
                                    onChange={handleNumberInput(setPoints, 1000)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Tabs value={assignmentType} onValueChange={setAssignmentType} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                            <TabsTrigger value="manual">Manual Assignment</TabsTrigger>
                            <TabsTrigger value="quiz">Quiz Builder</TabsTrigger>
                        </TabsList>

                        <TabsContent value="manual" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assignment Details</CardTitle>
                                    <CardDescription>Create a standard assignment where students submit files or text.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Assignment Title</Label>
                                        <Input 
                                            placeholder="e.g., Build a Portfolio Website" 
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Instructions</Label>
                                        <Textarea 
                                            className="min-h-[200px]" 
                                            placeholder="Detailed instructions for the students..." 
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                        />
                                    </div>
                                     {/* Teacher Google Drive Folder Link Option */}
                                     <div className="space-y-2 p-4 border rounded-xl bg-primary/10 border-primary/30">
                                         <Label className="font-bold text-primary flex items-center gap-1.5">
                                             📁 Teacher's Google Drive Submission Folder (Optional)
                                         </Label>
                                         <Input
                                             type="url"
                                             placeholder="https://drive.google.com/drive/folders/your-folder-id"
                                             value={teacherDriveUrl}
                                             onChange={(e) => setTeacherDriveUrl(e.target.value)}
                                             className="bg-background"
                                         />
                                         <p className="text-xs text-muted-foreground">
                                             Provide a Google Drive folder link where students can upload project files directly. Students will see a prominent <strong>"Upload to Sir's Drive ↗"</strong> button on their submission portal.
                                         </p>
                                     </div>

                                     <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                         <div className="space-y-0.5">
                                             <Label className="text-base">File Upload</Label>
                                             <p className="text-sm text-muted-foreground">Allow students to upload files</p>
                                         </div>
                                         <Switch defaultChecked />
                                     </div>

                                    {/* File Upload Limits */}
                                    <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                                        <div className="space-y-2">
                                            <Label>Maximum File Size (MB)</Label>
                                            <Input
                                                type="number"
                                                placeholder="10"
                                                min="1"
                                                max="100"
                                                value={fileSize}
                                                onChange={handleNumberInput(setFileSize, 100)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Limit the maximum file size students can upload (1-100 MB)
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Allowed File Types</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <input type="checkbox" id="pdf" defaultChecked className="rounded" />
                                                    <label htmlFor="pdf" className="text-sm">PDF (.pdf)</label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input type="checkbox" id="doc" defaultChecked className="rounded" />
                                                    <label htmlFor="doc" className="text-sm">Word (.doc, .docx)</label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input type="checkbox" id="txt" defaultChecked className="rounded" />
                                                    <label htmlFor="txt" className="text-sm">Text (.txt)</label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input type="checkbox" id="img" defaultChecked className="rounded" />
                                                    <label htmlFor="img" className="text-sm">Images (.jpg, .png)</label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input type="checkbox" id="zip" className="rounded" />
                                                    <label htmlFor="zip" className="text-sm">Archive (.zip)</label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input type="checkbox" id="ppt" className="rounded" />
                                                    <label htmlFor="ppt" className="text-sm">PowerPoint (.ppt, .pptx)</label>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Select which file types students can upload
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="quiz" className="space-y-6">
                            <QuizBuilder />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Preview Modal */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Student Preview</DialogTitle>
                        <DialogDescription>This is how the assignment will appear to your students.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-4">
                        <div className="space-y-2 border-b pb-4">
                            <h2 className="text-2xl font-bold">{title || "Untitled Assignment"}</h2>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <div><span className="font-medium text-foreground">Due Date:</span> {dueDate ? new Date(dueDate).toLocaleString() : "No due date"}</div>
                                <div><span className="font-medium text-foreground">Points:</span> {points}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold">Instructions</h3>
                            <div className="p-4 bg-muted/20 rounded-lg min-h-[100px] whitespace-pre-wrap text-sm">
                                {instructions || "No instructions provided."}
                            </div>
                        </div>

                        {assignmentType === 'manual' && (
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-semibold">Your Submission</h3>
                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                                    <h3 className="font-semibold mb-1">Click to upload or drag and drop</h3>
                                    <p className="text-sm text-muted-foreground mb-4">Max file size: {fileSize}MB</p>
                                    <Button disabled>Select File</Button>
                                </div>
                            </div>
                        )}
                        
                        {assignmentType === 'quiz' && (
                            <div className="space-y-4 pt-4 border-t">
                                <div className="p-4 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                                    Quiz interface preview will be available in future updates. 
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close Preview</Button>
                        <Button onClick={() => { setPreviewOpen(false); handlePublish(); }}>Publish Now</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </TeacherLayout>
    );
}

function QuizBuilder() {
    const [questions, setQuestions] = useState([{ 
        id: 1, 
        type: "mcq",
        options: [{ id: 1, text: "" }, { id: 2, text: "" }]
    }]);

    const addQuestion = () => {
        setQuestions([...questions, { 
            id: Date.now(), 
            type: "mcq",
            options: [{ id: Date.now(), text: "" }, { id: Date.now() + 1, text: "" }]
        }]);
    };

    const removeQuestion = (id: number) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const addOption = (questionId: number) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    options: [...(q.options || []), { id: Date.now(), text: "" }]
                };
            }
            return q;
        }));
    };

    const removeOption = (questionId: number, optionId: number) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    options: (q.options || []).filter(o => o.id !== optionId)
                };
            }
            return q;
        }));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Quiz Settings</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Time Limit (minutes)</Label>
                        <Input 
                            type="number" 
                            placeholder="45" 
                            min="0"
                            max="59"
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (val < 0) e.target.value = "0";
                                if (val > 59) e.target.value = "59";
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Passing Score (%)</Label>
                        <Input 
                            type="number" 
                            placeholder="50" 
                            min="1"
                            max="100"
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (val < 1) e.target.value = "1";
                                if (val > 100) e.target.value = "100";
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {questions.map((q, index) => (
                    <Card key={q.id} className="relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Label>Question {index + 1}</Label>
                                            <Input className="mt-1" placeholder="Enter your question here" />
                                        </div>
                                        <div className="w-[180px]">
                                            <Label>Type</Label>
                                            <Select defaultValue={q.type}>
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                                                    <SelectItem value="short">Short Answer</SelectItem>
                                                    <SelectItem value="long">Long Answer</SelectItem>
                                                    <SelectItem value="boolean">True / False</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-[100px]">
                                            <Label>Marks</Label>
                                            <Input 
                                                type="number" 
                                                className="mt-1" 
                                                placeholder="10" 
                                                min="0"
                                                max="100"
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (val < 0) e.target.value = "0";
                                                    if (val > 100) e.target.value = "100";
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Conditional Options Render based on type */}
                                    {(q.type === "mcq" || q.type === "boolean") && (
                                        <div className="pl-4 border-l-2 border-muted space-y-2">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Options</Label>
                                            <RadioGroup defaultValue={q.options?.[0]?.id?.toString() || "opt1"}>
                                                {q.options?.map((opt, oIdx) => (
                                                    <div key={opt.id} className="flex items-center gap-2">
                                                        <RadioGroupItem value={opt.id.toString()} id={`q${q.id}-opt${opt.id}`} />
                                                        <Input placeholder={`Option ${oIdx + 1}`} className="h-9" defaultValue={opt.text} />
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="h-8 w-8 text-muted-foreground"
                                                            onClick={() => removeOption(q.id, opt.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 text-xs gap-1 text-primary"
                                                    onClick={() => addOption(q.id)}
                                                >
                                                    <Plus className="h-3 w-3" /> Add Option
                                                </Button>
                                            </RadioGroup>
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeQuestion(q.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Button onClick={addQuestion} variant="outline" className="w-full py-8 border-dashed gap-2 hover:bg-muted/50">
                <Plus className="h-4 w-4" /> Add Question
            </Button>
        </div>
    );
}
