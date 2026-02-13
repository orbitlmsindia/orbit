import { useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Eye, FileText, CheckCircle } from "lucide-react";

export default function AssignmentCreate() {
    const [assignmentType, setAssignmentType] = useState("manual");

    return (
        <TeacherLayout>
            <div className="flex items-center justify-between mb-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">Create Assignment</h1>
                    <p className="text-muted-foreground">Set up a new assignment or quiz for your students.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2"><Eye className="h-4 w-4" /> Preview</Button>
                    <Button className="gap-2"><Save className="h-4 w-4" /> Publish</Button>
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
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="web-101">Web Development 101</SelectItem>
                                        <SelectItem value="react-adv">Advanced React</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Section / Module</Label>
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
                                <Input type="datetime-local" />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Marks</Label>
                                <Input type="number" placeholder="100" />
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
                                        <Input placeholder="e.g., Build a Portfolio Website" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Instructions</Label>
                                        <Textarea className="min-h-[200px]" placeholder="Detailed instructions for the students..." />
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
                                                defaultValue="10"
                                                min="1"
                                                max="100"
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
        </TeacherLayout>
    );
}

function QuizBuilder() {
    const [questions, setQuestions] = useState([{ id: 1, type: "mcq" }]);

    const addQuestion = () => {
        setQuestions([...questions, { id: Date.now(), type: "mcq" }]);
    };

    const removeQuestion = (id: number) => {
        setQuestions(questions.filter(q => q.id !== id));
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
                        <Input type="number" placeholder="60" />
                    </div>
                    <div className="space-y-2">
                        <Label>Passing Score (%)</Label>
                        <Input type="number" placeholder="50" />
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
                                            <Input type="number" className="mt-1" placeholder="10" />
                                        </div>
                                    </div>

                                    {/* Conditional Options Render based on type (Mocked for MCQ) */}
                                    <div className="pl-4 border-l-2 border-muted space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Options</Label>
                                        <RadioGroup defaultValue="opt1">
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="opt1" id={`q${q.id}-opt1`} />
                                                <Input placeholder="Option 1" className="h-9" />
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"><Trash2 className="h-3 w-3" /></Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="opt2" id={`q${q.id}-opt2`} />
                                                <Input placeholder="Option 2" className="h-9" />
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"><Trash2 className="h-3 w-3" /></Button>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary">
                                                <Plus className="h-3 w-3" /> Add Option
                                            </Button>
                                        </RadioGroup>
                                    </div>
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
