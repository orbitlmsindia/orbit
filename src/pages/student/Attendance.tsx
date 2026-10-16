import { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, Calendar as CalendarIcon, Clock, AlertCircle, CheckCircle2, XCircle, Loader2, BookOpen, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { FeatureGate } from "@/components/common/FeatureGate";

interface AttendanceRecord {
    id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    courseTitle: string;
    courseId: string;
    liveClassTitle?: string;
    created_at?: string;
}

export default function StudentAttendance() {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("all");

    useEffect(() => {
        fetchStudentAttendance();
    }, []);

    const fetchStudentAttendance = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Enrolled Courses
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('course_id, course:courses(id, title)')
                .eq('student_id', user.id);

            const courseMap = new Map<string, string>();
            const courseList: { id: string; title: string }[] = [];

            (enrollments || []).forEach((e: any) => {
                const c = Array.isArray(e.course) ? e.course[0] : e.course;
                if (c?.id && c?.title) {
                    courseMap.set(c.id, c.title);
                    if (!courseList.some(item => item.id === c.id)) {
                        courseList.push({ id: c.id, title: c.title });
                    }
                }
            });
            setCourses(courseList);

            // 2. Fetch Attendance Records
            const { data: attData, error: attError } = await supabase
                .from('attendance')
                .select('id, date, status, course_id, live_class_id, created_at')
                .eq('student_id', user.id)
                .order('date', { ascending: false });

            if (attError) {
                console.warn("Error fetching student attendance records:", attError);
            }

            // 3. Optionally fetch live class titles if live_class_id exists
            const liveClassIds = (attData || []).map((a: any) => a.live_class_id).filter(Boolean);
            const liveClassMap = new Map<string, string>();

            if (liveClassIds.length > 0) {
                const { data: liveData } = await supabase
                    .from('live_classes')
                    .select('id, title')
                    .in('id', liveClassIds);

                (liveData || []).forEach((lc: any) => {
                    liveClassMap.set(lc.id, lc.title);
                });
            }

            const formattedRecords: AttendanceRecord[] = (attData || []).map((a: any) => ({
                id: a.id,
                date: a.date,
                status: a.status || 'present',
                courseId: a.course_id,
                courseTitle: courseMap.get(a.course_id) || "Enrolled Course",
                liveClassTitle: a.live_class_id ? liveClassMap.get(a.live_class_id) : undefined,
                created_at: a.created_at
            }));

            setRecords(formattedRecords);

        } catch (err) {
            console.error("Student attendance fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(r => 
        selectedCourse === "all" || r.courseId === selectedCourse
    );

    const totalSessions = filteredRecords.length;
    const presentSessions = filteredRecords.filter(r => r.status === 'present').length;
    const lateSessions = filteredRecords.filter(r => r.status === 'late').length;
    const absentSessions = filteredRecords.filter(r => r.status === 'absent').length;

    // Attendance rate considers present (100%) and late (counted at 50% attendance)
    const attendancePercentage = totalSessions > 0
        ? Math.round(((presentSessions + lateSessions * 0.5) / totalSessions) * 100)
        : 0;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'present':
                return (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Present
                    </Badge>
                );
            case 'late':
                return (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                        <Clock className="h-3.5 w-3.5" /> Late
                    </Badge>
                );
            case 'absent':
                return (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
                        <XCircle className="h-3.5 w-3.5" /> Absent
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                        {status}
                    </Badge>
                );
        }
    };

    return (
        <StudentLayout>
            <FeatureGate featureId="attendance_tracker">
                <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
                                <CheckSquare className="h-8 w-8 text-primary" /> My Attendance
                            </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Track your class attendance records, participation streaks, and attendance compliance.
                        </p>
                    </div>

                    {/* Filter by Course */}
                    {courses.length > 0 && (
                        <div className="w-full sm:w-64">
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Courses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Enrolled Courses</SelectItem>
                                    {courses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm">Loading attendance records...</p>
                    </div>
                ) : (
                    <>
                        {/* Attendance Statistics Summary Cards */}
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                            <Card className="border shadow-xs">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-xs font-semibold uppercase">Overall Attendance</CardDescription>
                                    <CardTitle className={`text-2xl font-bold font-mono ${
                                        totalSessions === 0
                                            ? 'text-muted-foreground'
                                            : attendancePercentage >= 75
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                        {totalSessions > 0 ? `${attendancePercentage}%` : "0%"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Progress value={totalSessions > 0 ? attendancePercentage : 0} className="h-2" />
                                    <span className="text-[11px] text-muted-foreground mt-2 block">
                                        {totalSessions === 0
                                            ? "No attendance records recorded yet"
                                            : attendancePercentage >= 75
                                                ? "Satisfies 75% minimum threshold"
                                                : "Warning: Below 75% requirement"}
                                    </span>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-xs">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-xs font-semibold uppercase">Sessions Attended</CardDescription>
                                    <CardTitle className="text-2xl font-bold font-mono text-foreground">
                                        {presentSessions}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Classes attended on time</p>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-xs">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-xs font-semibold uppercase">Late Arrivals</CardDescription>
                                    <CardTitle className="text-2xl font-bold font-mono text-amber-500">
                                        {lateSessions}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Joined after class start</p>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-xs">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-xs font-semibold uppercase">Absent Sessions</CardDescription>
                                    <CardTitle className="text-2xl font-bold font-mono text-red-500">
                                        {absentSessions}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Unexcused missed classes</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Attendance Ledger Table */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <CalendarIcon className="h-5 w-5 text-primary" /> Class Attendance Log
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Official student presence recorded by course mentors and live session tracking.
                                    </CardDescription>
                                </div>
                                {totalSessions > 0 && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {totalSessions} Session{totalSessions === 1 ? '' : 's'}
                                    </Badge>
                                )}
                            </CardHeader>

                            <CardContent className="p-0">
                                {filteredRecords.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/40">
                                                    <TableHead className="font-semibold text-xs">Date</TableHead>
                                                    <TableHead className="font-semibold text-xs">Course</TableHead>
                                                    <TableHead className="font-semibold text-xs">Session Details</TableHead>
                                                    <TableHead className="font-semibold text-xs text-right">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRecords.map((record) => (
                                                    <TableRow key={record.id} className="hover:bg-muted/30">
                                                        <TableCell className="font-mono text-xs font-medium">
                                                            {new Date(record.date).toLocaleDateString(undefined, {
                                                                weekday: 'short',
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-xs text-foreground">
                                                            {record.courseTitle}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {record.liveClassTitle ? (
                                                                <span className="font-medium text-foreground">🔴 {record.liveClassTitle}</span>
                                                            ) : (
                                                                "Regular Lecture Class"
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {getStatusBadge(record.status)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="py-16 text-center text-muted-foreground space-y-3">
                                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                            <CheckSquare className="h-7 w-7 opacity-40" />
                                        </div>
                                        <h3 className="font-bold text-base text-foreground">No Attendance Records Yet</h3>
                                        <p className="text-xs max-w-md mx-auto">
                                            Your attendance records will appear here as course mentors mark your presence during scheduled classes and live video sessions.
                                        </p>
                                        <div className="pt-2">
                                            <Link to="/student/calendar">
                                                <Button variant="outline" size="sm" className="gap-2 text-xs">
                                                    <CalendarIcon className="h-4 w-4" /> View Class Schedule
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
                </div>
            </FeatureGate>
        </StudentLayout>
    );
}
