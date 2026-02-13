import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, File, X, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AssignmentSubmit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [assignment, setAssignment] = useState<any>(null);
    const [submission, setSubmission] = useState<any>(null);

    // Form State
    const [file, setFile] = useState<File | null>(null);
    const [textContent, setTextContent] = useState("");

    useEffect(() => {
        if (id) fetchAssignmentDetails();
    }, [id]);

    const fetchAssignmentDetails = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            // 1. Fetch Assignment
            const { data: assign, error: assignError } = await supabase
                .from('assignments')
                .select(`
                    *,
                    course:courses(title)
                `)
                .eq('id', id)
                .single();

            if (assignError) throw assignError;
            setAssignment(assign);

            // 2. Check for existing submission
            const { data: sub, error: subError } = await supabase
                .from('submissions')
                .select('*')
                .eq('assignment_id', id)
                .eq('student_id', user.id)
                .maybeSingle();

            if (subError) console.error("Error checking submission:", subError);
            if (sub) setSubmission(sub);

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load assignment details." });
        } finally {
            setLoading(false);
        }
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) setFile(droppedFile);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file && !textContent.trim()) {
            toast({ variant: "destructive", title: "Empty Submission", description: "Please upload a file or write a response." });
            return;
        }

        try {
            setSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            let fileUrl = null;

            // 1. Upload File if present
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${id}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('assignments')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error("Storage Error:", uploadError);
                    // Fallback check if bucket missing? 
                    // Usually throwing error here is best.
                    throw new Error("File upload failed. Ensure 'assignments' bucket exists.");
                }

                const { data: publicUrlData } = supabase.storage
                    .from('assignments')
                    .getPublicUrl(fileName);

                fileUrl = publicUrlData.publicUrl;
            }

            // 2. Insert Submission
            const payload = {
                assignment_id: id,
                student_id: user.id,
                file_url: fileUrl,
                text_content: textContent,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            };

            const { error: insertError } = await supabase
                .from('submissions')
                .insert([payload]);

            if (insertError) throw insertError;

            toast({ title: "Success", description: "Assignment submitted successfully!" });

            // Refresh state to show submitted view
            fetchAssignmentDetails();

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Submission Failed", description: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </StudentLayout>
        );
    }

    if (!assignment) {
        return (
            <StudentLayout>
                <div className="max-w-2xl mx-auto py-12 text-center">
                    <h1 className="text-2xl font-bold">Assignment Not Found</h1>
                    <Link to="/student/assignments">
                        <Button variant="outline" className="mt-4">Back to List</Button>
                    </Link>
                </div>
            </StudentLayout>
        );
    }

    if (submission) {
        return (
            <StudentLayout>
                <div className="max-w-2xl mx-auto py-12 text-center space-y-6 animate-fade-in">
                    <div className="h-24 w-24 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
                        <CheckCircle className="h-12 w-12" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-display">Assignment Submitted!</h1>
                        <p className="text-muted-foreground mt-2">
                            Submitted on {new Date(submission.submitted_at).toLocaleDateString()} at {new Date(submission.submitted_at).toLocaleTimeString()}
                        </p>
                        {submission.status === 'graded' && (
                            <div className="mt-4 p-4 bg-muted/30 rounded-lg inline-block text-left min-w-[300px]">
                                <p className="text-sm font-medium mb-1">Grade</p>
                                <p className="text-2xl font-bold text-primary mb-3">
                                    {submission.grade} / {assignment.points}
                                </p>
                                {submission.feedback && (
                                    <>
                                        <p className="text-sm font-medium mb-1">Feedback</p>
                                        <p className="text-sm text-muted-foreground bg-background p-2 rounded border">
                                            {submission.feedback}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <Link to="/student/assignments">
                        <Button variant="outline">Back to Assignments</Button>
                    </Link>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <Link to="/student/assignments">
                    <Button variant="ghost" className="gap-2 pl-0 hover:pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Back to Assignments
                    </Button>
                </Link>

                <div className="space-y-2">
                    <div className="flex justify-between items-start">
                        <h1 className="text-3xl font-display font-bold">{assignment.title}</h1>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary">{assignment.points}</span>
                            <span className="text-xs text-muted-foreground block uppercase tracking-wider">Points</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{assignment.course?.title}</span>
                        <span>•</span>
                        <span>Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No Due Date"}</span>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">
                            {assignment.description || "No instructions provided."}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Your Submission</CardTitle>
                        <CardDescription>Upload your project files or write your response.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* File Upload Area */}
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${file ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50 border-muted'}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <input type="file" id="file-upload" className="hidden" onChange={handleFileSelect} />

                            {file ? (
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-background rounded-lg flex items-center justify-center border shadow-sm">
                                        <File className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-sm">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <Button size="icon" variant="ghost" className="ml-2 hover:text-destructive" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <UploadCloud className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium">Click to upload or drag and drop</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, ZIP, PNG, JPG (max. 10MB)</p>
                                </>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Text Response (Optional)</Label>
                            <Textarea
                                placeholder="Write your answer or add notes for the teacher..."
                                className="min-h-[100px]"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button size="lg" onClick={handleSubmit} disabled={submitting || (!file && !textContent.trim())}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {submitting ? "Submitting..." : "Submit Assignment"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </StudentLayout>
    );
}
