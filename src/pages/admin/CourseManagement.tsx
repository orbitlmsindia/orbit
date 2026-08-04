import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  BookOpen,
  LayoutGrid,
  List,
  RefreshCw,
  Users,
  Star,
  Sparkles,
  Award,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function CourseManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [addCourseModalOpen, setAddCourseModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // Featured Settings State
  const [featuredConfig, setFeaturedConfig] = useState<{ mode: "most_enrolled" | "manual" }>(() => {
    const saved = localStorage.getItem("orbit_featured_settings");
    return saved ? JSON.parse(saved) : { mode: "most_enrolled" };
  });

  // Form State
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    category: "Development",
    teacherId: "unassigned",
    visibility: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // 1. Fetch ALL Teachers (Admin View)
    const { data: teachersData } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'teacher');

    setTeachers(teachersData || []);

    // 2. Fetch ALL Courses (Admin View)
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id, title, description, is_published, is_featured, is_deletion_requested, deletion_requested_at, created_at,
        teacher:users!teacher_id(full_name),
        enrollments(count)
      `)
      .order('created_at', { ascending: false });

    if (coursesError) {
      console.error(coursesError);
      toast({ variant: "destructive", title: "Failed to load courses" });
    } else {
      // Transform data for UI
      const formatted = (coursesData as any[] || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        instructor: c.teacher?.full_name || "Unassigned",
        category: "General",
        students: c.enrollments?.[0]?.count || 0,
        lessons: 0,
        completion: 0,
        status: c.is_published ? "published" : "draft",
        is_deletion_requested: c.is_deletion_requested,
        deletion_requested_at: c.deletion_requested_at,
        visibility: c.is_published,
        is_featured: c.is_featured || false,
        created_at: c.created_at
      }));
      setCourses(formatted);
    }
    setLoading(false);
  };

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_featured: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: !currentStatus ? "Starred as Featured ⭐" : "Removed from Featured ⭐",
        description: "Homepage featured courses updated."
      });
      fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error updating featured status", description: err.message });
    }
  };

  const handleSaveFeaturedMode = (mode: "most_enrolled" | "manual") => {
    const newConfig = { mode };
    setFeaturedConfig(newConfig);
    localStorage.setItem("orbit_featured_settings", JSON.stringify(newConfig));
    toast({
      title: "Homepage Featured Mode Saved! 🌟",
      description: mode === "most_enrolled" ? "Displaying courses with highest student enrollments." : "Displaying courses manually starred by Admin."
    });
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title) return;

    try {
      const payload: any = {
        title: newCourse.title,
        description: newCourse.description,
        is_published: newCourse.visibility,
        // institute_id removed
      };

      if (newCourse.teacherId && newCourse.teacherId !== "unassigned") {
        payload.teacher_id = newCourse.teacherId;
      }

      const { data, error } = await supabase
        .from('courses')
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;

      toast({ title: "Course created successfully" });
      setAddCourseModalOpen(false);

      // Redirect to builder
      navigate(`/admin/courses/${data.id}/edit`);

    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  // Admin Direct Delete Course (No permission needed)
  const handleDeleteCourse = async (id: string, title?: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title || 'this course'}"?\n\nAs Admin, this will immediately delete the course and all associated data.`)) return;

    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      toast({ variant: "destructive", title: "Error Deleting Course", description: error.message });
    } else {
      toast({ title: "Course Permanently Deleted by Admin 🗑️" });
      fetchData();
    }
  };

  // Admin Approve Teacher Deletion Request
  const handleApproveDeleteRequest = async (id: string, title: string) => {
    if (!confirm(`Approve deletion request for "${title}"?\n\nThis will permanently delete the course.`)) return;

    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      toast({ variant: "destructive", title: "Error Deleting Course", description: error.message });
    } else {
      toast({ title: "Deletion Approved & Course Removed 🗑️" });
      fetchData();
    }
  };

  // Admin Reject Teacher Deletion Request
  const handleRejectDeleteRequest = async (id: string) => {
    const { error } = await supabase.from('courses').update({
      is_deletion_requested: false,
      deletion_requested_at: null
    }).eq('id', id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Deletion Request Rejected", description: "The course remains active." });
      fetchData();
    }
  };

  const handleUnpublishCourse = async (id: string) => {
    const { error } = await supabase.from('courses').update({ is_published: false }).eq('id', id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Course saved as Draft" });
      fetchData();
    }
  };

  const handlePublishCourse = async (id: string) => {
    const { error } = await supabase.from('courses').update({ is_published: true }).eq('id', id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Course Published" });
      fetchData();
    }
  };

  const tableColumns = [
    {
      key: "title",
      header: "Course",
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.instructor}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge variant={row.status === "published" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2" asChild>
              <Link to={`/admin/courses/${row.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit Content
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" asChild>
              <Link to={`/admin/courses/${row.id}/edit?tab=students`}>
                <Users className="h-4 w-4" /> View Enrolled Students
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.status === 'published' ? (
              <DropdownMenuItem className="gap-2" onClick={() => handleUnpublishCourse(row.id)}>
                <BookOpen className="h-4 w-4" /> Unpublish
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem className="gap-2 text-primary" onClick={() => handlePublishCourse(row.id)}>
                  <BookOpen className="h-4 w-4" /> Publish Course
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteCourse(row.id)}>
                  <Trash2 className="h-4 w-4" /> Delete Permanently
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Homepage Featured Selection Control Bar */}
        <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/30 text-primary">
                <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500/20" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  Homepage "Featured Orbit Courses" Control Panel
                </h3>
                <p className="text-xs text-muted-foreground">
                  Choose how courses are displayed on the public landing page featured section.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={featuredConfig.mode === "most_enrolled" ? "default" : "outline"}
                onClick={() => handleSaveFeaturedMode("most_enrolled")}
                className="gap-1.5 text-xs font-bold"
              >
                <Users className="h-3.5 w-3.5" /> Most Enrolled (Auto)
              </Button>
              <Button
                size="sm"
                variant={featuredConfig.mode === "manual" ? "default" : "outline"}
                onClick={() => handleSaveFeaturedMode("manual")}
                className="gap-1.5 text-xs font-bold"
              >
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Admin Starred (Manual)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Course Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and assign courses.
            </p>
          </div>
          <div className="flex bg-muted p-1 rounded-lg gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} className="border-0 bg-transparent">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={addCourseModalOpen} onOpenChange={setAddCourseModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Course
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

                  <div className="space-y-2">
                    <Label>Assign Teacher (Optional)</Label>
                    <Select
                      value={newCourse.teacherId}
                      onValueChange={(val) => setNewCourse({ ...newCourse, teacherId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
        </div>

        {/* View Toggle */}
        <div className="flex justify-end gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="group hover:shadow-lg transition-all duration-200">
                <CardContent className="p-0">
                  <Link to={`/admin/courses/${course.id}/edit`} className="block">
                    <div className="relative h-36 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary/50" />
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-[10px] font-bold text-white">
                        <Users className="h-3 w-3 text-primary" /> {course.students} Enrolled
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleFeatured(course.id, course.is_featured);
                          }}
                          className={`h-7 w-7 rounded-full ${course.is_featured ? "bg-amber-500 text-slate-950 hover:bg-amber-600" : "bg-black/40 text-slate-400 hover:text-amber-400"}`}
                          title={course.is_featured ? "Starred as Featured" : "Star as Featured"}
                        >
                          <Star className={`h-4 w-4 ${course.is_featured ? "fill-slate-950" : ""}`} />
                        </Button>
                        <Badge variant={course.status === "published" ? "default" : "secondary"}>
                          {course.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {course.is_deletion_requested && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                          <div className="font-bold text-amber-600 dark:text-amber-400">⚠️ Teacher Requested Deletion</div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-bold" onClick={(e) => { e.preventDefault(); handleApproveDeleteRequest(course.id, course.title); }}>
                              Approve & Delete 🗑️
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400" onClick={(e) => { e.preventDefault(); handleRejectDeleteRequest(course.id); }}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{course.description || "No description"}</p>
                      </div>

                      <div className="text-xs text-muted-foreground pb-2">
                        Instructor: <span className="text-foreground">{course.instructor}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <Link to={`/admin/courses/${course.id}/edit`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Pencil className="h-4 w-4" /> Edit Content
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" asChild>
                          <Link to={`/admin/courses/${course.id}/edit?tab=students`}>
                            <Users className="h-4 w-4" /> View Enrolled Students
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {course.is_deletion_requested && (
                          <>
                            <DropdownMenuItem className="gap-2 text-red-600 font-bold" onClick={() => handleApproveDeleteRequest(course.id, course.title)}>
                              <Trash2 className="h-4 w-4" /> Approve Deletion Request
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-amber-600" onClick={() => handleRejectDeleteRequest(course.id)}>
                              Reject Deletion Request
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {course.status === 'published' ? (
                          <DropdownMenuItem className="gap-2" onClick={() => handleUnpublishCourse(course.id)}>
                            <BookOpen className="h-4 w-4" /> Unpublish
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="gap-2 text-primary" onClick={() => handlePublishCourse(course.id)}>
                            <BookOpen className="h-4 w-4" /> Publish Course
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive font-semibold" onClick={() => handleDeleteCourse(course.id, course.title)}>
                          <Trash2 className="h-4 w-4" /> Delete Directly (Admin)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
            {courses.length === 0 && !loading && (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                No courses found. Click "Add Course" to create one.
              </div>
            )}
          </div>
        ) : (
          <DataTable
            data={courses}
            columns={tableColumns}
            searchPlaceholder="Search courses..."
          />
        )}
      </div>
    </AdminLayout>
  );
}
