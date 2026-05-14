import { useEffect, useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, MoreVertical, Loader2, BookOpen, Trash2, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function TeacherCourses() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [addCourseModalOpen, setAddCourseModalOpen] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: "", description: "", visibility: true });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            let query = supabase
                .from('courses')
                .select(`
                    id,
                    title,
                    is_published,
                    created_at,
                    thumbnail_url,
                    enrollments (count)
                `);

            if (profile?.role !== 'admin') {
                query = query.eq('teacher_id', user.id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

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

    const handleCreateCourse = async () => {
        if (!newCourse.title) {
            toast({ variant: "destructive", title: "Error", description: "Course title is required." });
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const payload = {
                title: newCourse.title,
                description: newCourse.description,
                is_published: newCourse.visibility,
                teacher_id: user.id
            };

            const { data, error } = await supabase
                .from('courses')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            toast({ title: "Success", description: "Course created successfully!" });
            setAddCourseModalOpen(false);
            navigate(`/teacher/courses/${data.id}`);

        } catch (err: any) {
            console.error(err);
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleUnpublishCourse = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const { error } = await supabase.from('courses').update({ is_published: false }).eq('id', id);
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Course saved as Draft" });
            fetchCourses();
        }
    };

    const handlePublishCourse = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const { error } = await supabase.from('courses').update({ is_published: true }).eq('id', id);
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Course Published" });
            fetchCourses();
        }
    };

    const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to permanently delete this draft course?")) return;
        const { error } = await supabase.from('courses').delete().eq('id', id);
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Deleted Permanently" });
            fetchCourses();
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
                <Dialog open={addCourseModalOpen} onOpenChange={setAddCourseModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Create Course
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create New Course</DialogTitle>
                            <DialogDescription>
                                Fill in the details. You can add modules and content in the next step.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Course Title</Label>
                                <Input
                                    value={newCourse.title}
                                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                    placeholder="e.g. Advanced Mathematics"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                    placeholder="Short description..."
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Switch
                                    checked={newCourse.visibility}
                                    onCheckedChange={(c) => setNewCourse({ ...newCourse, visibility: c })}
                                />
                                <Label>Visible to students (Published)</Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddCourseModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCourse}>Create & Build</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 relative z-10">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem className="gap-2" asChild>
                                                    <Link to={`/teacher/courses/${course.id}`}>
                                                        <Pencil className="h-4 w-4" /> Edit Course
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {course.status === 'Published' ? (
                                                    <DropdownMenuItem className="gap-2" onClick={(e) => handleUnpublishCourse(course.id, e)}>
                                                        <BookOpen className="h-4 w-4" /> Unpublish
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <>
                                                        <DropdownMenuItem className="gap-2 text-primary" onClick={(e) => handlePublishCourse(course.id, e)}>
                                                            <BookOpen className="h-4 w-4" /> Publish Course
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="gap-2 text-destructive" onClick={(e) => handleDeleteCourse(course.id, e)}>
                                                            <Trash2 className="h-4 w-4" /> Delete Permanently
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
