import { useEffect, useState } from "react";
import { getTopicRelatedThumbnail } from "@/lib/thumbnailUtils";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, MoreVertical, Loader2, BookOpen, Trash2, Pencil, Sparkles, Ticket, IndianRupee } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import CouponManager from "@/components/teacher/CouponManager";

export default function TeacherCourses() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "courses";
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [teacherId, setTeacherId] = useState<string>("");
    const [courses, setCourses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [addCourseModalOpen, setAddCourseModalOpen] = useState(false);
    const [newCourse, setNewCourse] = useState({
        title: "",
        description: "",
        domain: "Software Engineering",
        instructor_intro: "",
        instructor_video_url: "",
        instructor_qualifications: "",
        exam_policy: "",
        visibility: true,
        thumbnail_url: "",
        price: "",
        original_price: "",
        organization_name: "",
        organization_logo_url: ""
    });

    useEffect(() => {
        fetchCourses();
        fetchTeacherDefaults();
    }, []);

    const fetchTeacherDefaults = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('users')
                .select('bio, qualifications, instructor_video_url')
                .eq('id', user.id)
                .single();

            if (data) {
                setNewCourse(prev => ({
                    ...prev,
                    instructor_intro: data.bio || "",
                    instructor_qualifications: data.qualifications || "",
                    instructor_video_url: data.instructor_video_url || ""
                }));
            }
        } catch (e) {}
    };

    const fetchCourses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setTeacherId(user.id);

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
                    domain,
                    is_published,
                    is_deletion_requested,
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
                category: c.domain || "Software Engineering",
                students: c.enrollments?.[0]?.count || 0,
                modules: 0, // Placeholder until we count sections
                status: c.is_published ? "Published" : "Draft",
                image: c.thumbnail_url || getTopicRelatedThumbnail(c.title, c.id)
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

            const payload: any = {
                title: newCourse.title,
                description: newCourse.description,
                domain: newCourse.domain || "Software Engineering",
                instructor_intro: newCourse.instructor_intro || null,
                instructor_video_url: newCourse.instructor_video_url || null,
                instructor_qualifications: newCourse.instructor_qualifications || null,
                exam_policy: newCourse.exam_policy || null,
                is_published: newCourse.visibility,
                teacher_id: user.id
            };

            if (newCourse.thumbnail_url.trim()) {
                payload.thumbnail_url = newCourse.thumbnail_url.trim();
            }
            if (newCourse.price && parseFloat(newCourse.price) > 0) {
                payload.price = parseFloat(newCourse.price);
            }
            if (newCourse.original_price && parseFloat(newCourse.original_price) > 0) {
                payload.original_price = parseFloat(newCourse.original_price);
            }
            const savedInst = localStorage.getItem("orbit_institute_settings");
            const defaultInst = savedInst ? JSON.parse(savedInst) : {};

            payload.organization_name = newCourse.organization_name.trim() || defaultInst.name || "Orbit LMS Innovation Academy";
            payload.organization_logo_url = newCourse.organization_logo_url.trim() || defaultInst.logoUrl || "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80";

            const { data, error } = await supabase
                .from('courses')
                .insert([payload])
                .select('id')
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

    const handleRequestDeleteCourse = async (id: string, title: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Are you sure you want to request deletion of "${title}"?\n\nThis will send a request to Admin. The course will remain accessible until Admin approves.`)) return;
        const { error } = await supabase.from('courses').update({
            is_deletion_requested: true,
            deletion_requested_at: new Date().toISOString()
        }).eq('id', id);
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Deletion Request Sent ⏳", description: "Admin approval is required to permanently delete this course." });
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
                <div className="flex gap-2">
                    <Link to="/teacher/courses/json-builder">
                        <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
                            <Sparkles className="h-4 w-4" /> JSON Importer
                        </Button>
                    </Link>
                    <Button
                        variant={activeTab === "coupons" ? "default" : "outline"}
                        onClick={() => setSearchParams({ tab: activeTab === "coupons" ? "courses" : "coupons" })}
                        className={`gap-2 ${activeTab === "coupons" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-600"}`}
                    >
                        <Ticket className="h-4 w-4" /> {activeTab === "coupons" ? "My Courses" : "Manage Coupons"}
                    </Button>
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
                                <Label>Domain / Category</Label>
                                <Input
                                    value={newCourse.domain}
                                    onChange={(e) => setNewCourse({ ...newCourse, domain: e.target.value })}
                                    placeholder="e.g. Software Engineering, Data Science & AI, Web Development"
                                />
                                <p className="text-xs text-muted-foreground">Students can filter courses by domain on their dashboard.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                    placeholder="Short description..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Instructor Introduction & Bio <span className="text-muted-foreground text-xs">(Customizable per course)</span></Label>
                                <Textarea
                                    className="min-h-[80px]"
                                    value={newCourse.instructor_intro}
                                    onChange={(e) => setNewCourse({ ...newCourse, instructor_intro: e.target.value })}
                                    placeholder="Welcome message to students for this course..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Instructor Intro Video URL <span className="text-muted-foreground text-xs">(YouTube/Drive)</span></Label>
                                    <Input
                                        value={newCourse.instructor_video_url}
                                        onChange={(e) => setNewCourse({ ...newCourse, instructor_video_url: e.target.value })}
                                        placeholder="https://youtube.com/watch?v=..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Qualifications & Credentials</Label>
                                    <Input
                                        value={newCourse.instructor_qualifications}
                                        onChange={(e) => setNewCourse({ ...newCourse, instructor_qualifications: e.target.value })}
                                        placeholder="e.g. Ph.D. in Computer Science"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Thumbnail URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Input
                                    value={newCourse.thumbnail_url}
                                    onChange={(e) => setNewCourse({ ...newCourse, thumbnail_url: e.target.value })}
                                    placeholder="https://images.unsplash.com/photo-... (auto-generated if empty)"
                                />
                                <p className="text-xs text-muted-foreground">Leave empty for an auto-generated topic-based thumbnail.</p>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Switch
                                    checked={newCourse.visibility}
                                    onCheckedChange={(c) => setNewCourse({ ...newCourse, visibility: c })}
                                />
                                <Label>Visible to students (Published)</Label>
                            </div>

                            {/* Pricing & Organization Fields */}
                            <div className="pt-2 border-t border-border space-y-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <IndianRupee className="h-3.5 w-3.5" /> Pricing & Organization
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Course Price (₹) <span className="text-muted-foreground text-xs">(0 = Free)</span></Label>
                                        <Input
                                            type="number"
                                            value={newCourse.price}
                                            onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                                            placeholder="e.g. 999"
                                            min="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Original/MRP Price (₹) <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                        <Input
                                            type="number"
                                            value={newCourse.original_price}
                                            onChange={(e) => setNewCourse({ ...newCourse, original_price: e.target.value })}
                                            placeholder="e.g. 1499"
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Organization / Institution Name <span className="text-muted-foreground text-xs">(who is launching this course)</span></Label>
                                    <Input
                                        value={newCourse.organization_name}
                                        onChange={(e) => setNewCourse({ ...newCourse, organization_name: e.target.value })}
                                        placeholder="e.g. Google, Microsoft, Orbit Academy"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Organization Logo URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        value={newCourse.organization_logo_url}
                                        onChange={(e) => setNewCourse({ ...newCourse, organization_logo_url: e.target.value })}
                                        placeholder="https://logo.clearbit.com/google.com"
                                    />
                                    <p className="text-xs text-muted-foreground">Logo will appear alongside the course card for students.</p>
                                </div>
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
            </div>

            {/* TAB CONTENT */}
            {activeTab === "coupons" ? (
                <CouponManager teacherId={teacherId} courses={courses} />
            ) : (
                <>
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
                                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                                        <Badge variant={course.status === "Published" ? "success" : "secondary"}>
                                            {course.status}
                                        </Badge>
                                        {course.is_deletion_requested && (
                                            <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/40 text-[10px]">
                                                Deletion Requested ⏳
                                            </Badge>
                                        )}
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
                                                    <DropdownMenuItem className="gap-2 text-primary" onClick={(e) => handlePublishCourse(course.id, e)}>
                                                        <BookOpen className="h-4 w-4" /> Publish Course
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="gap-2 text-amber-600 dark:text-amber-400 font-semibold" onClick={(e) => handleRequestDeleteCourse(course.id, course.title, e)}>
                                                    <Trash2 className="h-4 w-4" /> Request Delete ⏳
                                                </DropdownMenuItem>
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
            </>
            )}
        </TeacherLayout>
    );
}
