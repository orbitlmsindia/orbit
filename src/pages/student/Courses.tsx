import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, BookOpen, Loader2, PlayCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function StudentCourses() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [enrolledCourseStatus, setEnrolledCourseStatus] = useState<Record<string, string>>({});

    // Enrollment Dialog State
    const [enrollmentDialog, setEnrollmentDialog] = useState<{ isOpen: boolean; courseId: string | null; courseName: string | null }>({ isOpen: false, courseId: null, courseName: null });
    const [transactionId, setTransactionId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch all published courses
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select(`
                    id,
                    title,
                    description,
                    thumbnail_url,
                    teacher:users!teacher_id(full_name),
                    enrollments(count)
                `)
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (coursesError) throw coursesError;

            // Fetch user's enrollments to know which ones they already have
            const { data: myEnrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select('course_id, status')
                .eq('student_id', user.id);

            if (enrollError) console.error("Error fetching enrollments:", enrollError);

            const statusMap: Record<string, string> = {};
            myEnrollments?.forEach((e: any) => {
                statusMap[e.course_id] = e.status || 'approved'; // Fallback for old ones
            });
            setEnrolledCourseStatus(statusMap);

            // Transform data
            const formatted = coursesData.map((c: any) => ({
                id: c.id,
                title: c.title,
                description: c.description,
                instructor: c.teacher?.full_name || "Unknown",
                students: c.enrollments?.[0]?.count || 0,
                image: c.thumbnail_url || "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?auto=format&fit=crop&q=80&w=500"
            }));

            setCourses(formatted);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollClick = (course: any) => {
        setEnrollmentDialog({ isOpen: true, courseId: course.id, courseName: course.title });
        setTransactionId("");
    };

    const handleConfirmEnrollment = async () => {
        if (!transactionId.trim()) {
            toast({ variant: "destructive", title: "Error", description: "Please enter your transaction ID." });
            return;
        }

        try {
            setIsSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check for existing enrollment first to prevent 409 Conflict console errors
            const { data: existingEnrollment } = await supabase
                .from('enrollments')
                .select('id, status')
                .eq('student_id', user.id)
                .eq('course_id', enrollmentDialog.courseId)
                .maybeSingle();

            if (existingEnrollment) {
                toast({ title: "Already Enrolled", description: "You already have a requested or active enrollment for this course." });
                setEnrolledCourseStatus(prev => ({ ...prev, [enrollmentDialog.courseId as string]: existingEnrollment.status || 'pending' }));
                setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null });
                return;
            }

            const { error } = await supabase
                .from('enrollments')
                .insert([{
                    student_id: user.id,
                    course_id: enrollmentDialog.courseId,
                    transaction_id: transactionId,
                    status: 'pending'
                }]);

            if (error) throw error;

            toast({ title: "Enrollment Submitted!", description: "Your enrollment is pending admin verification." });
            setEnrolledCourseStatus(prev => ({ ...prev, [enrollmentDialog.courseId as string]: 'pending' }));
            setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null });

        } catch (error: any) {
            // Fallback error handling
            toast({ variant: "destructive", title: "Enrollment Failed", description: error.message || "An error occurred during enrollment." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">Course Catalog</h1>
                    <p className="text-muted-foreground">Browse and enroll in courses available at your institute.</p>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6 mt-6 animate-fade-in delay-75">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search courses..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in delay-100">
                {filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => {
                        const enrollmentStatus = enrolledCourseStatus[course.id];
                        const isApproved = enrollmentStatus === 'approved';
                        const isPending = enrollmentStatus === 'pending';

                        return (
                            <div key={course.id} className="group bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full">
                                <div className="relative h-48 bg-muted overflow-hidden shrink-0">
                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="h-12 w-12 text-primary/40" />
                                    </div>
                                    <img
                                        src={course.image}
                                        alt={course.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.opacity = '0';
                                        }}
                                    />
                                    {isApproved && (
                                        <div className="absolute top-3 right-3">
                                            <Badge variant="success">Enrolled</Badge>
                                        </div>
                                    )}
                                    {isPending && (
                                        <div className="absolute top-3 right-3">
                                            <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Pending Verification</Badge>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="font-display font-bold text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors mb-2">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                        {course.description || "No description provided."}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-3 w-3" />
                                            <span>{course.students} Students</span>
                                        </div>
                                        <div>
                                            By {course.instructor}
                                        </div>
                                    </div>

                                    {isApproved ? (
                                        <Link to={`/student/courses/${course.id}/learn`} className="w-full">
                                            <Button className="w-full gap-2" variant="secondary">
                                                <PlayCircle className="h-4 w-4" /> Continue Learning
                                            </Button>
                                        </Link>
                                    ) : isPending ? (
                                        <Button className="w-full gap-2" variant="outline" disabled>
                                            Pending Verification
                                        </Button>
                                    ) : (
                                        <Button className="w-full gap-2" onClick={() => handleEnrollClick(course)}>
                                            Enroll Now
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                        No courses found.
                    </div>
                )}
            </div>

            <Dialog open={enrollmentDialog.isOpen} onOpenChange={(open) => setEnrollmentDialog(prev => ({ ...prev, isOpen: open }))}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Enroll in {enrollmentDialog.courseName}</DialogTitle>
                        <DialogDescription>
                            Please scan the QR code to pay the course fee. Then, submit the transaction ID below to verify your enrollment.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="w-48 h-48 border rounded-lg bg-muted flex flex-col items-center justify-center p-4">
                            {/* Placeholder for actual QR code */}
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=example_payment_link" alt="Payment QR Code" className="w-full h-full opacity-80" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Scan to Pay via UPI / QR</p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="transactionId" className="text-sm font-medium">
                            Transaction / Reference ID
                        </label>
                        <Input
                            id="transactionId"
                            placeholder="e.g. UPI123456789"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                        />
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setEnrollmentDialog({ isOpen: false, courseId: null, courseName: null })} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmEnrollment} disabled={isSubmitting || !transactionId.trim()}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit for Verification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </StudentLayout>
    );
}
