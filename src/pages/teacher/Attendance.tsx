import { useState, useEffect, useRef } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Save, Search, CheckCircle2, XCircle, Loader2, Upload, FileUp, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function Attendance() {
    const { toast } = useToast();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [courseId, setCourseId] = useState<string>("");
    const [uploadedCourses, setUploadedCourses] = useState<any[]>([]);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Teacher's Courses (for the dropdown)
            const { data: myCourses } = await supabase
                .from('courses')
                .select('id, title')
                .eq('teacher_id', user.id);
            setUploadedCourses(myCourses || []);

            // 2. Fetch All Students (Single Institute)
            const { data: allStudents, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'student');

            if (error) throw error;

            // Transform data to include attendance status (default present)
            const formattedStudents = (allStudents || []).map((s: any) => ({
                id: s.id,
                name: s.full_name,
                email: s.email,
                avatar: s.avatar_url,
                status: 'present' // Default
            }));

            setStudents(formattedStudents);

        } catch (error: any) {
            console.error("Error fetching students:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load students." });
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = (studentId: string) => {
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                return { ...s, status: s.status === 'present' ? 'absent' : 'present' };
            }
            return s;
        }));
    };

    const handleSaveAttendance = async () => {
        if (!courseId) {
            toast({ variant: "destructive", title: "Error", description: "Please select a course first." });
            return;
        }
        if (!date) {
            toast({ variant: "destructive", title: "Error", description: "Please select a date." });
            return;
        }

        try {
            setLoading(true);

            // Prepare records
            const records = students.map(s => ({
                student_id: s.id,
                course_id: courseId,
                date: format(date, 'yyyy-MM-dd'),
                status: s.status
            }));

            // Delete existing records for this date/course to avoid duplicates (upsert strategy) or just insert
            // For simplicity, let's delete first then insert
            await supabase
                .from('attendance')
                .delete()
                .match({ course_id: courseId, date: format(date, 'yyyy-MM-dd') });

            const { error } = await supabase
                .from('attendance')
                .insert(records);

            if (error) throw error;

            toast({ title: "Success", description: "Attendance saved successfully." });
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!courseId) {
            toast({ variant: "destructive", title: "Error", description: "Please select a course first." });
            return;
        }

        setUploading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n');

                // Parse CSV: Student Name, Date, Status, Course Name
                // Skip header if present (simple check: if line 1 contains "Student Name")
                const startIndex = lines[0].toLowerCase().includes('student') ? 1 : 0;

                const validRecords: any[] = [];
                let successCount = 0;
                let failCount = 0;

                // Create lookup map for students (Name -> ID)
                const studentMap = new Map(students.map(s => [s.name.toLowerCase().trim(), s.id]));

                for (let i = startIndex; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const [studentName, dateStr, status, courseName] = line.split(',').map(s => s.trim());

                    // Validate Student
                    const studentId = studentMap.get(studentName.toLowerCase());
                    if (!studentId) {
                        console.warn(`Student not found: ${studentName}`);
                        failCount++;
                        continue;
                    }

                    // Validate/Parse Date (YYYY-MM-DD or DD-MM-YYYY or similar)
                    // Let's assume standard YYYY-MM-DD or try to parse
                    let parsedDate = dateStr;
                    // You might want stricter parsing here

                    // Validate Status
                    const validStatus = ['present', 'absent', 'late', 'excused'].includes(status.toLowerCase())
                        ? status.toLowerCase()
                        : 'present';

                    // Optional: Check Course Name match if provided
                    if (courseName && courseId) {
                        const currentCourse = uploadedCourses.find(c => c.id === courseId);
                        if (currentCourse && currentCourse.title.toLowerCase() !== courseName.toLowerCase()) {
                            console.warn(`Course mismatch for line ${i}: ${courseName} vs ${currentCourse.title}`);
                            // Decide: Skip or proceed? User said "select the course and in that course he can upload".
                            // I'll proceed but log it.
                        }
                    }

                    validRecords.push({
                        student_id: studentId,
                        course_id: courseId, // Use selected course ID
                        date: parsedDate,
                        status: validStatus
                    });
                    successCount++;
                }

                if (validRecords.length > 0) {
                    // Bulk insert
                    const { error } = await supabase
                        .from('attendance')
                        .insert(validRecords);

                    if (error) throw error;

                    toast({
                        title: "Bulk Upload Complete",
                        description: `Successfully uploaded ${successCount} records. ${failCount} failed (student not found).`
                    });
                    setUploadDialogOpen(false);
                    // Refresh view? maybe fetch for selected date
                } else {
                    toast({ variant: "destructive", title: "Upload Failed", description: "No valid records found in CSV." });
                }

            } catch (error: any) {
                console.error(error);
                toast({ variant: "destructive", title: "Error", description: "Failed to process file." });
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const headers = ["Student Name", "Date (YYYY-MM-DD)", "Status (present/absent)", "Course Name"];
        const rows = [
            ["John Doe", "2024-03-20", "present", "Web Development 101"],
            ["Jane Smith", "2024-03-20", "absent", "Web Development 101"]
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "attendance_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const presentCount = students.filter(s => s.status === 'present').length;
    const absentCount = students.length - presentCount;
    const presentPercentage = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

    return (
        <TeacherLayout>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">Attendance</h1>
                    <p className="text-muted-foreground">Track and manage student attendance.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Upload className="h-4 w-4" /> Bulk Upload
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Bulk Upload Attendance</DialogTitle>
                                <DialogDescription>
                                    Upload a CSV file to update attendance for the selected course ({uploadedCourses.find(c => c.id === courseId)?.title || "None"}).
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="p-4 border border-dashed rounded-lg bg-muted/50 text-center space-y-2">
                                    <FileUp className="h-8 w-8 mx-auto text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Drag and drop your CSV file here, or click to select.
                                    </p>
                                    <Input
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        id="csv-upload"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        disabled={uploading || !courseId}
                                    />
                                    <label
                                        htmlFor="csv-upload"
                                        className={cn(
                                            "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 cursor-pointer",
                                            (uploading || !courseId) && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Select CSV File
                                    </label>
                                    {!courseId && <p className="text-xs text-destructive">Please select a course first.</p>}
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Need a template?</span>
                                    <Button variant="link" size="sm" onClick={downloadTemplate} className="gap-1">
                                        <Download className="h-3 w-3" /> Download Template
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button className="gap-2" onClick={handleSaveAttendance} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Attendance
                    </Button>
                </div>
            </div>

            <Card className="animate-fade-in delay-75">
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="w-full md:w-[300px]">
                            <Select value={courseId} onValueChange={setCourseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uploadedCourses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                    ))}
                                    {uploadedCourses.length === 0 && <SelectItem value="none" disabled>No courses assigned</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full md:w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <div className="flex-1 w-full flex justify-end">
                            <div className="relative w-full md:w-[250px]">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search student..." className="pl-9" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        {loading ? (
                            <div className="p-8 flex justify-center text-muted-foreground">
                                <Loader2 className="animate-spin mr-2" /> Loading students...
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox />
                                        </TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead align="center" className="text-center w-[150px]">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No students found in your institute.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {students.map((student) => (
                                        <TableRow key={student.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => toggleStatus(student.id)}>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={student.status === "present"}
                                                    onCheckedChange={() => toggleStatus(student.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={student.avatar} />
                                                        <AvatarFallback>{student.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{student.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-center">
                                                    {student.status === "present" ? (
                                                        <Badge variant="success" className="gap-1 pointer-events-none">
                                                            <CheckCircle2 className="h-3 w-3" /> Present
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="gap-1 pointer-events-none">
                                                            <XCircle className="h-3 w-3" /> Absent
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3 animate-fade-in delay-100">
                <Card className="bg-success/10 border-success/20">
                    <CardContent className="pt-6 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-success font-display">{presentPercentage}%</span>
                        <span className="text-success-foreground/80 font-medium">Present</span>
                    </CardContent>
                </Card>
                <Card className="bg-destructive/10 border-destructive/20">
                    <CardContent className="pt-6 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-destructive font-display">{100 - presentPercentage}%</span>
                        <span className="text-destructive-foreground/80 font-medium">Absent</span>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30">
                    <CardContent className="pt-6 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold font-display">{students.length}</span>
                        <span className="text-muted-foreground font-medium">Total Students</span>
                    </CardContent>
                </Card>
            </div>

        </TeacherLayout>
    );
}
