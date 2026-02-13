import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, BookOpen, Loader2, PlayCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function StudentCourses() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);

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
            const { data: myEnrollments } = await supabase
                .from('enrollments')
                .select('course_id')
                .eq('student_id', user.id);

            const enrolledIds = myEnrollments?.map((e: any) => e.course_id) || [];
            setEnrolledCourseIds(enrolledIds);

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

    const handleEnroll = async (courseId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('enrollments')
                .insert([{
                    student_id: user.id,
                    course_id: courseId
                }]);

            if (error) throw error;

            toast({ title: "Enrolled Successfully!", description: "You can now start learning." });
            setEnrolledCourseIds([...enrolledCourseIds, courseId]);
            navigate(`/student/courses/${courseId}/learn`);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Enrollment Failed", description: error.message });
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
                        const isEnrolled = enrolledCourseIds.includes(course.id);
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
                                    {isEnrolled && (
                                        <div className="absolute top-3 right-3">
                                            <Badge variant="success">Enrolled</Badge>
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

                                    {isEnrolled ? (
                                        <Link to={`/student/courses/${course.id}/learn`} className="w-full">
                                            <Button className="w-full gap-2" variant="secondary">
                                                <PlayCircle className="h-4 w-4" /> Continue Learning
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button className="w-full gap-2" onClick={() => handleEnroll(course.id)}>
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
        </StudentLayout>
    );
}
