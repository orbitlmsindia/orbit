import { useEffect, useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, FileText, MoreVertical, Loader2, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function TeacherCourses() {
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('courses')
                .select(`
                    id,
                    title,
                    is_published,
                    created_at,
                    thumbnail_url,
                    enrollments (count)
                `)
                .eq('teacher_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data
            const formatted = data.map((c: any) => ({
                id: c.id,
                title: c.title,
                category: "General", // Placeholder
                students: c.enrollments?.[0]?.count || 0,
                modules: 0, // Placeholder until we count sections
                status: c.is_published ? "Published" : "Draft",
                image: c.thumbnail_url || "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?auto=format&fit=crop&q=80&w=500"
            }));

            setCourses(formatted);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <TeacherLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </TeacherLayout>
        );
    }

    return (
        <TeacherLayout>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
                <div>
                    <h1 className="text-3xl font-display font-bold">My Courses</h1>
                    <p className="text-muted-foreground">Manage your assigned courses and content.</p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Create Course
                </Button>
            </div>

            <div className="flex items-center gap-4 mb-6 animate-fade-in delay-75">
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
                    filteredCourses.map((course) => (
                        <Link key={course.id} to={`/teacher/courses/${course.id}`}>
                            <div className="group bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                                <div className="relative h-48 bg-muted overflow-hidden">
                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                        {/* Fallback pattern if no image */}
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
                                    <div className="absolute top-3 right-3">
                                        <Badge variant={course.status === "Published" ? "success" : "secondary"}>
                                            {course.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-display font-bold text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                            {course.title}
                                        </h3>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-4 w-4" />
                                            <span>{course.students} Students</span>
                                        </div>
                                        {/* Modules count can be added later if queried */}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                        No courses found.
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
