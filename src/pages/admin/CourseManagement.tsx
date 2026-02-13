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
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function CourseManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [addCourseModalOpen, setAddCourseModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);

  const [teachers, setTeachers] = useState<any[]>([]);

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
        *,
        teacher:users!teacher_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (coursesError) {
      console.error(coursesError);
      toast({ variant: "destructive", title: "Failed to load courses" });
    } else {
      // Transform data for UI
      const formatted = coursesData.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        instructor: c.teacher?.full_name || "Unassigned",
        category: "General",
        students: 0,
        lessons: 0,
        completion: 0,
        status: c.is_published ? "published" : "draft",
        visibility: c.is_published,
        created_at: c.created_at
      }));
      setCourses(formatted);
    }
    setLoading(false);
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
        .select()
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

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Deleted" });
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
            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteCourse(row.id)}>
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
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
                  <div className="relative h-36 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-primary/50" />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Badge variant={course.status === "published" ? "default" : "secondary"}>
                        {course.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{course.description || "No description"}</p>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Instructor: <span className="text-foreground">{course.instructor}</span>
                    </div>

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
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteCourse(course.id)}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
