import { useState, useEffect } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    HardDrive,
    Download,
    Upload,
    BookOpen,
    FileText,
    Layers,
    Lightbulb,
    UserCheck,
    CheckCircle2,
    RefreshCw,
    Loader2,
    FileJson,
    Search,
    AlertCircle,
    Copy,
    GraduationCap,
    Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
    exportTeacherDataBackup,
    fetchTeacherScopedStats,
    restoreTeacherClassroomBackup,
    TeacherBackupOptions
} from "@/services/backupEngineService";
import { exportCourseToJson, downloadJsonFile, copyJsonToClipboard, normalizeCourseJson, importSectionsToExistingCourse } from "@/lib/courseJsonImporter";

export default function TeacherBackup() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [teacherId, setTeacherId] = useState<string>("");
    const [teacherProfile, setTeacherProfile] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Statistics
    const [stats, setStats] = useState({
        coursesCount: 0,
        sectionsCount: 0,
        contentsCount: 0,
        questionsCount: 0,
        submissionsCount: 0,
        flashcardsCount: 0,
        mnemonicsCount: 0,
        attendanceCount: 0
    });

    // Options
    const [options, setOptions] = useState<TeacherBackupOptions>({
        includeCurriculum: true,
        includeQuizzes: true,
        includeSubmissions: true,
        includeFlashcards: true,
        includeMnemonics: true,
        includeAttendance: true
    });

    // Operation states
    const [isExportingAll, setIsExportingAll] = useState(false);
    const [isExportingSelected, setIsExportingSelected] = useState(false);
    const [exportingSingleCourseId, setExportingSingleCourseId] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState("");
    const [restoreLogs, setRestoreLogs] = useState<string[]>([]);

    useEffect(() => {
        loadTeacherData();
    }, []);

    const loadTeacherData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setTeacherId(user.id);
            setTeacherProfile({
                id: user.id,
                name: user.user_metadata?.full_name || "Instructor",
                email: user.email || ""
            });

            // 1. Fetch Teacher Courses
            const { data: coursesData, error } = await supabase
                .from("courses")
                .select("id, title, domain, is_published, created_at, enrollments(count)")
                .eq("teacher_id", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.warn("Error fetching teacher courses:", error);
            }

            const formatted = (coursesData || []).map((c: any) => ({
                id: c.id,
                title: c.title,
                domain: c.domain || "General",
                is_published: c.is_published,
                studentsCount: c.enrollments?.[0]?.count || 0
            }));

            setCourses(formatted);
            // Default select all courses
            setSelectedCourseIds(formatted.map(c => c.id));

            // 2. Fetch Live Scoped Stats
            const teacherStats = await fetchTeacherScopedStats(user.id);
            setStats(teacherStats);

        } catch (err: any) {
            toast({ variant: "destructive", title: "Load Error", description: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Export All Courses and Classroom Data
    const handleExportAll = async () => {
        if (!teacherId) return;
        try {
            setIsExportingAll(true);
            toast({
                title: "Packaging Classroom Archive 📦",
                description: `Exporting all ${courses.length} courses, curriculum, quizzes, and study aids...`
            });

            const res = await exportTeacherDataBackup(teacherId, options);
            if (res.success) {
                toast({
                    title: "Classroom Backup Downloaded! ✅",
                    description: `Saved: ${res.filename}`
                });
            } else {
                toast({ variant: "destructive", title: "Export Error", description: res.error });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Export Failed", description: err.message });
        } finally {
            setIsExportingAll(false);
        }
    };

    // Export Selected Courses
    const handleExportSelected = async () => {
        if (!teacherId || selectedCourseIds.length === 0) return;
        try {
            setIsExportingSelected(true);
            toast({
                title: "Packaging Selected Courses 📦",
                description: `Exporting ${selectedCourseIds.length} course(s)...`
            });

            const res = await exportTeacherDataBackup(teacherId, {
                ...options,
                courseIds: selectedCourseIds
            });

            if (res.success) {
                toast({
                    title: "Selected Courses Exported! ✅",
                    description: `Saved: ${res.filename}`
                });
            } else {
                toast({ variant: "destructive", title: "Export Error", description: res.error });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Export Failed", description: err.message });
        } finally {
            setIsExportingSelected(false);
        }
    };

    // Export Single Course JSON
    const handleExportSingleCourse = async (courseId: string, title: string) => {
        try {
            setExportingSingleCourseId(courseId);
            toast({ title: "Generating Course JSON...", description: `Packaging "${title}"...` });
            const data = await exportCourseToJson(courseId);
            const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "_");
            downloadJsonFile(data, `orbit_course_${safeTitle}.json`);
            await copyJsonToClipboard(data);

            toast({
                title: "Course JSON Exported! 📥",
                description: `Downloaded "orbit_course_${safeTitle}.json" & copied JSON to clipboard.`
            });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Export Failed", description: err.message });
        } finally {
            setExportingSingleCourseId(null);
        }
    };

    // Restore / Upload Course Backup
    const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !teacherId) return;

        try {
            setIsRestoring(true);
            setRestoreLogs([]);
            setRestoreStatus("Validating backup file...");
            toast({ title: "Restoring Course Data 🔄", description: "Parsing file..." });

            const text = await file.text();
            const json = JSON.parse(text);

            if (json.scope === "teacher_classroom") {
                // Restore entire classroom package
                const res = await restoreTeacherClassroomBackup(teacherId, json, (msg) => {
                    setRestoreStatus(msg);
                });
                if (res.log) setRestoreLogs(res.log);

                if (res.success) {
                    toast({
                        title: "Classroom Restored Successfully! 🎉",
                        description: `Restored ${res.restoredRecords} records.`
                    });
                    loadTeacherData();
                } else {
                    toast({ variant: "destructive", title: "Restore Warning", description: res.error });
                }
            } else if (json.sections || json.courseTitle || json.title) {
                // Single Course JSON
                setRestoreStatus("Importing single course modules...");
                const normalized = normalizeCourseJson(json);
                if (!normalized.sections || normalized.sections.length === 0) {
                    throw new Error("No modules found in course backup file.");
                }

                // If courses exist, import to first or create
                if (courses.length > 0) {
                    const targetCourseId = courses[0].id;
                    const res = await importSectionsToExistingCourse(targetCourseId, normalized.sections);
                    if (res.success) {
                        toast({
                            title: "Course Modules Imported! 🚀",
                            description: `Imported ${res.sectionsCreated} modules into "${courses[0].title}".`
                        });
                        loadTeacherData();
                    } else {
                        toast({ variant: "destructive", title: "Import Error", description: res.errors[0] });
                    }
                } else {
                    toast({
                        title: "Course JSON Validated",
                        description: "Create a course first or restore via Classroom Package."
                    });
                }
            } else {
                throw new Error("Unrecognized backup file format.");
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Restore Failed", description: err.message });
        } finally {
            setIsRestoring(false);
            setRestoreStatus("");
        }
    };

    const toggleSelectCourse = (id: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedCourseIds.length === courses.length) {
            setSelectedCourseIds([]);
        } else {
            setSelectedCourseIds(courses.map(c => c.id));
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.domain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <TeacherLayout>
            <div className="space-y-6 animate-fade-in pb-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <HardDrive className="h-7 w-7 text-primary" /> Teacher Course & Classroom Data Backup
                            </h1>
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                                Zero-Loss
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            Export complete snapshots of your courses, curriculum modules, question banks, student submissions, flashcards, mnemonics, and attendance records.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadTeacherData}
                            disabled={loading}
                            className="gap-1.5 text-xs font-bold"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </Button>
                    </div>
                </div>

                {/* Live Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                    <Card className="p-3 text-center border bg-card">
                        <p className="text-xl font-bold text-primary">{loading ? "..." : stats.coursesCount}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                            <BookOpen className="h-3 w-3" /> Courses
                        </p>
                    </Card>
                    <Card className="p-3 text-center border bg-card">
                        <p className="text-xl font-bold text-foreground">{loading ? "..." : stats.sectionsCount}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                            <Layers className="h-3 w-3" /> Modules
                        </p>
                    </Card>
                    <Card className="p-3 text-center border bg-card">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{loading ? "..." : stats.contentsCount}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                            <FileText className="h-3 w-3" /> Lessons
                        </p>
                    </Card>
                    <Card className="p-3 text-center border bg-card">
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{loading ? "..." : stats.questionsCount}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                            <GraduationCap className="h-3 w-3" /> Quiz Qs
                        </p>
                    </Card>
                    <Card className="p-3 text-center border bg-card">
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{loading ? "..." : stats.submissionsCount}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Submissions
                        </p>
                    </Card>
                    <Card className="p-3 text-center border bg-card">
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{loading ? "..." : stats.flashcardsCount}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                            <Layers className="h-3 w-3" /> Flashcards
                        </p>
                    </Card>
                    <Card className="p-3 text-center border bg-card">
                        <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{loading ? "..." : stats.mnemonicsCount}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                            <Lightbulb className="h-3 w-3" /> Mnemonics
                        </p>
                    </Card>
                    <Card className="p-3 text-center border bg-card">
                        <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{loading ? "..." : stats.attendanceCount}</p>
                        <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                            <UserCheck className="h-3 w-3" /> Attendance
                        </p>
                    </Card>
                </div>

                {/* Classroom Archive Generator & Restore */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Full Classroom Archive Card */}
                    <Card className="lg:col-span-2 border-2 border-primary/30 bg-primary/5 shadow-md flex flex-col justify-between">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Download className="h-5 w-5 text-primary" /> Complete Classroom Data Snapshot
                                </CardTitle>
                                <Badge className="bg-primary text-primary-foreground font-bold">Recommended</Badge>
                            </div>
                            <CardDescription className="text-xs">
                                Packages all your assigned courses, lecture videos, notes, question banks, student submission grades, flashcards, mnemonics, and attendance logs into a single portable JSON file.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Category Switches */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-background/80 border">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5 text-primary" /> Curriculum (Modules & Lessons)
                                    </Label>
                                    <Switch
                                        checked={options.includeCurriculum !== false}
                                        onCheckedChange={(c) => setOptions({ ...options, includeCurriculum: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                        <GraduationCap className="h-3.5 w-3.5 text-amber-500" /> Quizzes & Question Banks
                                    </Label>
                                    <Switch
                                        checked={options.includeQuizzes !== false}
                                        onCheckedChange={(c) => setOptions({ ...options, includeQuizzes: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" /> Student Submissions & Grades
                                    </Label>
                                    <Switch
                                        checked={options.includeSubmissions !== false}
                                        onCheckedChange={(c) => setOptions({ ...options, includeSubmissions: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                        <Layers className="h-3.5 w-3.5 text-emerald-500" /> Flashcards & Mnemonics
                                    </Label>
                                    <Switch
                                        checked={options.includeFlashcards !== false && options.includeMnemonics !== false}
                                        onCheckedChange={(c) => setOptions({ ...options, includeFlashcards: c, includeMnemonics: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between sm:col-span-2">
                                    <Label className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                        <UserCheck className="h-3.5 w-3.5 text-indigo-500" /> Batch Attendance Logs
                                    </Label>
                                    <Switch
                                        checked={options.includeAttendance !== false}
                                        onCheckedChange={(c) => setOptions({ ...options, includeAttendance: c })}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                                <Button
                                    onClick={handleExportAll}
                                    disabled={isExportingAll || courses.length === 0}
                                    className="w-full sm:w-auto bg-primary text-primary-foreground font-bold gap-2 shadow-md"
                                >
                                    {isExportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                                    Download Complete Classroom Backup (.json)
                                </Button>
                                {selectedCourseIds.length > 0 && selectedCourseIds.length < courses.length && (
                                    <Button
                                        onClick={handleExportSelected}
                                        disabled={isExportingSelected}
                                        variant="outline"
                                        className="w-full sm:w-auto gap-2 text-xs font-bold"
                                    >
                                        {isExportingSelected ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                        Export Selected ({selectedCourseIds.length}) Courses Only
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Restore & Import Card */}
                    <Card className="border-2 border-emerald-500/30 bg-emerald-500/5 shadow-md flex flex-col justify-between">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                <Upload className="h-5 w-5 text-emerald-600" /> Restore / Import Backup
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Upload a previously downloaded classroom package or single course JSON to restore curriculum modules, questions, and resources.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-xl border border-dashed border-emerald-500/40 bg-background/50 text-center space-y-2">
                                <FileJson className="h-8 w-8 text-emerald-600 mx-auto" />
                                <p className="text-xs font-medium text-foreground">Select JSON Backup File</p>
                                <p className="text-[11px] text-muted-foreground">Accepts Classroom snapshots or Course JSON</p>
                                <label className="cursor-pointer inline-block pt-1">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleUploadBackup}
                                        className="hidden"
                                        disabled={isRestoring}
                                    />
                                    <Button
                                        variant="outline"
                                        disabled={isRestoring}
                                        className="gap-2 pointer-events-none border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold text-xs"
                                    >
                                        {isRestoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                        {isRestoring ? (restoreStatus || "Restoring...") : "Choose Backup File (.json)"}
                                    </Button>
                                </label>
                            </div>

                            {restoreLogs.length > 0 && (
                                <div className="p-3 rounded-lg bg-background border text-[11px] font-mono max-h-32 overflow-y-auto space-y-1">
                                    {restoreLogs.map((log, idx) => (
                                        <p key={idx} className="text-muted-foreground">› {log}</p>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Course-by-Course Fast Export Directory */}
                <Card className="border bg-card shadow-sm">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-primary" /> My Teaching Courses ({courses.length})
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Select individual courses for selective backup or export single course blueprints with 1 click.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-60 min-w-[160px]">
                                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search courses..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-8 pl-8 text-xs w-full"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleSelectAll}
                                    className="text-xs font-semibold shrink-0"
                                >
                                    {selectedCourseIds.length === courses.length ? "Deselect All" : "Select All"}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredCourses.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-xs">
                                No courses found matching your query.
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredCourses.map((c) => {
                                    const isSelected = selectedCourseIds.includes(c.id);
                                    const isExportingThis = exportingSingleCourseId === c.id;

                                    return (
                                        <div
                                            key={c.id}
                                            className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                                isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-start sm:items-center gap-3">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelectCourse(c.id)}
                                                    className="mt-1 sm:mt-0"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm text-foreground">{c.title}</span>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {c.domain}
                                                        </Badge>
                                                        {c.is_published ? (
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                                                Published
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        Course ID: <span className="font-mono">{c.id}</span> • Enrolled Students: {c.studentsCount}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleExportSingleCourse(c.id, c.title)}
                                                    disabled={isExportingThis}
                                                    className="gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10"
                                                >
                                                    {isExportingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                                    {isExportingThis ? "Exporting..." : "Export Course JSON"}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TeacherLayout>
    );
}
